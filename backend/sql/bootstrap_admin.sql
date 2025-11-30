-- ===============================================================
-- Script: bootstrap_admin.sql
-- Purpose: Creates the initial Admin user for a fresh install.
-- Usage: Run this in your SQL Editor after creating the tables.
-- Credentials: admin / admin
-- ===============================================================

INSERT INTO users (first_name, last_name, username, email, role, password_hash)
VALUES (
    'Admin', 
    'User', 
    'admin', 
    'admin@example.com', 
    'admin', 
    -- Hash for password: "admin"
    '1000:309726245f77659630325f66316238:52423797669529329065646102293406322964593407636124566353646535313936616462613135333130323336336336333934336237623933353434663636'
)
ON CONFLICT (username) DO NOTHING;