--===============================================================
--Script Name: DEMO SEED FULL
--Usage: Run on DEMO environment only.
--About: Populates the DB with rich demo data linked to the
--       FIRST USER found in the 'users' table.
--===============================================================

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

    -- 1. FIND TARGET USER (First Admin/User in DB)
    SELECT id INTO target_user_id FROM users ORDER BY id ASC LIMIT 1;
    
    -- Safety: If no user exists, create one (admin/password123)
    IF target_user_id IS NULL THEN
        INSERT INTO users (first_name, last_name, username, email, phone, role, password_hash, is_active)
        VALUES ('System', 'Admin', 'admin', 'admin@example.com', '555-0199', 'admin', 'pbkdf2$100000$c2FsdA==$MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0', TRUE)
        RETURNING id INTO target_user_id;
    END IF;

    -- 2. CREATE FIREARMS
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs) VALUES 
    (target_user_id, 'Glock 19 Gen5', 'pistol', '9mm', 'Glock', '19 Gen 5', 2500, '{"barrelLength": "4.02", "optic": "Trijicon RMR"}'::jsonb) RETURNING id INTO g_glock;

    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs) VALUES 
    (target_user_id, 'PRS Rig', 'bolt', '6.5 Creedmoor', 'Tikka', 'T3x TAC A1', 450, '{"twistRate": "1:8", "barrelLength": "24", "optic": "Vortex Razor Gen II"}'::jsonb) RETURNING id INTO g_tikka;

    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs) VALUES 
    (target_user_id, 'Honey Badger', 'ar15', '.300 BLK', 'Q', 'Honey Badger', 120, '{"twistRate": "1:5", "barrelLength": "7", "optic": "Aimpoint T2"}'::jsonb) RETURNING id INTO g_badger;


    -- 3. CREATE INVENTORY (With Unique Lot IDs)
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'powder', 'Hodgdon', 'Titegroup', 8, 'lb', 245.00, 'active', 'TG-23-NOV') RETURNING id INTO p_titegroup;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'powder', 'Hodgdon', 'H4350', 8, 'lb', 380.00, 'active', 'H4350-X-24') RETURNING id INTO p_h4350;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'powder', 'IMR', 'Trail Boss', 2, 'lb', 150.00, 'active', 'TB-UNICORN') RETURNING id INTO p_trailboss;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'primer', 'CCI', '#500 Small Pistol', 5000, 'ea', 400.00, 'active', 'SP-500-A') RETURNING id INTO pr_sp;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'primer', 'Federal', 'GM210M Large Rifle', 1000, 'ea', 120.00, 'active', 'FED-GM210') RETURNING id INTO pr_lr;

    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'bullet', 'Berrys', '9mm 115gr RN', 1000, 'ea', 98.00, 'active', 'BER-9-115') RETURNING id INTO b_9mm;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'bullet', 'Hornady', '6.5mm 140gr ELD-M', 500, 'ea', 230.00, 'active', 'ELD-140-M') RETURNING id INTO b_65;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'bullet', 'Sierra', '30cal 220gr SMK', 200, 'ea', 115.00, 'active', 'SMK-220-sub') RETURNING id INTO b_300;

    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'case', 'Starline', '9mm Brass', 2000, 'ea', 180.00, 'active', 'SL-9-New') RETURNING id INTO c_9mm;
    
    INSERT INTO purchases (created_by_user_id, component_type, brand, name, qty, unit, price, status, lot_id) VALUES 
    (target_user_id, 'case', 'Lapua', '6.5 Creedmoor', 100, 'ea', 120.00, 'active', 'LAP-65-Box1') RETURNING id INTO c_65;


    -- 4. CREATE RECIPES (Using captured IDs)
    INSERT INTO recipes (created_by_user_id, name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, group_size_inches, coal, case_capacity, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, '9mm - Range Blaster', '9mm', 'range', 4.1, 10, 500, 115, 1120, 15, 2.0, 1.125, 13.0, 0.550, p_titegroup, b_9mm, pr_sp, c_9mm) RETURNING id INTO r_9mm;

    INSERT INTO recipes (created_by_user_id, name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, group_size_inches, coal, case_capacity, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, '6.5 CM - Match', '6.5 Creedmoor', 'competition', 41.8, 8, 50, 140, 2730, 100, 0.45, 2.820, 53.5, 1.350, p_h4350, b_65, pr_lr, c_65) RETURNING id INTO r_65;

    INSERT INTO recipes (created_by_user_id, name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, group_size_inches, coal, case_capacity, bullet_length, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, '300 BLK - Whisper', '.300 BLK', 'subsonic', 9.5, 5, 50, 220, 1020, 50, 1.5, 2.120, 24.0, 1.450, p_trailboss, b_300, pr_lr, NULL) RETURNING id INTO r_300;


    -- 5. LOG BATCHES (Using captured Recipe IDs)
    INSERT INTO batches (created_by_user_id, recipe_id, load_date, rounds_loaded, notes, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, r_9mm, CURRENT_DATE - 45, 500, 'Restocking 9mm.', p_titegroup, b_9mm, pr_sp, c_9mm) RETURNING id INTO bt_9mm;

    INSERT INTO batches (created_by_user_id, recipe_id, load_date, rounds_loaded, notes, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, r_65, CURRENT_DATE - 10, 50, 'Match prep.', p_h4350, b_65, pr_lr, c_65) RETURNING id INTO bt_65;

    INSERT INTO batches (created_by_user_id, recipe_id, load_date, rounds_loaded, notes, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id) 
    VALUES (target_user_id, r_300, CURRENT_DATE - 5, 20, 'Subsonic test.', p_trailboss, b_300, pr_lr, NULL) RETURNING id INTO bt_300;


    -- 6. LOG RANGE SESSIONS (Using captured Batch & Firearm IDs)
    INSERT INTO range_logs (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
    VALUES (target_user_id, r_9mm, bt_9mm, g_glock, CURRENT_DATE - 40, 150, 15, 3.5, 1125, 12, 35, 'Indoor', 'Ran flawlessly.');

    INSERT INTO range_logs (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
    VALUES (target_user_id, r_65, bt_65, g_tikka, CURRENT_DATE - 2, 20, 100, 0.42, 2735, 6.2, 14, 'Sunny', 'Ragged hole.');

    INSERT INTO range_logs (created_by_user_id, recipe_id, batch_id, firearm_id, date, rounds_fired, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
    VALUES (target_user_id, r_300, bt_300, g_badger, CURRENT_DATE - 1, 10, 50, 1.2, 1015, 15, 40, 'Overcast', 'Quiet.');

END $$;