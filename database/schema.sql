CREATE TABLE campaign (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    state_version  INTEGER NOT NULL DEFAULT 0 CHECK (state_version >= 0),
    world_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (world_seconds >= 0),
    rules_version  TEXT NOT NULL
) STRICT;

CREATE TABLE location (
    id           TEXT PRIMARY KEY,
    campaign_id  TEXT NOT NULL REFERENCES campaign (id),
    name         TEXT NOT NULL,
    UNIQUE (campaign_id, id)
) STRICT;

CREATE TABLE player (
    id              TEXT PRIMARY KEY,
    campaign_id     TEXT NOT NULL UNIQUE REFERENCES campaign (id),
    name            TEXT NOT NULL,
    alias           TEXT,
    age_at_start    INTEGER CHECK (age_at_start IS NULL OR age_at_start >= 0),
    location_id     TEXT NOT NULL,
    serious_wounds  INTEGER NOT NULL DEFAULT 0 CHECK (serious_wounds BETWEEN 0 AND 5),
    status          TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'dead')),
    CHECK (NOT (serious_wounds >= 5 AND status = 'alive')),
    UNIQUE (campaign_id, id),
    FOREIGN KEY (campaign_id, location_id) REFERENCES location (campaign_id, id)
) STRICT;

CREATE TABLE stats (
    player_id  TEXT PRIMARY KEY REFERENCES player (id),
    im         INTEGER NOT NULL CHECK (im BETWEEN 1 AND 50),
    if_stat    INTEGER NOT NULL CHECK (if_stat BETWEEN 1 AND 50),
    c          INTEGER NOT NULL CHECK (c BETWEEN 1 AND 50),
    o          INTEGER NOT NULL CHECK (o BETWEEN 1 AND 50),
    co         INTEGER NOT NULL CHECK (co BETWEEN 1 AND 50),
    m          INTEGER NOT NULL CHECK (m BETWEEN 1 AND 50),
    s          INTEGER NOT NULL CHECK (s BETWEEN 1 AND 50)
) STRICT;

CREATE TRIGGER stats_initial_limits
BEFORE INSERT ON stats
BEGIN
    SELECT RAISE(ABORT, 'stats: valores iniciales entre 1 y 10')
    WHERE NEW.im > 10 OR NEW.if_stat > 10 OR NEW.c > 10 OR NEW.o > 10
       OR NEW.co > 10 OR NEW.m > 10 OR NEW.s > 10;
    SELECT RAISE(ABORT, 'stats: Suerte inicial debe ser exactamente 2')
    WHERE NEW.s <> 2;
    SELECT RAISE(ABORT, 'stats: la suma inicial no puede superar 30')
    WHERE NEW.im + NEW.if_stat + NEW.c + NEW.o + NEW.co + NEW.m + NEW.s > 30;
END;

CREATE TABLE item_definition (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    use_code               TEXT NOT NULL,
    units_per_use          INTEGER NOT NULL CHECK (units_per_use > 0),
    use_seconds            INTEGER NOT NULL CHECK (use_seconds >= 0),
    effect_code            TEXT NOT NULL,
    effect_seconds         INTEGER NOT NULL CHECK (effect_seconds > 0),
    reference_value_minor  INTEGER CHECK (reference_value_minor IS NULL OR reference_value_minor >= 0),
    reference_currency     TEXT CHECK (reference_currency IS NULL OR length(reference_currency) = 3),
    CHECK ((reference_value_minor IS NULL) = (reference_currency IS NULL))
) STRICT;

CREATE TABLE inventory_entry (
    id         TEXT PRIMARY KEY,
    player_id  TEXT NOT NULL REFERENCES player (id),
    item_id    TEXT NOT NULL REFERENCES item_definition (id),
    quantity   INTEGER NOT NULL CHECK (quantity >= 0),
    carried    INTEGER NOT NULL CHECK (carried IN (0, 1)),
    UNIQUE (player_id, item_id, carried)
) STRICT;

CREATE TABLE account (
    id         TEXT PRIMARY KEY,
    player_id  TEXT NOT NULL REFERENCES player (id),
    kind       TEXT NOT NULL CHECK (kind IN ('personal', 'operational')),
    currency   TEXT NOT NULL CHECK (length(currency) = 3),
    UNIQUE (player_id, kind, currency),
    UNIQUE (id, player_id)
) STRICT;

CREATE TABLE travel_offer (
    id                  TEXT PRIMARY KEY,
    campaign_id         TEXT NOT NULL,
    player_id           TEXT NOT NULL,
    origin_id           TEXT NOT NULL,
    destination_id      TEXT NOT NULL,
    price_minor         INTEGER NOT NULL CHECK (price_minor > 0),
    currency            TEXT NOT NULL CHECK (length(currency) = 3),
    duration_seconds    INTEGER NOT NULL CHECK (duration_seconds > 0),
    expires_at_seconds  INTEGER NOT NULL CHECK (expires_at_seconds >= 0),
    CHECK (origin_id <> destination_id),
    UNIQUE (id, player_id),
    FOREIGN KEY (campaign_id, player_id) REFERENCES player (campaign_id, id),
    FOREIGN KEY (campaign_id, origin_id) REFERENCES location (campaign_id, id),
    FOREIGN KEY (campaign_id, destination_id) REFERENCES location (campaign_id, id)
) STRICT;

CREATE TRIGGER travel_offer_no_update
BEFORE UPDATE ON travel_offer
BEGIN
    SELECT RAISE(ABORT, 'travel_offer: oferta inmutable; crear otra oferta');
END;

CREATE TABLE action (
    id              TEXT PRIMARY KEY,
    campaign_id     TEXT NOT NULL,
    player_id       TEXT NOT NULL,
    command         TEXT NOT NULL CHECK (command IN ('use_item', 'pay_travel')),
    request_json    TEXT NOT NULL CHECK (json_valid(request_json)),
    request_hash    TEXT NOT NULL CHECK (length(request_hash) = 64),
    before_version  INTEGER NOT NULL CHECK (before_version >= 0),
    after_version   INTEGER NOT NULL,
    receipt_json    TEXT NOT NULL CHECK (json_valid(receipt_json)),
    created_at      TEXT NOT NULL,
    CHECK (after_version = before_version + 1),
    UNIQUE (campaign_id, before_version),
    UNIQUE (id, player_id),
    UNIQUE (id, campaign_id),
    FOREIGN KEY (campaign_id, player_id) REFERENCES player (campaign_id, id)
) STRICT;

CREATE TRIGGER action_no_update
BEFORE UPDATE ON action
BEGIN
    SELECT RAISE(ABORT, 'action: recibo inmutable');
END;

CREATE TRIGGER action_no_delete
BEFORE DELETE ON action
BEGIN
    SELECT RAISE(ABORT, 'action: recibo inmutable');
END;

CREATE TABLE money_movement (
    id            INTEGER PRIMARY KEY,
    account_id    TEXT NOT NULL,
    player_id     TEXT NOT NULL,
    action_id     TEXT,
    offer_id      TEXT,
    kind          TEXT NOT NULL CHECK (kind IN ('opening', 'travel_payment')),
    amount_minor  INTEGER NOT NULL,
    CHECK (
        (kind = 'opening' AND amount_minor >= 0
            AND action_id IS NULL AND offer_id IS NULL)
        OR
        (kind = 'travel_payment' AND amount_minor < 0
            AND action_id IS NOT NULL AND offer_id IS NOT NULL)
    ),
    FOREIGN KEY (account_id, player_id) REFERENCES account (id, player_id),
    FOREIGN KEY (action_id, player_id) REFERENCES action (id, player_id),
    FOREIGN KEY (offer_id, player_id) REFERENCES travel_offer (id, player_id)
) STRICT;

CREATE UNIQUE INDEX money_movement_one_opening
    ON money_movement (account_id) WHERE kind = 'opening';
CREATE UNIQUE INDEX money_movement_one_payment_per_offer
    ON money_movement (offer_id) WHERE offer_id IS NOT NULL;
CREATE UNIQUE INDEX money_movement_one_per_action
    ON money_movement (action_id) WHERE action_id IS NOT NULL;
CREATE INDEX money_movement_by_account ON money_movement (account_id);

CREATE TRIGGER money_movement_no_negative_balance
BEFORE INSERT ON money_movement
BEGIN
    SELECT RAISE(ABORT, 'money_movement: saldo insuficiente')
    WHERE (SELECT COALESCE(SUM(amount_minor), 0)
             FROM money_movement
            WHERE account_id = NEW.account_id) + NEW.amount_minor < 0;
END;

CREATE TRIGGER money_movement_payment_matches_offer
BEFORE INSERT ON money_movement
WHEN NEW.kind = 'travel_payment'
BEGIN
    SELECT RAISE(ABORT, 'money_movement: importe distinto del ofertado')
    WHERE NEW.amount_minor <> -(SELECT price_minor FROM travel_offer WHERE id = NEW.offer_id);
    SELECT RAISE(ABORT, 'money_movement: moneda de la cuenta distinta de la oferta')
    WHERE (SELECT currency FROM account WHERE id = NEW.account_id)
       <> (SELECT currency FROM travel_offer WHERE id = NEW.offer_id);
    SELECT RAISE(ABORT, 'money_movement: solo la cuenta personal paga transporte')
    WHERE (SELECT kind FROM account WHERE id = NEW.account_id) <> 'personal';
    SELECT RAISE(ABORT, 'money_movement: la acción no es pay_travel')
    WHERE (SELECT command FROM action WHERE id = NEW.action_id) <> 'pay_travel';
END;

CREATE TRIGGER money_movement_no_update
BEFORE UPDATE ON money_movement
BEGIN
    SELECT RAISE(ABORT, 'money_movement: asiento inmutable; corregir con asiento nuevo');
END;

CREATE TRIGGER money_movement_no_delete
BEFORE DELETE ON money_movement
BEGIN
    SELECT RAISE(ABORT, 'money_movement: asiento inmutable; corregir con asiento nuevo');
END;

CREATE TABLE world_effect (
    id                  INTEGER PRIMARY KEY,
    campaign_id         TEXT NOT NULL,
    action_id           TEXT NOT NULL UNIQUE,
    location_id         TEXT NOT NULL,
    code                TEXT NOT NULL,
    starts_at_seconds   INTEGER NOT NULL CHECK (starts_at_seconds >= 0),
    expires_at_seconds  INTEGER NOT NULL,
    CHECK (expires_at_seconds > starts_at_seconds),
    FOREIGN KEY (action_id, campaign_id) REFERENCES action (id, campaign_id),
    FOREIGN KEY (campaign_id, location_id) REFERENCES location (campaign_id, id)
) STRICT;

CREATE INDEX world_effect_by_location ON world_effect (campaign_id, location_id);

CREATE VIEW account_balance AS
SELECT a.id        AS account_id,
       a.player_id AS player_id,
       a.kind      AS kind,
       a.currency  AS currency,
       COALESCE(SUM(m.amount_minor), 0) AS balance_minor
  FROM account a
  LEFT JOIN money_movement m ON m.account_id = a.id
 GROUP BY a.id;

CREATE VIEW active_effect AS
SELECT e.id, e.campaign_id, e.action_id, e.location_id, e.code,
       e.starts_at_seconds, e.expires_at_seconds
  FROM world_effect e
  JOIN campaign c ON c.id = e.campaign_id
 WHERE e.starts_at_seconds <= c.world_seconds
   AND c.world_seconds < e.expires_at_seconds;
