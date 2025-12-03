--===============================================================
--Script Name: Production Migration v3.1
--Date: 12/02/2025
--About: safely upgrades an existing v1.0/v2.0 database to v3.1
--       Adds: Firearms, Odometer, Attribution, Shot Strings.
--       SAFE TO RUN MULTIPLE TIMES (Idempotent).
--===============================================================

BEGIN;

-- 1. Create 'firearms' table (The Armory) if it's missing
CREATE TABLE IF NOT EXISTS firearms (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, 
  platform TEXT NOT NULL DEFAULT 'other',
  caliber TEXT,
  manufacturer TEXT,
  model TEXT,
  specs JSONB DEFAULT '{}'::jsonb,
  round_count INTEGER DEFAULT 0,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Upgrade 'range_logs' table (Add new features)
-- We use DO blocks to safely add columns only if they are missing

DO $$ 
BEGIN 
    -- Link to Armory
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='firearm_id') THEN
        ALTER TABLE range_logs ADD COLUMN firearm_id BIGINT REFERENCES firearms(id) ON DELETE SET NULL;
    END IF;

    -- Odometer Tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='rounds_fired') THEN
        ALTER TABLE range_logs ADD COLUMN rounds_fired INTEGER DEFAULT 0;
    END IF;

    -- Shot String Calculator (Raw Data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='shots') THEN
        ALTER TABLE range_logs ADD COLUMN shots JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- User Attribution (Tracking who created/edited)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='created_by_user_id') THEN
        ALTER TABLE range_logs ADD COLUMN created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='range_logs' AND column_name='updated_by_user_id') THEN
        ALTER TABLE range_logs ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Upgrade 'batches' table (Add Attribution)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='created_by_user_id') THEN
        ALTER TABLE batches ADD COLUMN created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='updated_by_user_id') THEN
        ALTER TABLE batches ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='batches' AND column_name='updated_at') THEN
        ALTER TABLE batches ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. Upgrade 'purchases' table (Add Attribution)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='created_by_user_id') THEN
        ALTER TABLE purchases ADD COLUMN created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='updated_by_user_id') THEN
        ALTER TABLE purchases ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Upgrade 'recipes' table (Add Attribution - just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='created_by_user_id') THEN
        ALTER TABLE recipes ADD COLUMN created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='updated_by_user_id') THEN
        ALTER TABLE recipes ADD COLUMN updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Ensure Indexes Exist (Performance)
CREATE INDEX IF NOT EXISTS idx_firearms_user ON firearms (user_id);
CREATE INDEX IF NOT EXISTS idx_range_logs_firearm ON range_logs (firearm_id);
CREATE INDEX IF NOT EXISTS idx_range_logs_recipe ON range_logs (recipe_id);

COMMIT;