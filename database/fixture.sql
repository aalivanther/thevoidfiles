INSERT INTO campaign (id, name, state_version, world_seconds, rules_version)
VALUES ('c1', 'Laboratorio 0.2', 0, 0, 'CANON-1.0');

INSERT INTO location (id, campaign_id, name) VALUES
    ('gate',    'c1', 'Portón'),
    ('station', 'c1', 'Estación');

INSERT INTO player (id, campaign_id, name, alias, age_at_start, location_id, serious_wounds, status)
VALUES ('p1', 'c1', 'Investigador de laboratorio', NULL, NULL, 'gate', 0, 'alive');

INSERT INTO stats (player_id, im, if_stat, c, o, co, m, s)
VALUES ('p1', 5, 4, 5, 5, 4, 1, 2);

INSERT INTO item_definition
    (id, name, use_code, units_per_use, use_seconds, effect_code, effect_seconds,
     reference_value_minor, reference_currency)
VALUES ('flare', 'Bengala', 'ignite', 1, 5, 'illumination', 600, 300, 'EUR');

INSERT INTO inventory_entry (id, player_id, item_id, quantity, carried)
VALUES ('bag', 'p1', 'flare', 2, 1);

INSERT INTO account (id, player_id, kind, currency) VALUES
    ('personal',    'p1', 'personal',    'EUR'),
    ('operational', 'p1', 'operational', 'EUR');

INSERT INTO money_movement (account_id, player_id, action_id, offer_id, kind, amount_minor)
VALUES ('personal', 'p1', NULL, NULL, 'opening', 5000);

INSERT INTO travel_offer
    (id, campaign_id, player_id, origin_id, destination_id,
     price_minor, currency, duration_seconds, expires_at_seconds)
VALUES ('ride', 'c1', 'p1', 'gate', 'station', 1200, 'EUR', 900, 3600);
