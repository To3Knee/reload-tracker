-- ===============================================================
-- Script: seed_demo_safe.sql
-- Purpose: Safely clears data and repopulates (Standard DELETE).
-- Run this in Neon SQL Editor on the 'demo' branch.
-- ===============================================================

-- 1. DELETE DATA (Order matters to prevent Foreign Key errors)
DELETE FROM range_logs;
DELETE FROM batches;
DELETE FROM configs;  -- This was the one causing the cascade error!
DELETE FROM recipes;
DELETE FROM purchases;

-- Note: We do NOT delete 'users'. Your Admin account stays safe.

-- 2. REPOPULATE INVENTORY
INSERT INTO purchases (component_type, brand, name, lot_id, qty, unit, price, vendor, status, purchase_date, notes)
VALUES 
('powder', 'Hodgdon', 'Varget', 'LOT-VAR-24', 8, 'lb', 345.99, 'Powder Valley', 'active', CURRENT_DATE - 45, 'The gold standard for .308.'),
('bullet', 'Hornady', 'ELD-X 178gr', 'H-178-X', 500, 'ea', 210.50, 'MidwayUSA', 'active', CURRENT_DATE - 40, 'Hunting projectiles.'),
('primer', 'CCI', '#200 Large Rifle', 'CCI-LR-99', 1000, 'ea', 89.99, 'Local Shop', 'active', CURRENT_DATE - 60, 'Hard to find lately.'),
('case', 'Lapua', '.308 Win Brass', 'LAP-308', 100, 'ea', 95.00, 'Creedmoor Sports', 'active', CURRENT_DATE - 90, 'Premium brass. 10x firings expected.'),
('powder', 'Hodgdon', 'Titegroup', 'TG-22-B', 4, 'lb', 110.00, 'Bass Pro', 'active', CURRENT_DATE - 120, 'A little goes a long way.'),
('bullet', 'Berrys', '115gr RN', 'BER-115', 1000, 'ea', 98.99, 'Berrys Direct', 'active', CURRENT_DATE - 100, 'Plated range bullets.'),
('primer', 'Fiocchi', 'Small Pistol', 'FIO-SP', 1500, 'ea', 105.00, 'GunShow', 'active', CURRENT_DATE - 110, 'Bought in bulk.'),
('case', 'Mixed', '9mm Range Brass', 'RANGE-PICKUP', 2000, 'ea', 0.00, 'Range Floor', 'active', CURRENT_DATE - 200, 'Free brass is the best brass.');

-- 3. REPOPULATE RECIPES
INSERT INTO recipes (name, caliber, profile_type, charge_grains, brass_reuse, lot_size, bullet_weight_gr, muzzle_velocity_fps, zero_distance_yards, notes)
VALUES 
('.308 - Precision Hunter', '.308 Win', 'competition', 43.5, 8, 50, 178, 2620, 100, 'Sub-MOA load for deer season. Varget + ELD-X is magic.'),
('9mm - Cheap Plinking', '9mm', 'range', 4.1, 20, 500, 115, 1100, 15, 'Soft shooting, cheap, reliable cycle.');

-- 4. REPOPULATE BATCHES
-- (We use subqueries to find IDs dynamically so it never breaks)
INSERT INTO batches (recipe_id, load_date, rounds_loaded, notes)
VALUES
((SELECT id FROM recipes WHERE name LIKE '9mm%'), CURRENT_DATE - 90, 500, 'Bulk session on the progressive press.'),
((SELECT id FROM recipes WHERE name LIKE '.308%'), CURRENT_DATE - 30, 20, 'Ladder test batches. 43.0 to 44.0 grains.'),
((SELECT id FROM recipes WHERE name LIKE '.308%'), CURRENT_DATE - 5, 50, 'Final hunting batch for the season.');

-- 5. REPOPULATE RANGE LOGS
INSERT INTO range_logs (recipe_id, batch_id, date, distance_yards, group_size_inches, velocity_fps, sd, es, weather, notes)
VALUES
((SELECT id FROM recipes WHERE name LIKE '.308%'), (SELECT id FROM batches WHERE notes LIKE 'Ladder%' LIMIT 1), CURRENT_DATE - 28, 100, 0.85, 2580, 12.5, 34, 'Overcast, 65F', 'Good group but velocity slightly low.'),
((SELECT id FROM recipes WHERE name LIKE '.308%'), (SELECT id FROM batches WHERE notes LIKE 'Final%' LIMIT 1), CURRENT_DATE - 2, 100, 0.45, 2625, 6.2, 15, 'Sunny, 72F', 'Absolutely stacked them. This is the load.');