-- ===============================================================
-- Script: migration_v5_firearm_gear.sql
-- Purpose: Links Gear Items to Firearms (Many-to-Many).
-- ===============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS firearm_gear (
    firearm_id INTEGER REFERENCES firearms(id) ON DELETE CASCADE,
    gear_id BIGINT REFERENCES gear(id) ON DELETE CASCADE,
    PRIMARY KEY (firearm_id, gear_id)
);

CREATE INDEX IF NOT EXISTS idx_firearm_gear_fid ON firearm_gear(firearm_id);
CREATE INDEX IF NOT EXISTS idx_firearm_gear_gid ON firearm_gear(gear_id);

COMMIT;