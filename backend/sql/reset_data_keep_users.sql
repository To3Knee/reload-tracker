-- ===============================================================
-- Script: reset_data_keep_users.sql
-- Purpose: "Factory Reset" for Data, but keeps Users & logins.
--          1. Wipes all user-generated content (Inventory, Logs, etc.)
--          2. Applies the Gold Master v8.0 Schema (Math/Column Fixes).
-- Use Case: Cleaning up a mess without forcing everyone to re-register.
-- ===============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. THE PURGE (Wipe Data, Keep Users)
-- ---------------------------------------------------------------
DO $$
DECLARE
    -- List of tables to wipe (Order matters slightly for foreign keys, but CASCADE handles it)
    -- NOTE: We are NOT wiping 'users'.
    tables text[] := ARRAY[
        'range_logs', 'batches', 'configs', 'blueprints', 
        'recipes', 'purchases', 'firearms', 'sessions', 
        'reference_components', 'sources',
        'gear', 'firearm_gear', 'market_listings',
        'settings' -- Remove this line if you want to keep API Keys/Settings
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(t) || ' RESTART IDENTITY CASCADE;';
            RAISE NOTICE 'Wiped table: %', t;
        END IF;
    END LOOP;
END $$;


-- ---------------------------------------------------------------
-- 2. SCHEMA REPAIR (Apply Gold Master v8.0 Structure)
-- ---------------------------------------------------------------
-- This ensures that even if you wipe the data, the table structure 
-- is upgraded to support the new features (Decimals, Images, etc).

-- 2a. SETTINGS
CREATE TABLE IF NOT EXISTS "settings" (
    "key" text PRIMARY KEY,
    "value" text NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2b. FIREARMS
CREATE TABLE IF NOT EXISTS "firearms" (
    "id" serial PRIMARY KEY,
    "user_id" integer REFERENCES "users"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "platform" varchar(50) DEFAULT 'other' NOT NULL,
    "caliber" varchar(50),
    "manufacturer" varchar(100),
    "model" varchar(100),
    "specs" jsonb DEFAULT '{}',
    "round_count" integer DEFAULT 0,
    "status" varchar(20) DEFAULT 'active',
    "image_url" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- 2c. GEAR
CREATE TABLE IF NOT EXISTS "gear" (
    "id" bigserial PRIMARY KEY,
    "user_id" bigint REFERENCES "users"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "brand" text,
    "model" text,
    "serial_number" text,
    "price" numeric(10, 4) DEFAULT 0,
    "purchase_date" date,
    "product_url" text,
    "image_url" text,
    "notes" text,
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- 2d. PURCHASES (With Decimal Fix)
CREATE TABLE IF NOT EXISTS "purchases" (
    "id" bigserial PRIMARY KEY,
    "user_id" bigint REFERENCES "users"("id") ON DELETE CASCADE,
    "lot_id" text NOT NULL UNIQUE,
    "component_type" text NOT NULL,
    "brand" text,
    "name" text,
    "type_detail" text,
    "caliber" text,
    "case_condition" text,
    "qty" numeric(10, 4) DEFAULT 0 NOT NULL,
    "unit" text NOT NULL,
    "price" numeric(10, 4) DEFAULT 0 NOT NULL,
    "shipping" numeric(10, 4) DEFAULT 0 NOT NULL,
    "tax" numeric(10, 4) DEFAULT 0 NOT NULL,
    "vendor" text,
    "purchase_date" date,
    "url" text,
    "image_url" text,
    "status" text DEFAULT 'active' NOT NULL,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL
);

-- 2e. RECIPES
CREATE TABLE IF NOT EXISTS "recipes" (
    "id" bigserial PRIMARY KEY,
    "name" text NOT NULL,
    "caliber" text NOT NULL,
    "profile_type" text DEFAULT 'range' NOT NULL,
    "charge_grains" numeric(10, 4),
    "brass_reuse" integer,
    "lot_size" integer,
    "bullet_weight_gr" numeric(10, 4),
    "muzzle_velocity_fps" numeric(10, 4),
    "power_factor" numeric(10, 4),
    "zero_distance_yards" numeric(10, 4),
    "group_size_inches" numeric(10, 4),
    "coal" numeric(6, 4),
    "case_capacity" numeric(6, 2),
    "bullet_length" numeric(6, 4),
    "notes" text,
    "range_notes" text,
    "source" text,
    "status" text DEFAULT 'active' NOT NULL,
    "archived" boolean DEFAULT false,
    "powder_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "bullet_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "primer_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "case_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL
);

-- 2f. BATCHES
CREATE TABLE IF NOT EXISTS "batches" (
    "id" bigserial PRIMARY KEY,
    "recipe_id" bigint NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
    "load_date" date DEFAULT CURRENT_DATE NOT NULL,
    "rounds_loaded" integer NOT NULL CHECK (rounds_loaded > 0),
    "notes" text,
    "powder_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "bullet_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "primer_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "case_lot_id" bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now()
);

-- 2g. RANGE LOGS
CREATE TABLE IF NOT EXISTS "range_logs" (
    "id" bigserial PRIMARY KEY,
    "recipe_id" bigint NOT NULL REFERENCES "recipes"("id") ON DELETE SET NULL,
    "batch_id" bigint REFERENCES "batches"("id") ON DELETE SET NULL,
    "firearm_id" bigint REFERENCES "firearms"("id") ON DELETE SET NULL,
    "date" date DEFAULT CURRENT_DATE NOT NULL,
    "location" text,
    "distance_yards" integer,
    "group_size_inches" numeric(5, 3),
    "velocity_fps" integer,
    "sd" numeric(6, 2),
    "es" numeric(6, 2),
    "shots" jsonb DEFAULT '[]',
    "rounds_fired" integer DEFAULT 0,
    "weather" text,
    "temp_f" integer,
    "image_url" text,
    "notes" text,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2h. MARKET & EXTRAS
CREATE TABLE IF NOT EXISTS "market_listings" (
    "id" bigserial PRIMARY KEY,
    "user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "url" text NOT NULL UNIQUE,
    "name" text,
    "category" text,
    "vendor" text,
    "qty_per_unit" numeric(10, 2) DEFAULT 1,
    "unit_type" text DEFAULT 'ea',
    "price" numeric(10, 2) DEFAULT 0,
    "currency" text DEFAULT 'USD',
    "in_stock" boolean DEFAULT false,
    "image_url" text,
    "last_scraped_at" timestamp with time zone DEFAULT now(),
    "created_at" timestamp with time zone DEFAULT now(),
    "status" text DEFAULT 'active',
    "notes" text
);

CREATE TABLE IF NOT EXISTS "firearm_gear" (
    "firearm_id" integer REFERENCES "firearms"("id") ON DELETE CASCADE,
    "gear_id" bigint REFERENCES "gear"("id") ON DELETE CASCADE,
    PRIMARY KEY ("firearm_id", "gear_id")
);

-- ---------------------------------------------------------------
-- 3. FINAL COLUMN PATCH (Just in case table existed but was old)
-- ---------------------------------------------------------------
DO $$ 
BEGIN 
    -- Ensure Purchases uses DECIMAL for math
    ALTER TABLE "purchases" ALTER COLUMN "qty" TYPE numeric(10, 4);
    ALTER TABLE "purchases" ALTER COLUMN "price" TYPE numeric(10, 4);
    ALTER TABLE "purchases" ALTER COLUMN "shipping" TYPE numeric(10, 4);
    ALTER TABLE "purchases" ALTER COLUMN "tax" TYPE numeric(10, 4);
    
    -- Ensure Images/Shots exist
    ALTER TABLE "firearms" ADD COLUMN IF NOT EXISTS "image_url" text;
    ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "image_url" text;
    ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "image_url" text;
    ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "shots" jsonb DEFAULT '[]'::jsonb;
END $$;

COMMIT;