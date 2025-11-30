--===============================================================
--Script Name: Reset Database (Clear Data)
--Warning: This DELETES ALL DATA. It cannot be undone.
--Updated: Uses a single command to prevent Foreign Key locking errors.
--===============================================================

-- 1. Wipe everything (except users/settings) in one go
--    RESTART IDENTITY resets the ID counters back to 1.
TRUNCATE TABLE 
  range_logs, 
  batches, 
  configs, 
  recipes, 
  purchases, 
  sessions 
RESTART IDENTITY CASCADE;

-- 2. OPTIONAL: Clear users (Uncomment to wipe Admin accounts)
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;