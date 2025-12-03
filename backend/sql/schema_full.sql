--===============================================================
--Script Name: Reload Tracker FULL Schema (v3.1 - Gold Master)
--Script Location: backend/schema_full.sql
--Date: 12/02/2025
--Created By: T03KNEE
--About: Consolidated schema. Matches ALL features: 
--       Armory, Odometer, Attribution, Shot Strings.
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
  component_type TEXT NOT NULL,
  case_condition TEXT NULL,
  caliber TEXT NULL,
  brand TEXT NULL,
  name TEXT NULL,
  type_detail TEXT NULL,
  qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  price NUMERIC(18,4) NOT NULL DEFAULT 0,
  shipping NUMERIC(18,4) NOT NULL DEFAULT 0,
  tax NUMERIC(18,4) NOT NULL DEFAULT 0,
  vendor TEXT NULL,
  purchase_date DATE NULL,
  url TEXT NULL,
  image_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  
  -- Attribution
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
  
  -- Ballistics Data (Inputs for Math)
  bullet_weight_gr NUMERIC(10,4) NULL,
  muzzle_velocity_fps NUMERIC(10,4) NULL,
  power_factor NUMERIC(10,4) NULL,
  zero_distance_yards NUMERIC(10,4) NULL,
  group_size_inches NUMERIC(10,4) NULL,
  
  range_notes TEXT NULL,
  source TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Attribution
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
  
  -- Inventory Links
  powder_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  bullet_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  primer_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  case_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  
  -- Attribution
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
INSERT INTO settings (key, value) VALUES ('ai_enabled', 'false') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('ai_model', 'gemini-2.0-flash') ON CONFLICT (key) DO NOTHING;

-- 8. FIREARMS (The Armory)
CREATE TABLE IF NOT EXISTS firearms (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, 
  platform TEXT NOT NULL DEFAULT 'other', -- ar15, bolt, pistol, lever, other
  caliber TEXT,
  manufacturer TEXT,
  model TEXT,
  specs JSONB DEFAULT '{}'::jsonb, -- Stores Twist Rate (Critical for Math)
  round_count INTEGER DEFAULT 0,   -- The Odometer
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RANGE LOGS (Performance Tracking)
CREATE TABLE IF NOT EXISTS range_logs (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
  firearm_id BIGINT REFERENCES firearms(id) ON DELETE SET NULL, -- Link to Armory
  
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  distance_yards INTEGER,
  group_size_inches NUMERIC(5,3),
  
  -- Ballistics (Calculated Results)
  velocity_fps INTEGER,
  sd NUMERIC(6,2),
  es NUMERIC(6,2),
  shots JSONB DEFAULT '[]'::jsonb, -- Raw Shot String (Input for Math)
  
  -- Environment
  weather TEXT,
  temp_f INTEGER,
  
  -- Usage Stats
  rounds_fired INTEGER DEFAULT 0, -- Increments Odometer
  
  -- Media & Meta
  image_url TEXT,
  notes TEXT,
  
  -- Attribution
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_recipes_caliber ON recipes (caliber);
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches (load_date);
CREATE INDEX IF NOT EXISTS idx_range_logs_date ON range_logs (date);
CREATE INDEX IF NOT EXISTS idx_range_logs_recipe ON range_logs (recipe_id);
CREATE INDEX IF NOT EXISTS idx_firearms_user ON firearms (user_id);
CREATE INDEX IF NOT EXISTS idx_range_logs_firearm ON range_logs (firearm_id);