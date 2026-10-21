import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

import transactions
from transactions import PAY_RIDE, USE_FLARE, ActionRejected, connect, execute, initialize, snapshot


class DatabaseCase(unittest.TestCase):
    def setUp(self):
        self._folder = tempfile.TemporaryDirectory()
        self.addCleanup(self._folder.cleanup)
        self.path = Path(self._folder.name) / "test.sqlite3"
        initialize(self.path)
        self.connection = connect(self.path)
        self.addCleanup(self.connection.close)

    def assert_rejected(self, code, request, connection=None):
        with self.assertRaises(ActionRejected) as caught:
            execute(connection or self.connection, request)
        self.assertEqual(caught.exception.code, code)

    def count(self, table):
        return self.connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    def add_second_campaign(self):
        self.connection.executescript(
            """
            INSERT INTO campaign (id, name, rules_version) VALUES ('c2', 'Otra', 'CANON-1.0');
            INSERT INTO location (id, campaign_id, name) VALUES ('c2_gate', 'c2', 'Otro portón');
            INSERT INTO player (id, campaign_id, name, location_id)
            VALUES ('p2', 'c2', 'Otro', 'c2_gate');
            INSERT INTO inventory_entry (id, player_id, item_id, quantity, carried)
            VALUES ('bag2', 'p2', 'flare', 3, 1);
            INSERT INTO account (id, player_id, kind, currency)
            VALUES ('personal2', 'p2', 'personal', 'EUR');
            INSERT INTO money_movement (account_id, player_id, kind, amount_minor)
            VALUES ('personal2', 'p2', 'opening', 9000);
            """
        )


class AcceptanceScenario(DatabaseCase):
    def test_full_scenario(self):
        self.assertEqual(
            snapshot(self.connection),
            {"location": "Portón", "world_seconds": 0, "state_version": 0,
             "carried_units": 2, "personal_minor": 5000},
        )

        receipt = execute(self.connection, USE_FLARE)
        self.assertEqual(receipt["quantity_after"], 1)
        self.assertEqual(receipt["effect"]["starts_at_seconds"], 5)
        self.assertEqual(receipt["effect"]["expires_at_seconds"], 605)
        self.assertEqual(
            snapshot(self.connection),
            {"location": "Portón", "world_seconds": 5, "state_version": 1,
             "carried_units": 1, "personal_minor": 5000},
        )
        active = self.connection.execute("SELECT location_id, code FROM active_effect").fetchall()
        self.assertEqual([tuple(r) for r in active], [("gate", "illumination")])

        receipt = execute(self.connection, PAY_RIDE)
        self.assertEqual(receipt["balance_after_minor"], 3800)
        after_travel = {"location": "Estación", "world_seconds": 905, "state_version": 2,
                        "carried_units": 1, "personal_minor": 3800}
        self.assertEqual(snapshot(self.connection), after_travel)
        self.assertEqual(self.count("world_effect"), 1)
        self.assertEqual(self.count("active_effect"), 0)

        self.assertEqual(execute(self.connection, PAY_RIDE), receipt)
        self.assertEqual(snapshot(self.connection), after_travel)
        self.assertEqual(self.count("action"), 2)
        self.assertEqual(self.count("money_movement"), 2)

    def test_demo_runs(self):
        with mock.patch("builtins.print"):
            transactions.demo()


class Idempotency(DatabaseCase):
    def test_replay_returns_historic_receipt_without_consuming(self):
        first = execute(self.connection, USE_FLARE)
        self.assertEqual(execute(self.connection, USE_FLARE), first)
        self.assertEqual(snapshot(self.connection)["carried_units"], 1)
        self.assertEqual(self.count("world_effect"), 1)

    def test_replay_survives_a_new_connection(self):
        first = execute(self.connection, USE_FLARE)
        other = connect(self.path)
        self.addCleanup(other.close)
        self.assertEqual(execute(other, dict(USE_FLARE)), first)

    def test_same_id_with_other_intention_is_rejected(self):
        execute(self.connection, USE_FLARE)
        self.assert_rejected("action_id_reused", {**PAY_RIDE, "action_id": "a1"})
        self.assert_rejected("action_id_reused", {**USE_FLARE, "expected_version": 1})
        self.assertEqual(snapshot(self.connection)["state_version"], 1)

    def test_rejection_does_not_reserve_the_id(self):
        self.assert_rejected("stale_version", {**USE_FLARE, "expected_version": 7})
        self.assertEqual(self.count("action"), 0)
        execute(self.connection, USE_FLARE)


class VersionAndConcurrency(DatabaseCase):
    def test_stale_version_changes_nothing(self):
        execute(self.connection, USE_FLARE)
        before = snapshot(self.connection)
        self.assert_rejected("stale_version", {**USE_FLARE, "action_id": "a9"})
        self.assertEqual(snapshot(self.connection), before)

    def test_two_actions_on_same_state_confirm_only_one(self):
        barrier = threading.Barrier(2)
        results = []

        def worker(action_id):
            connection = connect(self.path)
            try:
                barrier.wait()
                execute(connection, {**USE_FLARE, "action_id": action_id})
                results.append("ok")
            except ActionRejected as error:
                results.append(error.code)
            finally:
                connection.close()

        threads = [threading.Thread(target=worker, args=(f"t{i}",)) for i in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(sorted(results), ["ok", "stale_version"])
        self.assertEqual(snapshot(self.connection)["carried_units"], 1)
        self.assertEqual(self.count("action"), 1)

    def test_database_refuses_two_actions_for_one_version(self):
        execute(self.connection, USE_FLARE)
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """
                INSERT INTO action (id, campaign_id, player_id, command, request_json,
                                    request_hash, before_version, after_version,
                                    receipt_json, created_at)
                SELECT 'dup', campaign_id, player_id, command, request_json, request_hash,
                       before_version, after_version, receipt_json, created_at
                  FROM action WHERE id = 'a1'
                """
            )


class Rollback(DatabaseCase):
    def fail_at(self, target):
        def checkpoint(stage):
            if stage == target:
                raise RuntimeError(f"fallo inyectado en {stage}")
        return mock.patch.object(transactions, "_checkpoint", checkpoint)

    def test_failure_between_consume_and_effect(self):
        before = snapshot(self.connection)
        with self.fail_at("after_consume"), self.assertRaises(RuntimeError):
            execute(self.connection, USE_FLARE)
        self.assertEqual(snapshot(self.connection), before)
        self.assertEqual(self.count("action"), 0)
        self.assertEqual(self.count("world_effect"), 0)
        self.assertFalse(self.connection.in_transaction)
        self.assertEqual(execute(self.connection, USE_FLARE)["quantity_after"], 1)

    def test_failure_between_payment_and_travel(self):
        execute(self.connection, USE_FLARE)
        before = snapshot(self.connection)
        with self.fail_at("after_payment"), self.assertRaises(RuntimeError):
            execute(self.connection, PAY_RIDE)
        self.assertEqual(snapshot(self.connection), before)
        self.assertEqual(self.count("action"), 1)
        self.assertEqual(self.count("money_movement"), 1)

    def test_failure_just_before_commit(self):
        before = snapshot(self.connection)
        with self.fail_at("before_commit"), self.assertRaises(RuntimeError):
            execute(self.connection, USE_FLARE)
        self.assertEqual(snapshot(self.connection), before)
        self.assertEqual(self.count("action"), 0)


class RequestShape(DatabaseCase):
    def test_injected_fields_are_rejected(self):
        for field, value in [("price_minor", 1), ("new_balance", 999999),
                             ("quantity", 0), ("duration_seconds", 1)]:
            with self.subTest(field=field):
                self.assert_rejected("unexpected_fields", {**PAY_RIDE, "expected_version": 0,
                                                           field: value})
        self.assertEqual(self.count("action"), 0)

    def test_malformed_requests(self):
        self.assert_rejected("invalid_request", ["use_item"])
        self.assert_rejected("unknown_command", {**USE_FLARE, "command": "drop_table"})
        missing = dict(USE_FLARE)
        del missing["use_code"]
        self.assert_rejected("missing_fields", missing)
        self.assert_rejected("invalid_field", {**USE_FLARE, "expected_version": "0"})
        self.assert_rejected("invalid_field", {**USE_FLARE, "expected_version": True})
        self.assert_rejected("invalid_field", {**USE_FLARE, "expected_version": -1})
        self.assert_rejected("invalid_field", {**USE_FLARE, "entry_id": ""})


class InventoryRules(DatabaseCase):
    def test_cannot_use_more_than_owned(self):
        execute(self.connection, USE_FLARE)
        execute(self.connection, {**USE_FLARE, "action_id": "b2", "expected_version": 1})
        self.assert_rejected(
            "insufficient_quantity", {**USE_FLARE, "action_id": "b3", "expected_version": 2}
        )
        self.assertEqual(snapshot(self.connection)["carried_units"], 0)

    def test_negative_quantity_is_refused_by_sql(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE inventory_entry SET quantity = -1 WHERE id = 'bag'")

    def test_stored_item_is_not_available(self):
        self.connection.execute(
            "INSERT INTO inventory_entry (id, player_id, item_id, quantity, carried)"
            " VALUES ('depot', 'p1', 'flare', 9, 0)"
        )
        self.assert_rejected("not_carried", {**USE_FLARE, "entry_id": "depot"})

    def test_unsupported_use(self):
        self.assert_rejected("use_not_supported", {**USE_FLARE, "use_code": "throw"})

    def test_foreign_entry_is_not_found(self):
        self.add_second_campaign()
        self.assert_rejected("entry_not_found", {**USE_FLARE, "entry_id": "bag2"})
        self.assert_rejected("entry_not_found", {**USE_FLARE, "entry_id": "missing"})


class TravelRules(DatabaseCase):
    def add_offer(self, offer_id, origin="gate", destination="station",
                  price=1200, currency="EUR", expires=3600):
        self.connection.execute(
            "INSERT INTO travel_offer VALUES (?, 'c1', 'p1', ?, ?, ?, ?, 900, ?)",
            (offer_id, origin, destination, price, currency, expires),
        )

    def pay(self, **changes):
        return {**PAY_RIDE, "expected_version": 0, **changes}

    def test_offer_is_charged_once(self):
        execute(self.connection, self.pay())
        self.assert_rejected(
            "offer_already_paid", self.pay(action_id="a3", expected_version=1)
        )
        self.assertEqual(snapshot(self.connection)["personal_minor"], 3800)

    def test_wrong_origin(self):
        self.add_offer("back", origin="station", destination="gate")
        self.assert_rejected("wrong_origin", self.pay(offer_id="back"))

    def test_expired_at_departure(self):
        self.connection.execute("UPDATE campaign SET world_seconds = 3600")
        self.assert_rejected("offer_expired", self.pay())
        self.connection.execute("UPDATE campaign SET world_seconds = 3599")
        self.assertEqual(execute(self.connection, self.pay())["world_seconds_after"], 4499)

    def test_insufficient_funds(self):
        self.add_offer("luxury", price=5001)
        self.assert_rejected("insufficient_funds", self.pay(offer_id="luxury"))
        self.assertEqual(snapshot(self.connection)["personal_minor"], 5000)

    def test_currency_mismatch(self):
        self.add_offer("dollars", currency="USD")
        self.assert_rejected("currency_mismatch", self.pay(offer_id="dollars"))

    def test_operational_funds_are_rejected(self):
        self.assert_rejected("operational_funds_unsupported", self.pay(account_id="operational"))

    def test_foreign_offer_and_account(self):
        self.add_second_campaign()
        self.assert_rejected("account_not_found", self.pay(account_id="personal2"))
        self.assert_rejected("offer_not_found", self.pay(offer_id="missing"))

    def test_offer_is_immutable(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE travel_offer SET price_minor = 1 WHERE id = 'ride'")


class DatabaseGuards(DatabaseCase):
    def test_foreign_keys_enabled_on_every_connection(self):
        self.assertEqual(self.connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO inventory_entry VALUES ('ghost', 'nobody', 'flare', 1, 1)"
            )

    def test_movements_and_actions_are_immutable(self):
        execute(self.connection, USE_FLARE)
        execute(self.connection, PAY_RIDE)
        for statement in [
            "UPDATE money_movement SET amount_minor = 999999",
            "DELETE FROM money_movement",
            "UPDATE action SET receipt_json = '{}'",
            "DELETE FROM action",
        ]:
            with self.subTest(statement=statement), self.assertRaises(sqlite3.IntegrityError):
                self.connection.execute(statement)

    def test_trigger_blocks_overdraft_and_wrong_amount(self):
        self.connection.execute("UPDATE campaign SET state_version = 0")
        self.connection.execute(
            """
            INSERT INTO action VALUES ('raw', 'c1', 'p1', 'pay_travel', '{}',
                   printf('%064d', 0), 0, 1, '{}', 'now')
            """
        )
        insert = (
            "INSERT INTO money_movement (account_id, player_id, action_id, offer_id, kind,"
            " amount_minor) VALUES (?, 'p1', 'raw', 'ride', 'travel_payment', ?)"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(insert, ("personal", -1))
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(insert, ("personal", -6000))
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(insert, ("operational", -1200))
        self.connection.execute(insert, ("personal", -1200))

    def test_second_opening_is_refused(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO money_movement (account_id, player_id, kind, amount_minor)"
                " VALUES ('personal', 'p1', 'opening', 100000)"
            )

    def test_player_cannot_stand_in_another_campaign(self):
        self.add_second_campaign()
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE player SET location_id = 'c2_gate' WHERE id = 'p1'")

    def test_one_player_per_campaign(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO player (id, campaign_id, name, location_id)"
                " VALUES ('px', 'c1', 'Intruso', 'gate')"
            )

    def test_dead_player_cannot_act(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE player SET serious_wounds = 5 WHERE id = 'p1'")
        self.connection.execute("UPDATE player SET serious_wounds = 5, status = 'dead' WHERE id = 'p1'")
        self.assert_rejected("player_dead", USE_FLARE)
        self.assertEqual(snapshot(self.connection)["carried_units"], 2)

    def test_initial_stats_limits(self):
        self.add_second_campaign()
        insert = "INSERT INTO stats VALUES ('p2', ?, ?, ?, ?, ?, ?, ?)"
        for values in [(11, 1, 1, 1, 1, 1, 2),
                       (5, 5, 5, 5, 5, 4, 2),
                       (4, 4, 4, 4, 4, 4, 3),
                       (0, 4, 4, 4, 4, 4, 2)]:
            with self.subTest(values=values), self.assertRaises(sqlite3.IntegrityError):
                self.connection.execute(insert, values)
        self.connection.execute(insert, (5, 5, 5, 5, 4, 4, 2))
        self.connection.execute("UPDATE stats SET im = 50 WHERE player_id = 'p2'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE stats SET im = 51 WHERE player_id = 'p2'")

    def test_strict_tables_refuse_wrong_types(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("UPDATE inventory_entry SET quantity = 'muchas' WHERE id = 'bag'")

    def test_initialize_refuses_existing_database(self):
        with self.assertRaises(sqlite3.OperationalError):
            initialize(self.path)
        self.assertEqual(snapshot(self.connection)["carried_units"], 2)


if __name__ == "__main__":
    unittest.main()
