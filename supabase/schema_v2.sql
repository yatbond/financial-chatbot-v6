-- ============================================
-- Financial Chatbot v6 - Supabase Schema v2
-- Created: 2026-04-12
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Projects — Project Registry
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Financial Types Lookup (from financial_type_map.csv)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_types (
  id SERIAL PRIMARY KEY,
  clean_name TEXT NOT NULL UNIQUE,    -- "Business Plan", "WIP", "Cash Flow"
  raw_names TEXT[],                    -- ["Budget Tender", "Budget 1st Working Budget"]
  acronyms TEXT[],                     -- ["bp", "business plan"]
  sheet_name TEXT NOT NULL,           -- "Financial Status", "Projection", "Cash Flow"
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 3. Line Items Lookup (from construction_headings_enriched.csv)
-- ============================================
CREATE TABLE IF NOT EXISTS line_items (
  item_code TEXT PRIMARY KEY,          -- "1", "1.1", "2.4.3", "3", "7"
  data_type TEXT NOT NULL,             -- Original Data_Type from CSV
  friendly_name TEXT NOT NULL,         -- "Gross Profit", "Total Income"
  category TEXT NOT NULL,              -- Income, Cost, Summary, Overhead, Reconciliation, Project Info
  tier INT NOT NULL,                   -- 0=Project Info, 1=Summary, 2=Subtotal, 3=Detail
  acronyms TEXT[],                     -- ["gp", "profit", "item 3"]
  parent_code TEXT                     -- "2.1" → parent "2"
);

-- ============================================
-- 4. Acronyms — Separate table for easy editing
-- ============================================
CREATE TABLE IF NOT EXISTS acronyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_table TEXT NOT NULL,          -- 'financial_type' or 'line_item'
  target_id TEXT NOT NULL,             -- financial_type clean_name or item_code
  acronym TEXT NOT NULL,
  UNIQUE(target_table, target_id, acronym)
);

-- ============================================
-- 5. Financial Data — Main Data Table
-- ============================================
CREATE TABLE IF NOT EXISTS financial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_year INT NOT NULL,            -- From Report Date (e.g. 2026)
  report_month INT NOT NULL,           -- From Report Date (e.g. 2 = Feb)
  data_month INT,                       -- NULL for snapshots (Financial Status), 4-12 for monthly columns
  financial_type TEXT NOT NULL,         -- "Business Plan", "WIP", "Cash Flow"
  item_code TEXT NOT NULL,              -- "1", "1.1", "3"
  value NUMERIC,
  raw_value TEXT,                       -- Original string (for dates, %, text)
  match_status TEXT,                    -- EXACT, FUZZY, UNMAPPED
  source_file TEXT,                     -- Original xlsx filename
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, report_year, report_month, data_month, financial_type, item_code)
);

-- ============================================
-- 6. Value Change Log — Audit Trail
-- ============================================
CREATE TABLE IF NOT EXISTS value_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  report_year INT,
  report_month INT,
  data_month INT,
  financial_type TEXT,
  item_code TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  old_source TEXT,
  new_source TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Project Metadata — General Info Fields
-- ============================================
CREATE TABLE IF NOT EXISTS project_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_year INT NOT NULL,
  report_month INT NOT NULL,
  meta_key TEXT NOT NULL,              -- "Project Code", "Start Date", etc.
  meta_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, report_year, report_month, meta_key)
);

-- ============================================
-- Indexes
-- ============================================

-- Financial data query patterns
CREATE INDEX IF NOT EXISTS idx_fd_project ON financial_data(project_id);
CREATE INDEX IF NOT EXISTS idx_fd_report_date ON financial_data(report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_fd_data_month ON financial_data(data_month) WHERE data_month IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fd_financial_type ON financial_data(financial_type);
CREATE INDEX IF NOT EXISTS idx_fd_item_code ON financial_data(item_code);
CREATE INDEX IF NOT EXISTS idx_fd_ftype_item ON financial_data(financial_type, item_code);
CREATE INDEX IF NOT EXISTS idx_fd_composite ON financial_data(project_id, report_year, report_month, financial_type, item_code);

-- Lookup searches
CREATE INDEX IF NOT EXISTS idx_ft_clean_name ON financial_types(clean_name);
CREATE INDEX IF NOT EXISTS idx_ft_sheet_name ON financial_types(sheet_name);
CREATE INDEX IF NOT EXISTS idx_li_category ON line_items(category);
CREATE INDEX IF NOT EXISTS idx_li_tier ON line_items(tier);
CREATE INDEX IF NOT EXISTS idx_li_parent ON line_items(parent_code);
CREATE INDEX IF NOT EXISTS idx_acronym_target ON acronyms(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_acronym_word ON acronyms(acronym);

-- Change log
CREATE INDEX IF NOT EXISTS idx_vcl_project ON value_change_log(project_id);
CREATE INDEX IF NOT EXISTS idx_vcl_changed ON value_change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_vcl_source ON value_change_log(new_source);

-- ============================================
-- Views
-- ============================================

-- Latest report month per project
CREATE OR REPLACE VIEW latest_month_per_project AS
SELECT DISTINCT ON (project_id)
  project_id, report_year AS year, report_month AS month
FROM financial_data
ORDER BY project_id, report_year DESC, report_month DESC;

-- Project summary (key metrics from Financial Status snapshots)
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id AS project_id,
  p.code,
  p.name,
  fd.report_year,
  fd.report_month,
  SUM(CASE WHEN fd.financial_type = 'Business Plan' AND fd.item_code = '3' THEN fd.value END) AS bp_gp,
  SUM(CASE WHEN fd.financial_type = 'Projection' AND fd.item_code = '3' THEN fd.value END) AS projected_gp,
  SUM(CASE WHEN fd.financial_type = 'WIP' AND fd.item_code = '3' THEN fd.value END) AS wip_gp,
  SUM(CASE WHEN fd.financial_type = 'Cash Flow' AND fd.item_code = '3' THEN fd.value END) AS cash_flow
FROM projects p
JOIN financial_data fd ON fd.project_id = p.id
WHERE fd.data_month IS NULL
GROUP BY p.id, p.code, p.name, fd.report_year, fd.report_month;

-- ============================================
-- RLS: Disable for service role access
-- (Service role key bypasses RLS)
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE acronyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_change_log ENABLE ROW LEVEL SECURITY;

-- Public read policies (for anon key if needed)
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read financial_data" ON financial_data FOR SELECT USING (true);
CREATE POLICY "Public read project_metadata" ON project_metadata FOR SELECT USING (true);
CREATE POLICY "Public read financial_types" ON financial_types FOR SELECT USING (true);
CREATE POLICY "Public read line_items" ON line_items FOR SELECT USING (true);
CREATE POLICY "Public read acronyms" ON acronyms FOR SELECT USING (true);
CREATE POLICY "Public read value_change_log" ON value_change_log FOR SELECT USING (true);
