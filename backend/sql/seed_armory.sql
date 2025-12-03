--===============================================================
--Script Name: Seed Armory (Test Data)
--Script Location: backend/seed_armory.sql
--Date: 12/01/2025
--Created By: T03KNEE
--About: Populates the DB with a Demo Admin and 3 Sample Firearms.
--       Run this AFTER schema_full.sql.
--===============================================================

-- 1. Ensure we have a User (if not already created by schema/bootstrap)
-- Password is 'password123' (PBKDF2 hash)
INSERT INTO users (first_name, last_name, username, email, phone, password_hash, role, is_active)
VALUES 
('Tony', 'Stark', 'admin', 'admin@reloadtracker.com', '555-0199', 
 'pbkdf2$100000$c2FsdA==$MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0', 
 'admin', 
 TRUE)
ON CONFLICT (username) DO NOTHING;

-- Get the ID of that user for linking
DO $$
DECLARE
    admin_id BIGINT;
BEGIN
    SELECT id INTO admin_id FROM users WHERE username = 'admin';

    -- 2. Insert Firearm 1: The Precision Bolt Gun
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs)
    VALUES (
        admin_id,
        'The Long Ranger', 
        'bolt', 
        '6.5 Creedmoor', 
        'Tikka', 
        'T3x TAC A1', 
        450,
        '{
            "twistRate": "1:8", 
            "barrelLength": "24", 
            "optic": "Vortex Razor Gen II 4.5-27x", 
            "opticHeight": "1.54", 
            "trigger": "Two-stage 1.2lb", 
            "notes": "Deadly accurate with 140gr ELD-M. Loves H4350."
        }'::jsonb
    );

    -- 3. Insert Firearm 2: The AR-15
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs)
    VALUES (
        admin_id,
        'Range Toy', 
        'ar15', 
        '.223 Wylde', 
        'Aero Precision', 
        'M4E1 Custom', 
        1200,
        '{
            "twistRate": "1:7", 
            "barrelLength": "16", 
            "optic": "EOTECH EXPS3", 
            "gasSystem": "Mid-length", 
            "bufferWeight": "H2", 
            "notes": "Eats anything. Keep BCG wet."
        }'::jsonb
    );

    -- 4. Insert Firearm 3: The Carry Pistol
    INSERT INTO firearms (user_id, name, platform, caliber, manufacturer, model, round_count, specs)
    VALUES (
        admin_id,
        'EDC', 
        'pistol', 
        '9mm', 
        'Glock', 
        '19 Gen 5', 
        3500,
        '{
            "twistRate": "1:9.84", 
            "barrelLength": "4.02", 
            "optic": "Trijicon RMR Type 2", 
            "sights": "Suppressor Height", 
            "notes": "Bone stock internals. Reliable."
        }'::jsonb
    );

END $$;