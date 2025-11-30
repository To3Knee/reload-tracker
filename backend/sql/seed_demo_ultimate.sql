-- ===============================================================
-- Script: seed_demo_ultimate.sql
-- Purpose: Populates the Demo site with a FULL suite of calibers.
--          (9mm, 45ACP, 6.5CM, .308 - Standard & Subsonic)
-- SAFETY: TRUNCATES (Wipes) data tables. KEEPS USERS.
-- ===============================================================

-- 1. CLEAN SLATE
TRUNCATE TABLE range_logs, batches, configs, recipes, purchases RESTART IDENTITY CASCADE;

-- 2. INVENTORY (Purchases)
-- IDs will start at 1 and increment automatically.
INSERT INTO purchases (component_type, brand, name, lot_id, qty, unit, price, vendor, status, purchase_date)
VALUES 
-- POWDERS
('powder', 'Hodgdon', 'Titegroup', 'TG-23-OCT', 8, 'lb', 245.00, 'Powder Valley', 'active', CURRENT_DATE - 200), -- ID 1 (Pistol Fast)
('powder', 'Hodgdon', 'Varget', 'VAR-24-JAN', 8, 'lb', 360.00, 'MidwayUSA', 'active', CURRENT_DATE - 150),    -- ID 2 (Rifle Precision)
('powder', 'Hodgdon', 'H4350', 'H4350-X', 8, 'lb', 380.00, 'Brownells', 'active', CURRENT_DATE - 100),       -- ID 3 (6.5 CM King)
('powder', 'IMR', 'Trail Boss', 'TB-UNICORN', 2, 'lb', 150.00, 'GunBroker', 'active', CURRENT_DATE - 300),   -- ID 4 (Subsonic bulky)

-- PRIMERS
('primer', 'CCI', '#500 Small Pistol', 'SP-500', 5000, 'ea', 400.00, 'Local Shop', 'active', CURRENT_DATE - 180), -- ID 5
('primer', 'CCI', '#300 Large Pistol', 'LP-300', 2000, 'ea', 180.00, 'Local Shop', 'active', CURRENT_DATE - 180), -- ID 6
('primer', 'CCI', '#400 Small Rifle', 'SR-400', 3000, 'ea', 270.00, 'MidwayUSA', 'active', CURRENT_DATE - 180),  -- ID 7
('primer', 'CCI', '#200 Large Rifle', 'LR-200', 2000, 'ea', 190.00, 'MidwayUSA', 'active', CURRENT_DATE - 180),  -- ID 8

-- BULLETS (Projectiles)
('bullet', 'Berrys', '9mm 115gr RN', 'BER-9-115', 1000, 'ea', 98.00, 'Berrys Mfg', 'active', CURRENT_DATE - 90),    -- ID 9
('bullet', 'Hornady', '9mm 147gr XTP', 'H-9-147', 500, 'ea', 140.00, 'MidwayUSA', 'active', CURRENT_DATE - 60),     -- ID 10 (9mm Sub)
('bullet', 'Berrys', '45cal 230gr RN', 'BER-45-230', 500, 'ea', 85.00, 'Berrys Mfg', 'active', CURRENT_DATE - 90),  -- ID 11 (45)
('bullet', 'Hornady', '6.5mm 140gr ELD-M', 'ELD-140', 500, 'ea', 230.00, 'Hornady', 'active', CURRENT_DATE - 120),  -- ID 12 (6.5 Match)
('bullet', 'Sierra', '30cal 175gr SMK', 'SMK-175', 500, 'ea', 260.00, 'Sierra', 'active', CURRENT_DATE - 120),      -- ID 13 (308 Match)
('bullet', 'Hornady', '30cal 190gr Sub-X', 'SUB-190', 200, 'ea', 110.00, 'MidwayUSA', 'active', CURRENT_DATE - 30), -- ID 14 (308 Sub)

-- BRASS
('case', 'Mixed', '9mm Range Brass', 'MIX-9', 2000, 'ea', 0.00, 'Floor', 'active', CURRENT_DATE - 365),       -- ID 15
('case', 'Starline', '45 ACP', 'STAR-45', 500, 'ea', 120.00, 'Starline', 'active', CURRENT_DATE - 200),      -- ID 16
('case', 'Lapua', '6.5 Creedmoor', 'LAP-65', 200, 'ea', 220.00, 'Creedmoor', 'active', CURRENT_DATE - 150),  -- ID 17
('case', 'Peterson', '.308 Win', 'PET-308', 100, 'ea', 110.00, 'Grafs', 'active', CURRENT_DATE - 150);       -- ID 18


-- 3. RECIPES (The 8 Requested Profiles)
INSERT INTO recipes (name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, notes)
VALUES 
-- 9mm
('9mm - Range Plinker', '9mm', 'range', 4.1, 15, 500, 115, 1150, 15, 'Titegroup. Cheap and dirty. Cycles everything.'),
('9mm - Hush Puppy', '9mm', 'subsonic', 3.2, 10, 200, 147, 980, 15, 'Subsonic. Extremely quiet with Omega 9K.'),

-- 45 ACP
('45 ACP - Hardball', '.45 ACP', 'range', 4.8, 20, 200, 230, 830, 15, 'Standard military duplicate load.'),
('45 ACP - Heavy Sub', '.45 ACP', 'subsonic', 4.2, 20, 100, 230, 750, 15, 'Soft shooting. Powder puff load.'),

-- 6.5 Creedmoor
('6.5 CM - Match', '6.5 Creedmoor', 'competition', 41.5, 8, 50, 140, 2710, 100, 'H4350 + ELD-M. The classic PRS load. SD is single digits.'),
('6.5 CM - Subsonic', '6.5 Creedmoor', 'subsonic', 8.5, 5, 20, 140, 1050, 50, 'Trail Boss load. Fun but drops like a rock.'),

-- .308 Winchester
('.308 - M118LR Clone', '.308 Win', 'competition', 44.2, 10, 50, 175, 2650, 100, 'Varget + SMK. Replicates military sniper ammo.'),
('.308 - Silent Night', '.308 Win', 'subsonic', 10.0, 5, 20, 190, 1030, 50, 'Trail Boss + Sub-X. 100% hearing safe with can.');


-- 4. BATCHES (History with Cost Linking)
-- linking specific LOT IDs from above to ensure cost calculation works
INSERT INTO batches (recipe_id, load_date, rounds_loaded, notes, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id)
VALUES
-- Batch 1: 9mm Range (Oldest)
(1, CURRENT_DATE - 180, 1000, 'Bulk loading session.', 1, 9, 5, 15),
-- Batch 2: 45 ACP
(3, CURRENT_DATE - 150, 200, 'Restocking 1911 food.', 1, 11, 6, 16),
-- Batch 3: 6.5 CM Match (Expensive!)
(5, CURRENT_DATE - 120, 100, 'Match prep for PRS finale.', 3, 12, 7, 17),
-- Batch 4: .308 Precision
(7, CURRENT_DATE - 90, 50, 'Ladder testing Varget.', 2, 13, 8, 18),
-- Batch 5: 9mm Subsonic
(2, CURRENT_DATE - 60, 250, 'Prep for suppressor day.', 1, 10, 5, 15),
-- Batch 6: .308 Subsonic (Fun)
(8, CURRENT_DATE - 30, 20, 'Testing Trail Boss fill.', 4, 14, 8, 18),
-- Batch 7: 6.5 CM Match (Refill)
(5, CURRENT_DATE - 5, 50, 'Confirming zero.', 3, 12, 7, 17);


-- 5. RANGE LOGS (Results)
INSERT INTO range_logs (recipe_id, batch_id, date, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
VALUES
-- 6.5 Creedmoor Performance
(5, 3, CURRENT_DATE - 118, 100, 0.35, 2715, 4.2, 12, 'Perfect conditions', 'One ragged hole. This load is done.'),
(5, 7, CURRENT_DATE - 4, 600, 3.20, 2710, 5.1, 15, 'Windy 10mph', 'Held 1.2 MOA at distance.'),

-- .308 Performance
(7, 4, CURRENT_DATE - 85, 100, 0.65, 2640, 9.8, 25, 'Humid', 'Solid 0.7 MOA gun.'),
(8, 6, CURRENT_DATE - 28, 50, 1.50, 1040, 18.0, 45, 'Cold', 'Very quiet. POI shift is massive (4 mil drop).'),

-- 9mm Performance
(1, 1, CURRENT_DATE - 170, 15, 3.00, 1160, 22.0, 60, 'Indoor', 'Ran fine.'),
(2, 5, CURRENT_DATE - 55, 15, 1.20, 985, 8.5, 20, 'Outdoor', 'Zero failures. Very consistent for pistol ammo.');