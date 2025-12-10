-- ===============================================================
-- Script: safe_prod_migration.sql
-- Usage:  Run on PRODUCTION. 
-- Purpose: Adds new features (Analytics/Costing) without deleting data.
-- Safety: Non-destructive. Uses IF NOT EXISTS checks.
-- ===============================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. CONFIGS (Update for New Cost Calculator)
-- ---------------------------------------------------------------
-- The new calculator uses a JSON blob for flexible pricing.
ALTER TABLE "configs" 
ADD COLUMN IF NOT EXISTS "cost_json" jsonb;


-- ---------------------------------------------------------------
-- 2. BATCHES (Update for Tracking Edits)
-- ---------------------------------------------------------------
-- Adds ability to see who edited a batch and when.
ALTER TABLE "batches" 
ADD COLUMN IF NOT EXISTS "updated_by_user_id" bigint,
ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

-- Add Constraint safely
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batches_updated_by_user_id_fkey') THEN
        ALTER TABLE "batches" 
        ADD CONSTRAINT "batches_updated_by_user_id_fkey" 
        FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
END $$;


-- ---------------------------------------------------------------
-- 3. RANGE LOGS (Update for Analytics & Armory)
-- ---------------------------------------------------------------
-- Adds Firearm linking (for Odometer) and better User tracking.
ALTER TABLE "range_logs" 
ADD COLUMN IF NOT EXISTS "firearm_id" bigint,
ADD COLUMN IF NOT EXISTS "rounds_fired" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "created_by_user_id" bigint,
ADD COLUMN IF NOT EXISTS "updated_by_user_id" bigint;

-- Add Constraints safely
DO $$ BEGIN
    -- Link logs to Firearms (The Armory)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'range_logs_firearm_id_fkey') THEN
        ALTER TABLE "range_logs" 
        ADD CONSTRAINT "range_logs_firearm_id_fkey" 
        FOREIGN KEY ("firearm_id") REFERENCES "firearms"("id") ON DELETE SET NULL;
    END IF;

    -- Link Creator
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'range_logs_created_by_user_id_fkey') THEN
        ALTER TABLE "range_logs" 
        ADD CONSTRAINT "range_logs_created_by_user_id_fkey" 
        FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;

    -- Link Updater
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'range_logs_updated_by_user_id_fkey') THEN
        ALTER TABLE "range_logs" 
        ADD CONSTRAINT "range_logs_updated_by_user_id_fkey" 
        FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
END $$;


-- ---------------------------------------------------------------
-- 4. MISSING TABLES (Market & Gear Links)
-- ---------------------------------------------------------------
-- Create 'firearm_gear' if it doesn't exist (Many-to-Many link)
CREATE TABLE IF NOT EXISTS "firearm_gear" (
    "firearm_id" integer NOT NULL,
    "gear_id" bigint NOT NULL,
    PRIMARY KEY ("firearm_id", "gear_id"),
    FOREIGN KEY ("firearm_id") REFERENCES "firearms"("id") ON DELETE CASCADE,
    FOREIGN KEY ("gear_id") REFERENCES "gear"("id") ON DELETE CASCADE
);

-- Create 'market_listings' for the Scraping/Market Watch feature
CREATE TABLE IF NOT EXISTS "market_listings" (
    "id" bigserial PRIMARY KEY,
    "user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
    "url" text NOT NULL UNIQUE,
    "name" text,
    "category" text,
    "vendor" text,
    "price" numeric(10,2),
    "currency" text DEFAULT 'USD',
    "unit_type" text DEFAULT 'ea',
    "in_stock" boolean DEFAULT false,
    "last_scraped_at" timestamp with time zone,
    "image_url" text,
    "notes" text,
    "status" text DEFAULT 'active',
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);


-- ---------------------------------------------------------------
-- 5. DATA BACKFILL (Optional Maintenance)
-- ---------------------------------------------------------------
-- If 'created_by_user_id' is new/empty, fill it with existing 'user_id' data to prevent nulls.
UPDATE "range_logs" 
SET "created_by_user_id" = "user_id" 
WHERE "created_by_user_id" IS NULL AND "user_id" IS NOT NULL;

COMMIT;