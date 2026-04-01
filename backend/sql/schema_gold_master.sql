-- ===============================================================
-- Script: schema_gold_master.sql (v9.0 - Corrected)
-- Date: 2026-03-31
-- Purpose: Definitive schema. Matches production backend exactly.
--          All FK constraints verified against service layer.
-- ===============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id"            bigserial PRIMARY KEY,
    "first_name"    text NOT NULL,
    "last_name"     text NOT NULL,
    "username"      text NOT NULL UNIQUE,
    "email"         text NOT NULL UNIQUE,
    "phone"         text,
    "password_hash" text NOT NULL,
    "role"          text NOT NULL DEFAULT 'shooter',
    "is_active"     boolean NOT NULL DEFAULT true,
    "created_at"    timestamptz NOT NULL DEFAULT now(),
    "updated_at"    timestamptz NOT NULL DEFAULT now(),
    "last_login_at" timestamptz
);

-- ---------------------------------------------------------------
-- 2. SETTINGS (key/value store for app configuration)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "settings" (
    "key"        text PRIMARY KEY,
    "value"      text NOT NULL,
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- 3. SESSIONS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sessions" (
    "id"         bigserial PRIMARY KEY,
    "user_id"    bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token"      text NOT NULL UNIQUE,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "expires_at" timestamptz NOT NULL,
    "revoked_at" timestamptz
);

-- ---------------------------------------------------------------
-- 4. FIREARMS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "firearms" (
    "id"           serial PRIMARY KEY,
    "user_id"      integer REFERENCES "users"("id") ON DELETE CASCADE,
    "name"         varchar(255) NOT NULL,
    "platform"     varchar(50)  NOT NULL DEFAULT 'other',
    "caliber"      varchar(50),
    "manufacturer" varchar(100),
    "model"        varchar(100),
    "specs"        jsonb NOT NULL DEFAULT '{}',
    "round_count"  integer DEFAULT 0,
    "status"       varchar(20) DEFAULT 'active',
    "image_url"    text,
    "created_at"   timestamptz DEFAULT now(),
    "updated_at"   timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 5. GEAR
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "gear" (
    "id"            bigserial PRIMARY KEY,
    "user_id"       bigint REFERENCES "users"("id") ON DELETE CASCADE,
    "name"          text NOT NULL,
    "type"          text NOT NULL,
    "brand"         text,
    "model"         text,
    "serial_number" text,
    "price"         numeric(10,4) DEFAULT 0,
    "purchase_date" date,
    "product_url"   text,       -- NOTE: frontend sends as 'url', mapped by gearService
    "image_url"     text,
    "notes"         text,
    "status"        text DEFAULT 'active',
    "created_at"    timestamptz DEFAULT now(),
    "updated_at"    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 6. FIREARM_GEAR (many-to-many link)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "firearm_gear" (
    "firearm_id" integer REFERENCES "firearms"("id") ON DELETE CASCADE,
    "gear_id"    bigint  REFERENCES "gear"("id")     ON DELETE CASCADE,
    PRIMARY KEY ("firearm_id", "gear_id")
);

-- ---------------------------------------------------------------
-- 7. PURCHASES (Inventory lots)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "purchases" (
    "id"                   bigserial PRIMARY KEY,
    "user_id"              bigint REFERENCES "users"("id") ON DELETE CASCADE,
    "lot_id"               text NOT NULL UNIQUE,
    "component_type"       text NOT NULL,   -- powder | bullet | primer | case | other
    "brand"                text,
    "name"                 text,
    "type_detail"          text,
    "caliber"              text,
    "case_condition"       text,            -- new | once-fired | mixed
    "qty"                  numeric(10,4) NOT NULL DEFAULT 0,
    "unit"                 text NOT NULL,   -- lb | kg | gr | each | rounds
    "price"                numeric(10,4) NOT NULL DEFAULT 0,
    "shipping"             numeric(10,4) NOT NULL DEFAULT 0,
    "tax"                  numeric(10,4) NOT NULL DEFAULT 0,
    "vendor"               text,
    "purchase_date"        date,
    "url"                  text,
    "image_url"            text,
    "status"               text NOT NULL DEFAULT 'active',  -- active | depleted | archived
    "notes"                text,
    "created_at"           timestamptz NOT NULL DEFAULT now(),
    "updated_at"           timestamptz NOT NULL DEFAULT now(),
    "created_by_user_id"   bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id"   bigint REFERENCES "users"("id") ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- 8. MARKET LISTINGS (Supply Chain tracker)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "market_listings" (
    "id"              bigserial PRIMARY KEY,
    "user_id"         bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "url"             text NOT NULL UNIQUE,
    "name"            text,
    "category"        text,   -- powder | primer | bullet | case | ammo | gear | other
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

-- ---------------------------------------------------------------
-- 9. RECIPES (Load definitions)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "recipes" (
    "id"                   bigserial PRIMARY KEY,
    "name"                 text NOT NULL,
    "caliber"              text NOT NULL,
    "profile_type"         text NOT NULL DEFAULT 'range',  -- range | subsonic | defense | competition | custom
    "charge_grains"        numeric(10,4),
    "brass_reuse"          integer,
    "lot_size"             integer,
    "bullet_weight_gr"     numeric(10,4),
    "muzzle_velocity_fps"  numeric(10,4),
    "power_factor"         numeric(10,4),
    "zero_distance_yards"  numeric(10,4),
    "group_size_inches"    numeric(10,4),
    "coal"                 numeric(6,4),
    "case_capacity"        numeric(6,2),
    "bullet_length"        numeric(6,4),
    "notes"                text,
    "range_notes"          text,
    "source"               text,
    "status"               text NOT NULL DEFAULT 'active',
    "archived"             boolean DEFAULT false,
    -- Ingredient lot FKs (set null if lot is deleted — recipe is preserved)
    "powder_lot_id"        bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "bullet_lot_id"        bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "primer_lot_id"        bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "case_lot_id"          bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "created_at"           timestamptz NOT NULL DEFAULT now(),
    "updated_at"           timestamptz NOT NULL DEFAULT now(),
    "created_by_user_id"   bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id"   bigint REFERENCES "users"("id") ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- 10. BATCHES (Production runs)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "batches" (
    "id"                 bigserial PRIMARY KEY,
    "recipe_id"          bigint NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
    "load_date"          date NOT NULL DEFAULT CURRENT_DATE,
    "rounds_loaded"      integer NOT NULL CHECK (rounds_loaded > 0),
    "notes"              text,
    "powder_lot_id"      bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "bullet_lot_id"      bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "primer_lot_id"      bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "case_lot_id"        bigint REFERENCES "purchases"("id") ON DELETE SET NULL,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at"         timestamptz NOT NULL DEFAULT now(),
    "updated_at"         timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 11. RANGE LOGS (Shooting sessions)
-- FIX v9.0: recipe_id changed from NOT NULL + ON DELETE SET NULL
--           (contradictory) to nullable + ON DELETE SET NULL.
--           Service uses a regular JOIN so logs with null recipe_id
--           will simply not appear in list — this is correct behavior.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "range_logs" (
    "id"                 bigserial PRIMARY KEY,
    "recipe_id"          bigint REFERENCES "recipes"("id") ON DELETE SET NULL,
    "batch_id"           bigint REFERENCES "batches"("id") ON DELETE SET NULL,
    "firearm_id"         bigint REFERENCES "firearms"("id") ON DELETE SET NULL,
    "date"               date NOT NULL DEFAULT CURRENT_DATE,
    "location"           text,
    "distance_yards"     integer,
    "group_size_inches"  numeric(5,3),
    "velocity_fps"       integer,
    "sd"                 numeric(6,2),
    "es"                 numeric(6,2),
    "shots"              jsonb DEFAULT '[]',
    "rounds_fired"       integer DEFAULT 0,
    "weather"            text,
    "temp_f"             integer,
    "image_url"          text,
    "notes"              text,
    "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "updated_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at"         timestamptz NOT NULL DEFAULT now(),
    "updated_at"         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- 12. BLUEPRINTS (Experimental load design workspace)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "blueprints" (
    "id"                   bigserial PRIMARY KEY,
    "user_id"              bigint REFERENCES "users"("id") ON DELETE CASCADE,
    "name"                 text NOT NULL,
    "caliber"              text NOT NULL,
    "goal"                 text,
    "host_firearm"         text,
    "design_notes"         text,
    "powder_snapshot"      jsonb,
    "bullet_snapshot"      jsonb,
    "primer_snapshot"      jsonb,
    "case_snapshot"        jsonb,
    "configuration"        jsonb DEFAULT '{}',
    "simulated_results"    jsonb,
    "cbto_inches"          numeric(6,4),
    "coal_inches"          numeric(6,4),
    "case_capacity_gr_h2o" numeric(6,2),
    "trim_length_inches"   numeric(6,4),
    "jump_inches"          numeric(6,4),
    "neck_tension_inches"  numeric(6,4),
    "primer_depth_inches"  numeric(6,4),
    "is_favorite"          boolean DEFAULT false,
    "created_at"           timestamptz DEFAULT now(),
    "updated_at"           timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 13. CONFIGS (Saved calculator snapshots)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "configs" (
    "id"             bigserial PRIMARY KEY,
    "name"           text NOT NULL,
    "caliber"        text NOT NULL,
    "charge_grains"  numeric(10,4),
    "brass_reuse"    integer,
    "lot_size"       integer,
    "recipe_id"      bigint REFERENCES "recipes"("id") ON DELETE SET NULL,
    "cost_per_round" numeric(18,6),
    "cost_per_50"    numeric(18,6),
    "cost_per_100"   numeric(18,6),
    "cost_per_1000"  numeric(18,6),
    "cost_for_lot"   numeric(18,6),
    "cost_json"      jsonb,
    "powder_lot_id"  text,
    "bullet_lot_id"  text,
    "primer_lot_id"  text,
    "case_lot_id"    text,
    "created_at"     timestamptz NOT NULL DEFAULT now(),
    "updated_at"     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- 14. REFERENCE COMPONENTS (Lookup / auto-fill data)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reference_components" (
    "id"         text PRIMARY KEY,
    "type"       text NOT NULL,
    "brand"      text NOT NULL,
    "name"       text NOT NULL,
    "sku"        text,
    "specs"      jsonb DEFAULT '{}',
    "source"     text,
    "verified"   boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 15. SOURCES (Load data book references)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sources" (
    "id"          bigserial PRIMARY KEY,
    "user_id"     bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "title"       text NOT NULL,
    "author"      text,
    "type"        text NOT NULL,
    "description" text,
    "url"         text,
    "is_verified" boolean DEFAULT false,
    "created_at"  timestamptz DEFAULT now(),
    "updated_at"  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------
-- 16. INDEXES
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_user        ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token       ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_purchases_status     ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_purchases_type       ON purchases (component_type);
CREATE INDEX IF NOT EXISTS idx_recipes_caliber      ON recipes (caliber);
CREATE INDEX IF NOT EXISTS idx_recipes_archived      ON recipes (archived);
CREATE INDEX IF NOT EXISTS idx_batches_date         ON batches (load_date);
CREATE INDEX IF NOT EXISTS idx_batches_recipe        ON batches (recipe_id);
CREATE INDEX IF NOT EXISTS idx_range_logs_date      ON range_logs (date);
CREATE INDEX IF NOT EXISTS idx_range_logs_recipe     ON range_logs (recipe_id);
CREATE INDEX IF NOT EXISTS idx_firearms_user        ON firearms (user_id);
CREATE INDEX IF NOT EXISTS idx_gear_user            ON gear (user_id);
CREATE INDEX IF NOT EXISTS idx_market_category      ON market_listings (category);
CREATE INDEX IF NOT EXISTS idx_firearm_gear_fid     ON firearm_gear (firearm_id);

COMMIT;
