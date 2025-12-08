-- ===============================================================
-- Script: prod_patch_only.sql
-- Purpose: SAFELY updates Production Schema WITHOUT deleting data.
-- Usage: Run this if you have real users/data you want to KEEP.
-- ===============================================================

BEGIN;

-- 1. CREATE MISSING TABLES (If they don't exist)
--    This will NOT affect existing tables.

CREATE TABLE IF NOT EXISTS gear (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    brand text,
    model text,
    serial_number text,
    price numeric(18, 4) DEFAULT 0,
    purchase_date date,
    product_url text,
    image_url text,
    notes text,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS firearm_gear (
    firearm_id integer REFERENCES firearms(id) ON DELETE CASCADE,
    gear_id bigint REFERENCES gear(id) ON DELETE CASCADE,
    PRIMARY KEY (firearm_id, gear_id)
);

CREATE TABLE IF NOT EXISTS market_listings (
    id bigserial PRIMARY KEY,
    user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    url text NOT NULL UNIQUE,
    name text,
    category text,
    vendor text,
    qty_per_unit numeric(10, 2) DEFAULT 1,
    unit_type text DEFAULT 'ea',
    price numeric(10, 2) DEFAULT 0,
    currency text DEFAULT 'USD',
    in_stock boolean DEFAULT false,
    image_url text,
    last_scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

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

-- 2. ADD MISSING COLUMNS (The Safety Net)
--    This checks existing tables and adds the new fields if missing.

DO $$ 
BEGIN 
    -- Recipes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='coal') THEN
        ALTER TABLE recipes ADD COLUMN coal NUMERIC(6,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='case_capacity') THEN
        ALTER TABLE recipes ADD COLUMN case_capacity NUMERIC(6,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='bullet_length') THEN
        ALTER TABLE recipes ADD COLUMN bullet_length NUMERIC(6,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='archived') THEN
        ALTER TABLE recipes ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    END IF;

    -- Firearms
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='firearms' AND column_name='image_url') THEN
        ALTER TABLE firearms ADD COLUMN image_url TEXT;
    END IF;

    -- Purchases
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='image_url') THEN
        ALTER TABLE purchases ADD COLUMN image_url TEXT;
    END IF;

    -- Range Logs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='image_url') THEN
        ALTER TABLE range_logs ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='shots') THEN
        ALTER TABLE range_logs ADD COLUMN shots JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_firearm_gear_fid ON firearm_gear(firearm_id);
CREATE INDEX IF NOT EXISTS idx_market_category ON market_listings(category);

COMMIT;