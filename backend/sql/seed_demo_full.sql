-- ===============================================================
-- Script: SEED_DEMO_FULL.sql (v3.1)
-- Purpose: Populates DB with rich data for Demo/Testing.
--          Matches schema_gold_master.sql (v8.0)
-- ===============================================================

DO $$
DECLARE
    -- ID Holders
    target_user_id BIGINT;
    
    g_glock BIGINT; g_tikka BIGINT; g_badger BIGINT;
    p_titegroup BIGINT; p_h4350 BIGINT; p_trailboss BIGINT;
    pr_sp BIGINT; pr_lr BIGINT;
    b_9mm BIGINT; b_65 BIGINT; b_300 BIGINT;
    c_9mm BIGINT; c_65 BIGINT;
    r_9mm BIGINT; r_65 BIGINT; r_300 BIGINT;
    bt_9mm BIGINT; bt_65 BIGINT; bt_300 BIGINT;

BEGIN

    -- 1. CLEANUP (Optional - ensures clean slate if running repeatedly)
    TRUNCATE TABLE range_logs, batches, recipes, purchases, firearms, gear, firearm_gear, blueprints, configs, settings, sessions, users, market_listings, sources RESTART IDENTITY CASCADE;

    -- 2. CREATE ADMIN USER (Password: admin123)
    INSERT INTO users (first_name, last_name, username, email, phone, role, password_hash, is_active)
    VALUES ('System', 'Admin', 'admin', 'admin@example.com', '555-0100', 'admin', '$2b$10$EpI./v.X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X/X', true)
    RETURNING id INTO target_user_id;

    -- 3. DEFAULT SETTINGS
    INSERT INTO settings (key, value) VALUES 
    ('barcode_enabled', 'true'),
    ('barcode_provider', 'go-upc'),
    ('barcode_api_key', ''), 
    ('ai_enabled', 'true'),
    ('ai_model', 'google/gemini-2.0-flash-exp:free');

    -- 4. FIREARMS
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, notes) VALUES
    (target_user_id, 'Tikka T3x TAC A1', 'bolt', '6.5 Creedmoor', 'Tikka', 'T3x', 'Long range precision rig.') RETURNING id INTO g_tikka;
    
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model) VALUES
    (target_user_id, 'Glock 19 Gen 5', 'pistol', '9mm', 'Glock', '19', 'EDC') RETURNING id INTO g_glock;

    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model) VALUES
    (target_user_id, 'Honey Badger', 'ar15', '.300 BLK', 'Q', 'Honey Badger') RETURNING id INTO g_badger;

    -- 5. INVENTORY (Purchases) - Using Decimal Pricing
    -- Powder
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id) VALUES
    (target_user_id, 'powder', CURRENT_DATE - 30, 'MidwayUSA', 'Hodgdon', 'Varget', 8.0, 'lb', 345.00, 20.00, 15.00, 'L7822-A') RETURNING id INTO p_h4350; -- Using Varget as placeholder for precision
    
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id) VALUES
    (target_user_id, 'powder', CURRENT_DATE - 10, 'Local Shop', 'Hodgdon', 'Titegroup', 1.0, 'lb', 32.50, 0, 2.50, 'TG-2024') RETURNING id INTO p_titegroup;

    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, qty, unit, price, shipping, tax, lot_id) VALUES
    (target_user_id, 'powder', CURRENT_DATE - 5, 'Brownells', 'IMR', 'Trail Boss', 2.0, 'lb', 150.00, 10.00, 5.00, 'TB-UNICORN') RETURNING id INTO p_trailboss;

    -- Bullets
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, qty, unit, price, lot_id) VALUES
    (target_user_id, 'bullet', CURRENT_DATE - 45, 'Hornady', 'Hornady', '143gr ELD-X', '.264', 500, 'each', 210.00, 'ELDX-500') RETURNING id INTO b_65;

    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, qty, unit, price, lot_id) VALUES
    (target_user_id, 'bullet', CURRENT_DATE - 20, 'Berrys', 'Berrys', '124gr RN', '.355', 1000, 'each', 98.00, 'BER-9MM') RETURNING id INTO b_9mm;

    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, qty, unit, price, lot_id) VALUES
    (target_user_id, 'bullet', CURRENT_DATE - 25, 'Sierra', 'Sierra', '220gr SMK', '.308', 200, 'each', 120.00, 'SMK-220') RETURNING id INTO b_300;

    -- Primers
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, qty, unit, price, lot_id) VALUES
    (target_user_id, 'primer', CURRENT_DATE - 60, 'Brownells', 'CCI', '#400 Small Rifle', 'Standard', 1000, 'each', 85.00, 'CCI-400-A') RETURNING id INTO pr_lr; -- Using SR for logic

    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, qty, unit, price, lot_id) VALUES
    (target_user_id, 'primer', CURRENT_DATE - 60, 'Brownells', 'CCI', '#500 Small Pistol', 'Standard', 1000, 'each', 75.00, 'CCI-500-B') RETURNING id INTO pr_sp;

    -- Brass
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, type_detail, case_condition, qty, unit, price, lot_id) VALUES
    (target_user_id, 'case', CURRENT_DATE - 90, 'Lapua', 'Lapua', '6.5 Creedmoor Brass', 'Large Rifle Primer', 'new', 100, 'each', 115.00, 'LAP-65') RETURNING id INTO c_65;
    
    INSERT INTO purchases (user_id, component_type, date, vendor, brand, name, case_condition, qty, unit, price, lot_id) VALUES
    (target_user_id, 'case', CURRENT_DATE - 100, 'Range Pickup', 'Mixed', '9mm Brass', 'once-fired', 2000, 'each', 0.00, 'RANGE-9') RETURNING id INTO c_9mm;

    -- 6. RECIPES
    -- Precision 6.5CM
    INSERT INTO recipes (user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr, muzzle_velocity_fps, coal, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, notes) 
    VALUES (target_user_id, '6.5CM Precision', '6.5 Creedmoor', 'competition', 41.5, 143, 2750, 2.800, 1.35, p_h4350, b_65, pr_lr, c_65, '0.5 MOA group at 100yds. Standard load.')
    RETURNING id INTO r_65;

    -- Bulk 9mm
    INSERT INTO recipes (user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr, muzzle_velocity_fps, coal, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, notes)
    VALUES (target_user_id, '9mm Plinker', '9mm', 'range', 3.8, 124, 1050, 1.150, 0.60, p_titegroup, b_9mm, pr_sp, c_9mm, 'Low recoil, cycles well.')
    RETURNING id INTO r_9mm;

    -- Subsonic 300
    INSERT INTO recipes (user_id, name, caliber, profile_type, charge_grains, bullet_weight_gr, muzzle_velocity_fps, coal, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id, notes)
    VALUES (target_user_id, '300 BLK Sub', '.300 BLK', 'subsonic', 9.2, 220, 1015, 2.120, 1.45, p_trailboss, b_300, pr_lr, NULL, 'Whisper quiet.')
    RETURNING id INTO r_300;

    -- 7. BATCH HISTORY
    INSERT INTO batches (created_by_user_id, recipe_id, load_date, rounds_loaded, created_at, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) VALUES
    (target_user_id, r_65, CURRENT_DATE - 60, 50, CURRENT_DATE - 60, p_h4350, b_65, pr_lr, c_65),
    (target_user_id, r_65, CURRENT_DATE - 30, 50, CURRENT_DATE - 30, p_h4350, b_65, pr_lr, c_65),
    (target_user_id, r_9mm,  CURRENT_DATE - 20, 200, CURRENT_DATE - 20, p_titegroup, b_9mm, pr_sp, c_9mm),
    (target_user_id, r_9mm,  CURRENT_DATE - 5,  300, CURRENT_DATE - 5,  p_titegroup, b_9mm, pr_sp, c_9mm),
    (target_user_id, r_300,  CURRENT_DATE - 2,  20, CURRENT_DATE - 2,  p_trailboss, b_300, pr_lr, NULL) RETURNING id INTO bt_300;

    -- 8. RANGE LOGS
    INSERT INTO range_logs (created_by_user_id, recipe_id, firearm_id, date, rounds_fired, group_size_inches, distance_yards, velocity_fps, sd, es, weather) VALUES
    (target_user_id, r_65, g_tikka, CURRENT_DATE - 28, 20, 0.65, 100, 2745, 8.5, 22, 'Sunny, 75F'),
    (target_user_id, r_9mm, g_glock, CURRENT_DATE - 18, 100, 4.0, 15, 1040, 15.0, 45, 'Indoor Range'),
    (target_user_id, r_300, g_badger, CURRENT_DATE - 1, 20, 1.2, 50, 1010, 12.0, 30, 'Overcast');

END $$;