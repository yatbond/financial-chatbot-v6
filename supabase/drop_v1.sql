-- ============================================
-- Migration: v1 → v2 Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- Drop old views
DROP VIEW IF EXISTS latest_month_per_project;
DROP VIEW IF EXISTS project_summary;

-- Drop old tables (order matters due to foreign keys)
DROP TABLE IF EXISTS financial_data;
DROP TABLE IF EXISTS project_metadata;
DROP TABLE IF EXISTS value_change_log;

-- Keep projects table (data preserved)
-- Then run schema_v2.sql to create new tables
