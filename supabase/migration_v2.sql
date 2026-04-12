-- ============================================
-- Migration: v1 → v2
-- Drop old schema and apply new
-- ============================================

-- Drop old views first
DROP VIEW IF EXISTS latest_month_per_project CASCADE;
DROP VIEW IF EXISTS project_summary CASCADE;

-- Drop old tables (order matters for FKs)
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS project_metadata CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Now apply v2 schema
\i schema_v2.sql