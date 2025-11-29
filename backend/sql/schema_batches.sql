--===============================================================
--Script Name: Reload Tracker Batches Schema
--Script Location: backend/schema_batches.sql
--Date: 11/28/2025
--Created By: T03KNEE
--About: Adds Batches table for tracking loading sessions and
--       modifies Recipes to support source citations.
--===============================================================

-- 1. Add Source field to Recipes (Safety/Reference)
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS source TEXT NULL;

-- 2. Create Batches table
CREATE TABLE IF NOT EXISTS batches (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  
  -- Metadata
  load_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rounds_loaded INTEGER NOT NULL CHECK (rounds_loaded > 0),
  notes TEXT NULL,
  
  -- Component Tracking (Snapshotting what was used)
  powder_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  bullet_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  primer_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  case_lot_id BIGINT NULL REFERENCES purchases(id) ON DELETE SET NULL,
  
  -- Audit
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_recipe_id ON batches (recipe_id);
CREATE INDEX IF NOT EXISTS idx_batches_date ON batches (load_date);