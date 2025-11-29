--===============================================================
--Script Name: Reload Tracker DB Schema
--Script Location: backend/schema.sql
--Date: 11/26/2025
--Created By: T03KNEE
--Github: https://github.com/To3Knee/reload-tracker
--Version: 0.1.1
--About: PostgreSQL schema for Reload Tracker. Defines purchases
--       (LOTS), recipes (load configs), and configs (saved
--       calculator scenarios).
--===============================================================

-- -------------------------
-- Table: purchases (LOTS)
-- -------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  lot_id TEXT NOT NULL UNIQUE,
  component_type TEXT NOT NULL,          -- powder | bullet | primer | case | other
  case_condition TEXT NULL,              -- new | once_fired | field (for cases)
  caliber TEXT NULL,
  brand TEXT NULL,
  name TEXT NULL,
  type_detail TEXT NULL,
  qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,                    -- ea | lb | gr | box | sleeve | piece
  price NUMERIC(18,4) NOT NULL DEFAULT 0,
  shipping NUMERIC(18,4) NOT NULL DEFAULT 0,
  tax NUMERIC(18,4) NOT NULL DEFAULT 0,
  vendor TEXT NULL,
  purchase_date DATE NULL,
  url TEXT NULL,
  image_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | depleted
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_component_type
  ON purchases (component_type);

CREATE INDEX IF NOT EXISTS idx_purchases_caliber
  ON purchases (caliber);

CREATE INDEX IF NOT EXISTS idx_purchases_status
  ON purchases (status);

CREATE INDEX IF NOT EXISTS idx_purchases_component_caliber_status
  ON purchases (component_type, caliber, status);

-- -------------------------
-- Table: recipes
-- -------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  caliber TEXT NOT NULL,
  profile_type TEXT NULL,                 -- range | subsonic | competition | custom
  charge_grains NUMERIC(10,4) NULL,
  brass_reuse INTEGER NULL,
  lot_size INTEGER NULL,
  notes TEXT NULL,
  bullet_weight_gr NUMERIC(10,4) NULL,
  muzzle_velocity_fps NUMERIC(10,4) NULL,
  power_factor NUMERIC(10,4) NULL,
  zero_distance_yards NUMERIC(10,4) NULL,
  group_size_inches NUMERIC(10,4) NULL,
  range_notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_caliber
  ON recipes (caliber);

CREATE INDEX IF NOT EXISTS idx_recipes_status
  ON recipes (status);

CREATE INDEX IF NOT EXISTS idx_recipes_caliber_status
  ON recipes (caliber, status);

-- -------------------------
-- Table: configs (saved calculator scenarios)
-- -------------------------
CREATE TABLE IF NOT EXISTS configs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  caliber TEXT NOT NULL,
  charge_grains NUMERIC(10,4) NULL,
  brass_reuse INTEGER NULL,
  lot_size INTEGER NULL,
  recipe_id BIGINT NULL REFERENCES recipes(id) ON DELETE SET NULL,
  cost_per_round NUMERIC(18,6) NULL,
  cost_per_50 NUMERIC(18,6) NULL,
  cost_per_100 NUMERIC(18,6) NULL,
  cost_per_1000 NUMERIC(18,6) NULL,
  cost_for_lot NUMERIC(18,6) NULL,
  powder_lot_id TEXT NULL,
  bullet_lot_id TEXT NULL,
  primer_lot_id TEXT NULL,
  case_lot_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
