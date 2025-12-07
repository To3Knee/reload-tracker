-- Script: PROD INIT
-- Purpose: Creates the Admin user ONLY. No other data.
-- Login: admin / password123

INSERT INTO users (first_name, last_name, username, email, phone, role, password_hash, is_active)
VALUES (
  'System', 'Admin', 'admin', 'admin@reloadtracker.com', '555-0199', 'admin', 
  'pbkdf2$100000$c2FsdA==$MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0MzE1N2VlMmQ5N2I1N2E2ZGUwYjE1NzM5N2U5N2E4YjU1ZmZmNjM0', 
  TRUE
)
ON CONFLICT (username) DO NOTHING;