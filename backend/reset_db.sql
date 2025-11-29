--===============================================================
--Script Name: Reset Database (Clear Data)
--Warning: This DELETES ALL DATA. It cannot be undone.
--===============================================================

-- 1. Clear dependent tables first (to satisfy foreign keys)
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE configs CASCADE;

-- 2. Clear main data tables
TRUNCATE TABLE recipes CASCADE;
TRUNCATE TABLE purchases CASCADE;

-- 3. Clear sessions (forces everyone to log out)
TRUNCATE TABLE sessions CASCADE;

-- 4. OPTIONAL: Clear users (If you want to re-create the Admin)
-- If you want to KEEP your admin account, comment this line out:
TRUNCATE TABLE users CASCADE;