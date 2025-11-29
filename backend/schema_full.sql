--===============================================================
--Script Name: Reload Tracker FULL Schema (v2.3)
--Script Location: backend/schema_full.sql
--Date: 11/29/2025
--Created By: T03KNEE
--About: Consolidated schema script. Creates all tables:
--       Users, Sessions, Purchases, Recipes, Batches, Configs,
--       Settings, and Range Logs.
--       Run this to initialize a fresh database.
--===============================================================

-- 1. USERS (Auth)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'shooter', -- 'admin' or 'shooter'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NULL
);

-- 2. SESSIONS (Auth)
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL
);

-- 3. PURCHASES (Inventory Lots)
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
  status TEXT NOT NULL DEFAULT 'active', -- active | depleted | archived
  notes TEXT NULL,
  
  -- Audit Columns
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RECIPES (Load Data)
CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  caliber TEXT NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'range',
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
  source TEXT NULL,                      -- Reference/Manual source
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Audit Columns
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BATCHES (Loading Log)
CREATE TABLE IF NOT EXISTS batches (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  load_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rounds_loaded INTEGER NOT NULL CHECK (rounds_loaded > 0),
  notes TEXT NULL,
  
  -- Component Snapshots
  powder_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  bullet_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  primer_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  case_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CONFIGS (Saved Calculator Scenarios)
CREATE TABLE IF NOT EXISTS configs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  caliber TEXT NOT NULL,
  charge_grains NUMERIC(10,4) NULL,
  brass_reuse INTEGER NULL,
  lot_size INTEGER NULL,
  recipe_id BIGINT NULL REFERENCES recipes(id) ON DELETE SET NULL,
  cost_per_round NUMERIC(18,6) NULL,
  cost_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SETTINGS (Global App Configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings (Safe to run multiple times)
INSERT INTO settings (key, value) VALUES ('ai_enabled', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('ai_model', 'gemini-2.0-flash') ON CONFLICT (key) DO NOTHING;

-- 8. RANGE LOGS (Future Feature Prep)
CREATE TABLE IF NOT EXISTS range_logs (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  temperature NUMERIC(4,1),
  weather TEXT,
  distance_yards INTEGER,
  
  -- Performance Data
  string_shot_count INTEGER, 
  avg_velocity_fps NUMERIC(10,2),
  sd_velocity NUMERIC(10,2),
  es_velocity NUMERIC(10,2),
  group_size_inches NUMERIC(10,3),
  
  image_url TEXT,
  notes TEXT,
  
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_recipes_caliber ON recipes (caliber);
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches (load_date);
CREATE INDEX IF NOT EXISTS idx_range_logs_date ON range_logs (log_date);