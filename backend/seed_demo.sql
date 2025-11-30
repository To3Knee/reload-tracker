-- ===============================================================
-- Script: seed_demo_full.sql
-- Purpose: Populates the Demo site with rich, realistic data.
-- SAFETY: It TRUNCATES (wipes) Inventory/Logs but KEEPS Users.
-- Run this in Neon SQL Editor on the 'demo' branch.
-- ===============================================================

-- 1. CLEAN SLATE (Keeps your Admin login safe!)
TRUNCATE TABLE range_logs, batches, recipes, purchases RESTART IDENTITY CASCADE;

-- 2. INVENTORY (Purchases)
-- We insert these first so they get IDs 1, 2, 3, 4, 5...
INSERT INTO purchases (component_type, brand, name, lot_id, qty, unit, price, vendor, status, purchase_date, notes)
VALUES 
-- .308 Components
('powder', 'Hodgdon', 'Varget', 'LOT-VAR-24', 8, 'lb', 345.99, 'Powder Valley', 'active', CURRENT_DATE - 45, 'The gold standard for .308.'),
('bullet', 'Hornady', 'ELD-X 178gr', 'H-178-X', 500, 'ea', 210.50, 'MidwayUSA', 'active', CURRENT_DATE - 40, 'Hunting projectiles.'),
('primer', 'CCI', '#200 Large Rifle', 'CCI-LR-99', 1000, 'ea', 89.99, 'Local Shop', 'active', CURRENT_DATE - 60, 'Hard to find lately.'),
('case', 'Lapua', '.308 Win Brass', 'LAP-308', 100, 'ea', 95.00, 'Creedmoor Sports', 'active', CURRENT_DATE - 90, 'Premium brass. 10x firings expected.'),

-- 9mm Components
('powder', 'Hodgdon', 'Titegroup', 'TG-22-B', 4, 'lb', 110.00, 'Bass Pro', 'active', CURRENT_DATE - 120, 'A little goes a long way.'),
('bullet', 'Berrys', '115gr RN', 'BER-115', 1000, 'ea', 98.99, 'Berrys Direct', 'active', CURRENT_DATE - 100, 'Plated range bullets.'),
('primer', 'Fiocchi', 'Small Pistol', 'FIO-SP', 1500, 'ea', 105.00, 'GunShow', 'active', CURRENT_DATE - 110, 'Bought in bulk.'),
('case', 'Mixed', '9mm Range Brass', 'RANGE-PICKUP', 2000, 'ea', 0.00, 'Range Floor', 'active', CURRENT_DATE - 200, 'Free brass is the best brass.');

-- 3. RECIPES
-- ID 1: .308 Precision
INSERT INTO recipes (name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, notes)
VALUES 
('.308 - Precision Hunter', '.308 Win', 'competition', 43.5, 8, 50, 178, 2620, 100, 'Sub-MOA load for deer season. Varget + ELD-X is magic.');

-- ID 2: 9mm Range Fodder
INSERT INTO recipes (name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, notes)
VALUES 
('9mm - Cheap Plinking', '9mm', 'range', 4.1, 20, 500, 115, 1100, 15, 'Soft shooting, cheap, reliable cycle.');

-- 4. BATCHES (History of loading)
INSERT INTO batches (recipe_id, load_date, rounds_loaded, notes, powder_lot_id, bullet_lot_id, primer_lot_id, case_lot_id)
VALUES
-- Batch 1: Loaded some 9mm months ago (Uses Recipe 2)
(2, CURRENT_DATE - 90, 500, 'Bulk session on the progressive press.', 5, 6, 7, 8),
-- Batch 2: Loaded test rounds for .308 (Uses Recipe 1)
(1, CURRENT_DATE - 30, 20, 'Ladder test batches. 43.0 to 44.0 grains.', 1, 2, 3, 4),
-- Batch 3: Loaded final hunting rounds (Uses Recipe 1)
(1, CURRENT_DATE - 5, 50, 'Final hunting batch for the season.', 1, 2, 3, 4);

-- 5. RANGE LOGS (Performance Results)
INSERT INTO range_logs (recipe_id, batch_id, date, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
VALUES
-- Log 1: .308 Ladder Test
(1, 2, CURRENT_DATE - 28, 100, 0.85, 2580, 12.5, 34, 'Overcast, 65F', 'Good group but velocity slightly low.'),
-- Log 2: .308 Verification
(1, 3, CURRENT_DATE - 2, 100, 0.45, 2625, 6.2, 15, 'Sunny, 72F', 'Absolutely stacked them. This is the load.'),
-- Log 3: 9mm Fun Day
(2, 1, CURRENT_DATE - 60, 15, 2.5, 1090, 15.0, 40, 'Indoor Range', 'Ran flawless. Dirty powder but accurate enough.');