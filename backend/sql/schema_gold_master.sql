-- ===============================================================
-- Script: schema_gold_master.sql (v4.0)
-- Purpose: The Single Source of Truth for the Database Structure.
--          Includes Users, Inventory, Recipes, Batches, Logs,
--          Firearms, Blueprints, Settings, and Sessions.
-- ===============================================================

BEGIN;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id bigserial PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    username text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    phone text,
    password_hash text NOT NULL,
    role text DEFAULT 'shooter' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);

-- 2. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. FIREARMS (The Armory)
CREATE TABLE IF NOT EXISTS firearms (
    id serial PRIMARY KEY,
    user_id integer REFERENCES users(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    platform varchar(50) DEFAULT 'other' NOT NULL,
    caliber varchar(50),
    manufacturer varchar(100),
    model varchar(100),
    specs jsonb DEFAULT '{}',
    round_count integer DEFAULT 0,
    status varchar(20) DEFAULT 'active',
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. PURCHASES (Inventory)
CREATE TABLE IF NOT EXISTS purchases (
    id bigserial PRIMARY KEY,
    lot_id text NOT NULL UNIQUE,
    component_type text NOT NULL,
    case_condition text,
    caliber text,
    brand text,
    name text,
    type_detail text,
    qty numeric(18, 4) DEFAULT '0' NOT NULL,
    unit text NOT NULL,
    price numeric(18, 4) DEFAULT '0' NOT NULL,
    shipping numeric(18, 4) DEFAULT '0' NOT NULL,
    tax numeric(18, 4) DEFAULT '0' NOT NULL,
    vendor text,
    purchase_date date,
    url text,
    image_url text,
    status text DEFAULT 'active' NOT NULL,
    notes text,
    created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. RECIPES
CREATE TABLE IF NOT EXISTS recipes (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    caliber text NOT NULL,
    profile_type text DEFAULT 'range' NOT NULL,
    charge_grains numeric(10, 4),
    brass_reuse integer,
    lot_size integer,
    notes text,
    bullet_weight_gr numeric(10, 4),
    muzzle_velocity_fps numeric(10, 4),
    power_factor numeric(10, 4),
    zero_distance_yards numeric(10, 4),
    group_size_inches numeric(10, 4),
    range_notes text,
    source text,
    status text DEFAULT 'active' NOT NULL,
    archived boolean DEFAULT false,
    -- Geometry
    coal numeric(6, 4),
    case_capacity numeric(6, 2),
    bullet_length numeric(6, 4),
    -- Links
    powder_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    bullet_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    primer_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    case_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. BATCHES
CREATE TABLE IF NOT EXISTS batches (
    id bigserial PRIMARY KEY,
    recipe_id bigint NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    load_date date DEFAULT CURRENT_DATE NOT NULL,
    rounds_loaded integer NOT NULL CHECK (rounds_loaded > 0),
    notes text,
    powder_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    bullet_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    primer_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    case_lot_id bigint REFERENCES purchases(id) ON DELETE SET NULL,
    created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. RANGE LOGS
CREATE TABLE IF NOT EXISTS range_logs (
    id bigserial PRIMARY KEY,
    recipe_id bigint NOT NULL REFERENCES recipes(id) ON DELETE SET NULL,
    batch_id bigint REFERENCES batches(id) ON DELETE SET NULL,
    firearm_id bigint REFERENCES firearms(id) ON DELETE SET NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    location text,
    distance_yards integer,
    group_size_inches numeric(5, 3),
    velocity_fps integer,
    sd numeric(6, 2),
    es numeric(6, 2),
    shots jsonb DEFAULT '[]',
    rounds_fired integer DEFAULT 0,
    weather text,
    temp_f integer,
    image_url text,
    notes text,
    created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. BLUEPRINTS
CREATE TABLE IF NOT EXISTS blueprints (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    caliber text NOT NULL,
    goal text,
    host_firearm text,
    design_notes text,
    powder_snapshot jsonb,
    bullet_snapshot jsonb,
    primer_snapshot jsonb,
    case_snapshot jsonb,
    configuration jsonb DEFAULT '{}',
    simulated_results jsonb,
    cbto_inches numeric(6, 4),
    coal_inches numeric(6, 4),
    case_capacity_gr_h2o numeric(6, 2),
    trim_length_inches numeric(6, 4),
    jump_inches numeric(6, 4),
    neck_tension_inches numeric(6, 4),
    primer_depth_inches numeric(6, 4),
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 9. CONFIGS
CREATE TABLE IF NOT EXISTS configs (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    caliber text NOT NULL,
    charge_grains numeric(10, 4),
    brass_reuse integer,
    lot_size integer,
    recipe_id bigint REFERENCES recipes(id) ON DELETE SET NULL,
    cost_per_round numeric(18, 6),
    cost_per_50 numeric(18, 6),
    cost_per_100 numeric(18, 6),
    cost_per_1000 numeric(18, 6),
    cost_for_lot numeric(18, 6),
    cost_json jsonb,
    powder_lot_id text,
    bullet_lot_id text,
    primer_lot_id text,
    case_lot_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. REFERENCE COMPONENTS
CREATE TABLE IF NOT EXISTS reference_components (
    id text PRIMARY KEY,
    type text NOT NULL,
    brand text NOT NULL,
    name text NOT NULL,
    sku text,
    specs jsonb DEFAULT '{}',
    source text,
    verified boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. SOURCES
CREATE TABLE IF NOT EXISTS sources (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    title text NOT NULL,
    author text,
    type text NOT NULL,
    description text,
    url text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 12. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches (load_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_range_logs_date ON range_logs (date);
CREATE INDEX IF NOT EXISTS idx_recipes_caliber ON recipes (caliber);
CREATE INDEX IF NOT EXISTS idx_firearms_user ON firearms (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);

COMMIT;