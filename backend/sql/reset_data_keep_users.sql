-- ===============================================================
-- Script: reset_data_keep_users.sql (v2.0)
-- Purpose: "Factory Reset" — wipes all user data but keeps accounts.
--          Use this to clean up a dev/demo environment without
--          forcing everyone to re-register.
--
-- What it wipes:  purchases, recipes, batches, range_logs, firearms,
--                 gear, market_listings, sessions, blueprints, configs,
--                 sources, reference_components, settings
-- What it keeps:  users (all accounts and password hashes survive)
--
-- What it does:   After the wipe, applies schema v9.0 patches so
--                 an older database is brought up to the current
--                 structure (additive changes only — no data loss).
-- ===============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. WIPE (order matters: child tables before parents)
-- ---------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'range_logs',
        'batches',
        'configs',
        'blueprints',
        'recipes',
        'firearm_gear',
        'gear',
        'purchases',
        'firearms',
        'market_listings',
        'sources',
        'reference_components',
        'sessions',
        'settings'
        -- 'users' intentionally excluded
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(tbl) || ' RESTART IDENTITY CASCADE';
            RAISE NOTICE 'Wiped: %', tbl;
        ELSE
            RAISE NOTICE 'Skipped (does not exist): %', tbl;
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 2. SCHEMA PATCHES (v9.0 — idempotent, safe to run on any version)
--    These use IF NOT EXISTS / ALTER COLUMN so they're non-destructive.
-- ---------------------------------------------------------------

-- Settings table
CREATE TABLE IF NOT EXISTS "settings" (
    "key"        text PRIMARY KEY,
    "value"      text NOT NULL,
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
    "id"         bigserial PRIMARY KEY,
    "user_id"    bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token"      text NOT NULL UNIQUE,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "expires_at" timestamptz NOT NULL,
    "revoked_at" timestamptz
);

-- Firearms: add image_url if missing
ALTER TABLE "firearms" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "firearms" ADD COLUMN IF NOT EXISTS "specs"      jsonb NOT NULL DEFAULT '{}';

-- Gear: ensure product_url exists (frontend sends 'url', service maps to product_url)
ALTER TABLE "gear" ADD COLUMN IF NOT EXISTS "product_url" text;

-- Purchases: ensure decimal precision and image support
ALTER TABLE "purchases" ALTER COLUMN "qty"      TYPE numeric(10,4);
ALTER TABLE "purchases" ALTER COLUMN "price"    TYPE numeric(10,4);
ALTER TABLE "purchases" ALTER COLUMN "shipping" TYPE numeric(10,4);
ALTER TABLE "purchases" ALTER COLUMN "tax"      TYPE numeric(10,4);
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "image_url"           text;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "created_by_user_id"  bigint REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "updated_by_user_id"  bigint REFERENCES "users"("id") ON DELETE SET NULL;

-- Recipes: ensure all columns exist
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "range_notes"           text;
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "coal"                  numeric(6,4);
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "case_capacity"         numeric(6,2);
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "bullet_length"         numeric(6,4);
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "archived"              boolean DEFAULT false;
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "created_by_user_id"    bigint REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "updated_by_user_id"    bigint REFERENCES "users"("id") ON DELETE SET NULL;

-- Batches: attribution columns
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL;

-- Range logs: all v9.0 columns
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "image_url"           text;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "shots"               jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "rounds_fired"        integer DEFAULT 0;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "batch_id"            bigint REFERENCES "batches"("id")  ON DELETE SET NULL;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "firearm_id"          bigint REFERENCES "firearms"("id") ON DELETE SET NULL;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "created_by_user_id"  bigint REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "range_logs" ADD COLUMN IF NOT EXISTS "updated_by_user_id"  bigint REFERENCES "users"("id") ON DELETE SET NULL;

-- FIX: range_logs.recipe_id must be nullable (NOT NULL + ON DELETE SET NULL is contradictory).
-- This ALTER will fail if existing rows have null recipe_id — handle gracefully.
DO $$
BEGIN
    ALTER TABLE "range_logs" ALTER COLUMN "recipe_id" DROP NOT NULL;
    RAISE NOTICE 'range_logs.recipe_id: dropped NOT NULL constraint (v9.0 fix)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'range_logs.recipe_id: already nullable or constraint not present — skipping';
END $$;

-- Market listings
CREATE TABLE IF NOT EXISTS "market_listings" (
    "id"              bigserial PRIMARY KEY,
    "user_id"         bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "url"             text NOT NULL UNIQUE,
    "name"            text,
    "category"        text,
    "vendor"          text,
    "qty_per_unit"    numeric(10,2) DEFAULT 1,
    "unit_type"       text DEFAULT 'ea',
    "price"           numeric(10,2) DEFAULT 0,
    "currency"        text DEFAULT 'USD',
    "in_stock"        boolean DEFAULT false,
    "image_url"       text,
    "last_scraped_at" timestamptz DEFAULT now(),
    "created_at"      timestamptz DEFAULT now(),
    "status"          text DEFAULT 'active',
    "notes"           text
);

CREATE TABLE IF NOT EXISTS "firearm_gear" (
    "firearm_id" integer REFERENCES "firearms"("id") ON DELETE CASCADE,
    "gear_id"    bigint  REFERENCES "gear"("id")     ON DELETE CASCADE,
    PRIMARY KEY ("firearm_id", "gear_id")
);

-- ---------------------------------------------------------------
-- 3. RESTORE DEFAULT SETTINGS
-- ---------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
    ('barcode_enabled',  'false'),
    ('barcode_provider', 'go-upc'),
    ('barcode_api_key',  ''),
    ('ai_enabled',       'false'),
    ('ai_model',         'google/gemini-2.0-flash-exp:free'),
    ('ai_api_key',       '')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ---------------------------------------------------------------
-- 4. INDEXES (idempotent)
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_purchases_status    ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchases_type      ON purchases (component_type);
CREATE INDEX IF NOT EXISTS idx_recipes_caliber     ON recipes (caliber);
CREATE INDEX IF NOT EXISTS idx_batches_date        ON batches (load_date);
CREATE INDEX IF NOT EXISTS idx_range_logs_date     ON range_logs (date);
CREATE INDEX IF NOT EXISTS idx_range_logs_recipe   ON range_logs (recipe_id);
CREATE INDEX IF NOT EXISTS idx_firearms_user       ON firearms (user_id);
CREATE INDEX IF NOT EXISTS idx_market_category     ON market_listings (category);

COMMIT;

-- Confirm user accounts survived
SELECT id, username, email, role, is_active FROM users ORDER BY id;
