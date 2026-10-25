-- Culinerity reference data. Idempotent: safe to run on every start.
-- Holds reference data only; user answers, finances and scores never reach the server.

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  -- 1.. for the cravings shown on the home screen (display order); NULL otherwise.
  popular_rank INTEGER
);

CREATE TABLE IF NOT EXISTS keywords (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  PRIMARY KEY (item_id, keyword)
);

CREATE TABLE IF NOT EXISTS swaps (
  craving_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  alternative_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  PRIMARY KEY (craving_id, alternative_id)
);

-- is_sample = 1: invented sample data. is_sample = 0: live data from ingest.
-- A sample row and a live row may coexist per store; reads prefer the live one.
CREATE TABLE IF NOT EXISTS prices (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  store TEXT NOT NULL CHECK (store IN ('Coles', 'Woolworths', 'Aldi', 'IGA', 'Market')),
  price_per_serve REAL NOT NULL CHECK (price_per_serve >= 0),
  unit_label TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  is_sample INTEGER NOT NULL CHECK (is_sample IN (0, 1)),
  UNIQUE (item_id, store, is_sample)
);

CREATE TABLE IF NOT EXISTS nutrition (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  energy_kj REAL NOT NULL,
  protein_g REAL NOT NULL,
  fibre_g REAL NOT NULL,
  sugar_g REAL NOT NULL,
  sodium_mg REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS support_places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pantry', 'community-fridge', 'meal')),
  suburb TEXT NOT NULL,
  notes TEXT NOT NULL,
  is_sample INTEGER NOT NULL CHECK (is_sample IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_swaps_craving ON swaps(craving_id);
CREATE INDEX IF NOT EXISTS idx_prices_item ON prices(item_id);
