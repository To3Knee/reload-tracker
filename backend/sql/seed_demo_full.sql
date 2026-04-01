-- ===============================================================
-- Script: seed_demo_full.sql (v4.0)
-- Purpose: Populates DB with realistic demo data for testing/demo.
--          Safe to run repeatedly — TRUNCATES all data first.
--
-- REQUIRES: schema_gold_master.sql run first (or existing schema).
--
-- PASSWORDS:
--   admin / demo user passwords are bcrypt hashes.
--   To generate your own:
--     node -e "const b=require('bcryptjs');b.hash('yourpassword',10).then(h=>console.log(h))"
--   Or use the generate_hash.js tool in backend/tools/
--
-- FIXES vs v3.1:
--   - purchases: uses purchase_date (not 'date')
--   - recipes: uses created_by_user_id (not non-existent user_id)
--   - firearms: removed non-existent 'notes' column
--   - batches: each INSERT is separate so RETURNING works correctly
--   - password hashes: annotated for replacement
-- ===============================================================

DO $$
DECLARE
    admin_id      BIGINT;
    demo_id       BIGINT;

    -- Firearms
    g_glock   INT;
    g_tikka   INT;
    g_badger  INT;

    -- Powder lots
    p_varget     BIGINT;
    p_titegroup  BIGINT;
    p_trailboss  BIGINT;

    -- Primer lots
    pr_sr  BIGINT;
    pr_sp  BIGINT;

    -- Bullet lots
    b_eldx  BIGINT;
    b_9mm   BIGINT;
    b_smk   BIGINT;

    -- Brass lots
    c_65  BIGINT;
    c_9mm BIGINT;

    -- Recipes
    r_65cm  BIGINT;
    r_9mm   BIGINT;
    r_300   BIGINT;

    -- Batches
    bt_65_1  BIGINT;
    bt_65_2  BIGINT;
    bt_9mm_1 BIGINT;
    bt_9mm_2 BIGINT;
    bt_300   BIGINT;

BEGIN

-- ---------------------------------------------------------------
-- 1. WIPE (clean slate — safe to re-run)
-- ---------------------------------------------------------------
TRUNCATE TABLE
    range_logs, batches, configs, blueprints,
    recipes, purchases, firearm_gear, firearms,
    gear, market_listings, sources, reference_components,
    sessions, settings, users
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------
-- 2. USERS
--    Passwords below are bcrypt hashes of 'admin123' and 'demo123'.
--    Replace with your own using: node backend/tools/generate_hash.js
-- ---------------------------------------------------------------
INSERT INTO users (first_name, last_name, username, email, phone, role, password_hash, is_active)
VALUES (
    'System', 'Admin', 'admin', 'admin@example.com', '555-0100', 'admin',
    -- Hash of 'admin123' — REPLACE before going to production
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    true
) RETURNING id INTO admin_id;

INSERT INTO users (first_name, last_name, username, email, phone, role, password_hash, is_active)
VALUES (
    'Demo', 'Shooter', 'demo', 'demo@example.com', '555-0200', 'shooter',
    -- Hash of 'demo123' — REPLACE before going to production
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    true
) RETURNING id INTO demo_id;

-- ---------------------------------------------------------------
-- 3. SETTINGS
-- ---------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
    ('barcode_enabled',  'false'),
    ('barcode_provider', 'go-upc'),
    ('barcode_api_key',  ''),
    ('ai_enabled',       'false'),
    ('ai_model',         'google/gemini-2.0-flash-exp:free'),
    ('ai_api_key',       '');

-- ---------------------------------------------------------------
-- 4. FIREARMS (no 'notes' column — use specs jsonb for extra data)
-- ---------------------------------------------------------------
INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, specs)
VALUES (admin_id, 'Tikka T3x TAC A1', 'bolt', '6.5 Creedmoor', 'Tikka', 'T3x TAC A1',
        '{"twistRate":"1:8","barrelLength":"24\"","action":"bolt","notes":"Long range precision rig"}')
RETURNING id INTO g_tikka;

INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, specs)
VALUES (admin_id, 'Glock 19 Gen 5', 'pistol', '9mm', 'Glock', '19 Gen 5',
        '{"barrelLength":"4.02\"","notes":"EDC"}')
RETURNING id INTO g_glock;

INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, specs)
VALUES (admin_id, 'Q Honey Badger', 'ar15', '.300 BLK', 'Q', 'Honey Badger',
        '{"twistRate":"1:7","notes":"Suppressor host, subsonic rig"}')
RETURNING id INTO g_badger;

-- ---------------------------------------------------------------
-- 5. INVENTORY (Purchases)
--    FIXED: uses 'purchase_date' (not 'date')
-- ---------------------------------------------------------------

-- Powder
INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'powder', CURRENT_DATE - 45, 'MidwayUSA', 'Hodgdon', 'Varget',
     8.0, 'lb', 345.00, 18.00, 0.00, 'VAR-2024A')
RETURNING id INTO p_varget;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'powder', CURRENT_DATE - 10, 'Local Shop', 'Hodgdon', 'Titegroup',
     1.0, 'lb', 32.50, 0.00, 2.50, 'TG-2024B')
RETURNING id INTO p_titegroup;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'powder', CURRENT_DATE - 5, 'Brownells', 'IMR', 'Trail Boss',
     2.0, 'lb', 85.00, 10.00, 5.00, 'TB-2024C')
RETURNING id INTO p_trailboss;

-- Primers
INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'primer', CURRENT_DATE - 60, 'Brownells', 'CCI', '#400 Small Rifle', 'Standard',
     1000, 'each', 85.00, 15.00, 0.00, 'CCI-400-A')
RETURNING id INTO pr_sr;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'primer', CURRENT_DATE - 60, 'Brownells', 'CCI', '#500 Small Pistol', 'Standard',
     1000, 'each', 75.00, 15.00, 0.00, 'CCI-500-B')
RETURNING id INTO pr_sp;

-- Bullets
INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, caliber, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'bullet', CURRENT_DATE - 45, 'Hornady Direct', 'Hornady', '143gr ELD-X', 'BTHP', '6.5 Creedmoor',
     500, 'each', 210.00, 12.00, 0.00, 'ELDX-500A')
RETURNING id INTO b_eldx;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, caliber, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'bullet', CURRENT_DATE - 20, 'Berry''s Manufacturing', 'Berry''s', '124gr Round Nose', 'Plated RN', '9mm',
     1000, 'each', 98.00, 10.00, 0.00, 'BER-9MM-A')
RETURNING id INTO b_9mm;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, caliber, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'bullet', CURRENT_DATE - 25, 'Sierra Bullets', 'Sierra', '220gr MatchKing', 'BTHP', '.300 BLK',
     200, 'each', 120.00, 8.00, 0.00, 'SMK-220A')
RETURNING id INTO b_smk;

-- Brass / Cases
INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, type_detail, caliber, case_condition, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'case', CURRENT_DATE - 90, 'Lapua', 'Lapua', '6.5 Creedmoor Brass', 'Large Rifle Primer', '6.5 Creedmoor',
     'new', 100, 'each', 115.00, 12.00, 0.00, 'LAP-65-A')
RETURNING id INTO c_65;

INSERT INTO purchases
    (user_id, created_by_user_id, component_type, purchase_date, vendor, brand, name, caliber, case_condition, qty, unit, price, shipping, tax, lot_id)
VALUES
    (admin_id, admin_id, 'case', CURRENT_DATE - 100, 'Range Pickup', 'Mixed', '9mm Brass', '9mm',
     'once-fired', 2000, 'each', 0.00, 0.00, 0.00, 'RANGE-9MM-A')
RETURNING id INTO c_9mm;

-- ---------------------------------------------------------------
-- 6. RECIPES
--    FIXED: uses created_by_user_id (not user_id — doesn't exist on recipes)
-- ---------------------------------------------------------------
INSERT INTO recipes
    (created_by_user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr,
     muzzle_velocity_fps, coal, bullet_length, case_capacity, lot_size, brass_reuse,
     powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id,
     notes, range_notes, source)
VALUES
    (admin_id, '6.5CM Precision', '6.5 Creedmoor', 'competition',
     41.5, 143, 2750, 2.800, 1.350, 52.0, 50, 5,
     p_varget, b_eldx, pr_sr, c_65,
     'Ladder test confirmed. Seating depth 0.010" off lands. Temp stable to ±3fps/10°F.',
     '0.48 MOA aggregate at 100yds. Best 3-shot: 0.32 MOA.',
     'Hornady Handbook 10th Ed p.312')
RETURNING id INTO r_65cm;

INSERT INTO recipes
    (created_by_user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr,
     muzzle_velocity_fps, coal, bullet_length, lot_size, brass_reuse,
     powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id,
     notes, range_notes)
VALUES
    (admin_id, '9mm Plinker', '9mm', 'range',
     3.8, 124, 1055, 1.150, 0.610, 200, 8,
     p_titegroup, b_9mm, pr_sp, c_9mm,
     'Low recoil, cycles reliably. Tested in Glock 19 and P320.',
     'Consistent 4" groups at 15 yards from standing position.')
RETURNING id INTO r_9mm;

INSERT INTO recipes
    (created_by_user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr,
     muzzle_velocity_fps, coal, bullet_length, lot_size, brass_reuse,
     powder_lot_id, bullet_lot_id, primer_lot_id,
     notes, range_notes)
VALUES
    (admin_id, '300 BLK Whisper', '.300 BLK', 'subsonic',
     9.2, 220, 1015, 2.120, 1.450, 20, 6,
     p_trailboss, b_smk, pr_sr,
     'Suppressed only. Confirmed subsonic through 16" barrel. Cycles suppressed with H2 buffer.',
     'No splash at 50yds. Hearing safe.')
RETURNING id INTO r_300;

-- ---------------------------------------------------------------
-- 7. BATCHES
--    FIXED: each INSERT is separate so RETURNING id works per batch
-- ---------------------------------------------------------------
INSERT INTO batches
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, created_by_user_id, notes)
VALUES (r_65cm, CURRENT_DATE - 60, 50, p_varget, b_eldx, pr_sr, c_65, admin_id, 'First batch — establishing baseline.')
RETURNING id INTO bt_65_1;

INSERT INTO batches
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, created_by_user_id, notes)
VALUES (r_65cm, CURRENT_DATE - 30, 50, p_varget, b_eldx, pr_sr, c_65, admin_id, 'Second pull — same lot, confirmed consistency.')
RETURNING id INTO bt_65_2;

INSERT INTO batches
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, created_by_user_id)
VALUES (r_9mm, CURRENT_DATE - 20, 200, p_titegroup, b_9mm, pr_sp, c_9mm, admin_id)
RETURNING id INTO bt_9mm_1;

INSERT INTO batches
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, created_by_user_id)
VALUES (r_9mm, CURRENT_DATE - 5, 300, p_titegroup, b_9mm, pr_sp, c_9mm, admin_id)
RETURNING id INTO bt_9mm_2;

INSERT INTO batches
    (recipe_id, load_date, rounds_loaded, powder_lot_id, bullet_lot_id, primer_lot_id, created_by_user_id, notes)
VALUES (r_300, CURRENT_DATE - 2, 20, p_trailboss, b_smk, pr_sr, admin_id, 'Subsonic test batch — suppressed use only.')
RETURNING id INTO bt_300;

-- ---------------------------------------------------------------
-- 8. RANGE LOGS
-- ---------------------------------------------------------------
INSERT INTO range_logs
    (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired,
     group_size_inches, distance_yards, velocity_fps, sd, es, weather, temp_f, notes)
VALUES
    (admin_id, r_65cm, bt_65_1, g_tikka, CURRENT_DATE - 55, 20,
     0.68, 100, 2741, 8.2, 19, 'Sunny, light wind 5mph NE', 72,
     'First trip with this load. Needs more seating depth work.');

INSERT INTO range_logs
    (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired,
     group_size_inches, distance_yards, velocity_fps, sd, es, weather, temp_f, notes)
VALUES
    (admin_id, r_65cm, bt_65_2, g_tikka, CURRENT_DATE - 28, 20,
     0.52, 100, 2748, 6.5, 17, 'Overcast, calm, 60°F', 60,
     'Best group yet. Load is dialed. 0.52 MOA at 100.');

INSERT INTO range_logs
    (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired,
     group_size_inches, distance_yards, velocity_fps, sd, es, weather, temp_f, notes)
VALUES
    (admin_id, r_9mm, bt_9mm_1, g_glock, CURRENT_DATE - 18, 100,
     3.8, 15, 1048, 14.5, 42, 'Indoor Range', 68,
     'Reliability test — 100 rounds zero malfunctions.');

INSERT INTO range_logs
    (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired,
     group_size_inches, distance_yards, velocity_fps, sd, es, weather, temp_f, notes,
     shots)
VALUES
    (admin_id, r_300, bt_300, g_badger, CURRENT_DATE - 1, 20,
     1.1, 50, 1008, 10.2, 28, 'Evening, light overcast', 65,
     'Subsonic confirmed. Hearing safe with suppressor.',
     '[1005,1012,1008,1003,1015,1007,1011,1009,1006,1010]'::jsonb);

-- ---------------------------------------------------------------
-- 9. DEFAULT MARKET LISTINGS (optional — shows feature works)
-- ---------------------------------------------------------------
-- Uncomment to seed with example market tracker entries:
-- INSERT INTO market_listings (user_id, url, name, category, vendor, price, in_stock, qty_per_unit)
-- VALUES
--     (admin_id, 'https://www.midwayusa.com/product/1023736867', 'Hodgdon Varget 8lb', 'powder', 'MidwayUSA', 345.99, true, 8),
--     (admin_id, 'https://www.brownells.com/reloading/primers/cci-400-small-rifle-primers', 'CCI 400 SR 1000pk', 'primer', 'Brownells', 89.99, false, 1000);

END $$;

-- ---------------------------------------------------------------
-- Verify row counts after seeding
-- ---------------------------------------------------------------
SELECT 'users'          AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'settings',        COUNT(*) FROM settings
UNION ALL SELECT 'firearms',        COUNT(*) FROM firearms
UNION ALL SELECT 'purchases',       COUNT(*) FROM purchases
UNION ALL SELECT 'recipes',         COUNT(*) FROM recipes
UNION ALL SELECT 'batches',         COUNT(*) FROM batches
UNION ALL SELECT 'range_logs',      COUNT(*) FROM range_logs;
