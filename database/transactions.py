from __future__ import annotations

import hashlib
import json
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE / "schema.sql"
FIXTURE_PATH = HERE / "fixture.sql"

COMMON_FIELDS = {"action_id": str, "player_id": str, "expected_version": int, "command": str}
COMMAND_FIELDS = {
    "use_item": {"entry_id": str, "use_code": str},
    "pay_travel": {"offer_id": str, "account_id": str},
}


class ActionRejected(Exception):

    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(str(path), isolation_level=None, timeout=10.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize(path: str | Path, with_fixture: bool = True) -> None:
    connection = connect(path)
    try:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        if with_fixture:
            connection.executescript(FIXTURE_PATH.read_text(encoding="utf-8"))
    finally:
        connection.close()


def canonical_json(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def request_hash(data: dict) -> str:
    return hashlib.sha256(canonical_json(data).encode("utf-8")).hexdigest()


def validate_shape(request: object) -> dict:
    if not isinstance(request, dict):
        raise ActionRejected("invalid_request", "la solicitud debe ser un objeto")
    command = request.get("command")
    if command not in COMMAND_FIELDS:
        raise ActionRejected("unknown_command", f"comando no admitido: {command!r}")
    expected = {**COMMON_FIELDS, **COMMAND_FIELDS[command]}
    extra = sorted(set(request) - set(expected))
    if extra:
        raise ActionRejected("unexpected_fields", f"campos no admitidos: {extra}")
    missing = sorted(set(expected) - set(request))
    if missing:
        raise ActionRejected("missing_fields", f"faltan campos: {missing}")
    for field, kind in expected.items():
        value = request[field]
        if not isinstance(value, kind) or isinstance(value, bool):
            raise ActionRejected("invalid_field", f"{field} debe ser {kind.__name__}")
        if kind is str and not value:
            raise ActionRejected("invalid_field", f"{field} no puede estar vacío")
    if request["expected_version"] < 0:
        raise ActionRejected("invalid_field", "expected_version no puede ser negativa")
    return dict(request)


def _checkpoint(stage: str) -> None:
    return None


def execute(connection: sqlite3.Connection, request: dict) -> dict:
    request = validate_shape(request)
    canonical = canonical_json(request)
    digest = request_hash(request)

    connection.execute("BEGIN IMMEDIATE")
    try:
        previous = connection.execute(
            "SELECT request_json, request_hash, receipt_json FROM action WHERE id = ?",
            (request["action_id"],),
        ).fetchone()
        if previous is not None:
            if previous["request_hash"] != digest or previous["request_json"] != canonical:
                raise ActionRejected(
                    "action_id_reused", "el ID ya confirmó una solicitud distinta"
                )
            connection.execute("ROLLBACK")
            return json.loads(previous["receipt_json"])

        state = connection.execute(
            """
            SELECT p.id AS player_id, p.campaign_id, p.location_id, p.status,
                   p.serious_wounds, c.state_version, c.world_seconds
              FROM player p JOIN campaign c ON c.id = p.campaign_id
             WHERE p.id = ?
            """,
            (request["player_id"],),
        ).fetchone()
        if state is None:
            raise ActionRejected("player_not_found", "personaje inexistente")
        if state["status"] != "alive" or state["serious_wounds"] >= 5:
            raise ActionRejected("player_dead", "un personaje muerto no actúa")
        if state["state_version"] != request["expected_version"]:
            raise ActionRejected(
                "stale_version",
                f"versión actual {state['state_version']}, recibida {request['expected_version']}",
            )

        if request["command"] == "use_item":
            receipt = _use_item(connection, request, state, canonical, digest)
        else:
            receipt = _pay_travel(connection, request, state, canonical, digest)

        _checkpoint("before_commit")
        connection.execute("COMMIT")
        return receipt
    except BaseException:
        if connection.in_transaction:
            connection.execute("ROLLBACK")
        raise


def _base_receipt(request: dict, state: sqlite3.Row, elapsed_seconds: int) -> dict:
    return {
        "action_id": request["action_id"],
        "command": request["command"],
        "player_id": state["player_id"],
        "campaign_id": state["campaign_id"],
        "before_version": state["state_version"],
        "after_version": state["state_version"] + 1,
        "world_seconds_before": state["world_seconds"],
        "world_seconds_after": state["world_seconds"] + elapsed_seconds,
    }


def _insert_action(connection, request, state, canonical, digest, receipt) -> None:
    connection.execute(
        """
        INSERT INTO action (id, campaign_id, player_id, command, request_json,
                            request_hash, before_version, after_version,
                            receipt_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            request["action_id"],
            state["campaign_id"],
            state["player_id"],
            request["command"],
            canonical,
            digest,
            receipt["before_version"],
            receipt["after_version"],
            canonical_json(receipt),
            datetime.now(timezone.utc).isoformat(),
        ),
    )


def _advance_campaign(connection, state, receipt) -> None:
    updated = connection.execute(
        """
        UPDATE campaign SET state_version = ?, world_seconds = ?
         WHERE id = ? AND state_version = ?
        """,
        (
            receipt["after_version"],
            receipt["world_seconds_after"],
            state["campaign_id"],
            receipt["before_version"],
        ),
    ).rowcount
    if updated != 1:
        raise ActionRejected("stale_version", "la versión cambió durante la operación")


def _use_item(connection, request, state, canonical, digest) -> dict:
    entry = connection.execute(
        """
        SELECT e.id, e.item_id, e.quantity, e.carried, d.use_code, d.units_per_use,
               d.use_seconds, d.effect_code, d.effect_seconds
          FROM inventory_entry e JOIN item_definition d ON d.id = e.item_id
         WHERE e.id = ? AND e.player_id = ?
        """,
        (request["entry_id"], state["player_id"]),
    ).fetchone()
    if entry is None:
        raise ActionRejected("entry_not_found", "existencias inexistentes para este personaje")
    if not entry["carried"]:
        raise ActionRejected("not_carried", "el objeto no se lleva encima")
    if entry["use_code"] != request["use_code"]:
        raise ActionRejected("use_not_supported", "el objeto no admite ese uso")
    if entry["quantity"] < entry["units_per_use"]:
        raise ActionRejected("insufficient_quantity", "cantidad insuficiente")

    starts_at = state["world_seconds"] + entry["use_seconds"]
    receipt = _base_receipt(request, state, entry["use_seconds"])
    receipt.update(
        {
            "entry_id": entry["id"],
            "item_id": entry["item_id"],
            "quantity_before": entry["quantity"],
            "quantity_delta": -entry["units_per_use"],
            "quantity_after": entry["quantity"] - entry["units_per_use"],
            "effect": {
                "code": entry["effect_code"],
                "location_id": state["location_id"],
                "starts_at_seconds": starts_at,
                "expires_at_seconds": starts_at + entry["effect_seconds"],
            },
        }
    )

    _insert_action(connection, request, state, canonical, digest, receipt)
    consumed = connection.execute(
        "UPDATE inventory_entry SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
        (entry["units_per_use"], entry["id"], entry["units_per_use"]),
    ).rowcount
    if consumed != 1:
        raise ActionRejected("insufficient_quantity", "cantidad insuficiente")
    _checkpoint("after_consume")
    connection.execute(
        """
        INSERT INTO world_effect (campaign_id, action_id, location_id, code,
                                  starts_at_seconds, expires_at_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            state["campaign_id"],
            request["action_id"],
            state["location_id"],
            entry["effect_code"],
            receipt["effect"]["starts_at_seconds"],
            receipt["effect"]["expires_at_seconds"],
        ),
    )
    _advance_campaign(connection, state, receipt)
    return receipt


def _pay_travel(connection, request, state, canonical, digest) -> dict:
    offer = connection.execute(
        "SELECT * FROM travel_offer WHERE id = ? AND player_id = ?",
        (request["offer_id"], state["player_id"]),
    ).fetchone()
    if offer is None:
        raise ActionRejected("offer_not_found", "oferta inexistente para este personaje")
    already_paid = connection.execute(
        "SELECT 1 FROM money_movement WHERE offer_id = ?", (offer["id"],)
    ).fetchone()
    if already_paid:
        raise ActionRejected("offer_already_paid", "una oferta aceptada no vuelve a cobrarse")
    if offer["origin_id"] != state["location_id"]:
        raise ActionRejected("wrong_origin", "el personaje no está en el origen de la oferta")
    if state["world_seconds"] >= offer["expires_at_seconds"]:
        raise ActionRejected("offer_expired", "la oferta ya no está vigente")

    account = connection.execute(
        "SELECT * FROM account_balance WHERE account_id = ? AND player_id = ?",
        (request["account_id"], state["player_id"]),
    ).fetchone()
    if account is None:
        raise ActionRejected("account_not_found", "cuenta inexistente para este personaje")
    if account["kind"] != "personal":
        raise ActionRejected(
            "operational_funds_unsupported",
            "el gasto operativo se rechaza hasta implementar sanción y reglas de uso",
        )
    if account["currency"] != offer["currency"]:
        raise ActionRejected("currency_mismatch", "no hay conversión automática de moneda")
    if account["balance_minor"] < offer["price_minor"]:
        raise ActionRejected("insufficient_funds", "saldo insuficiente")

    receipt = _base_receipt(request, state, offer["duration_seconds"])
    receipt.update(
        {
            "offer_id": offer["id"],
            "account_id": account["account_id"],
            "currency": offer["currency"],
            "amount_minor": -offer["price_minor"],
            "balance_before_minor": account["balance_minor"],
            "balance_after_minor": account["balance_minor"] - offer["price_minor"],
            "origin_id": offer["origin_id"],
            "destination_id": offer["destination_id"],
            "duration_seconds": offer["duration_seconds"],
        }
    )

    _insert_action(connection, request, state, canonical, digest, receipt)
    connection.execute(
        """
        INSERT INTO money_movement (account_id, player_id, action_id, offer_id, kind, amount_minor)
        VALUES (?, ?, ?, ?, 'travel_payment', ?)
        """,
        (
            account["account_id"],
            state["player_id"],
            request["action_id"],
            offer["id"],
            -offer["price_minor"],
        ),
    )
    _checkpoint("after_payment")
    connection.execute(
        "UPDATE player SET location_id = ? WHERE id = ?",
        (offer["destination_id"], state["player_id"]),
    )
    _advance_campaign(connection, state, receipt)
    return receipt


def snapshot(connection: sqlite3.Connection, player_id: str = "p1") -> dict:
    row = connection.execute(
        """
        SELECT l.name AS location, c.world_seconds, c.state_version,
               (SELECT COALESCE(SUM(quantity), 0) FROM inventory_entry
                 WHERE player_id = p.id AND carried = 1) AS carried_units,
               (SELECT balance_minor FROM account_balance
                 WHERE player_id = p.id AND kind = 'personal') AS personal_minor
          FROM player p
          JOIN campaign c ON c.id = p.campaign_id
          JOIN location l ON l.id = p.location_id
         WHERE p.id = ?
        """,
        (player_id,),
    ).fetchone()
    return dict(row)


USE_FLARE = {
    "action_id": "a1",
    "player_id": "p1",
    "expected_version": 0,
    "command": "use_item",
    "entry_id": "bag",
    "use_code": "ignite",
}
PAY_RIDE = {
    "action_id": "a2",
    "player_id": "p1",
    "expected_version": 1,
    "command": "pay_travel",
    "offer_id": "ride",
    "account_id": "personal",
}


def demo() -> None:
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "demo.sqlite3"
        initialize(path)
        connection = connect(path)
        try:
            steps = [("Inicial", None), ("Encender una", USE_FLARE),
                     ("Pagar transporte", PAY_RIDE), ("Repetir envío", PAY_RIDE)]
            print(f"{'Momento':<18}{'Bengalas':>9}{'Saldo':>9}  {'Ubicación':<10}{'Reloj':>7}{'Versión':>9}")
            for label, request in steps:
                if request is not None:
                    execute(connection, request)
                s = snapshot(connection)
                print(
                    f"{label:<18}{s['carried_units']:>9}{s['personal_minor'] / 100:>7.2f} €"
                    f"  {s['location']:<10}{s['world_seconds']:>5} s{s['state_version']:>9}"
                )
        finally:
            connection.close()


if __name__ == "__main__":
    demo()
