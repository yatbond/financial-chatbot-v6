-- ============================================
-- Financial Chatbot v6 - Supabase Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code)
);

-- Financial data - one row per (project, year, month, sheet, item)
CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  sheet_name TEXT NOT NULL,        -- Financial Status, Projection, Committed Cost, Accrual, Cash Flow, etc.
  financial_type TEXT NOT NULL,    -- Clean_Financial_Type from type map
  raw_financial_type TEXT,         -- Original Financial_Type from Excel
  item_code TEXT NOT NULL,         -- e.g. "1.1", "3", "7"
  friendly_name TEXT,              -- Friendly_Name from enriched headings
  category TEXT,                   -- Category from enriched headings
  value NUMERIC,                  -- Parsed numeric value
  raw_value TEXT,                  -- Original string value (for dates, %, etc.)
  match_status TEXT,               -- EXACT, FUZZY, UNMAPPED
  source_file TEXT,                -- Original xlsx filename
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_fd_project ON financial_data(project_id);
CREATE INDEX idx_fd_year_month ON financial_data(year, month);
CREATE INDEX idx_fd_sheet ON financial_data(sheet_name);
CREATE INDEX idx_fd_financial_type ON financial_data(financial_type);
CREATE INDEX idx_fd_item_code ON financial_data(item_code);
CREATE INDEX idx_fd_sheet_ftype ON financial_data(sheet_name, financial_type);
CREATE INDEX idx_fd_composite ON financial_data(project_id, year, month, sheet_name, financial_type);

-- Project metadata (from Financial Status / General section)
CREATE TABLE project_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  meta_key TEXT NOT NULL,          -- e.g. "Project Code", "Project Name", "Start Date", etc.
  meta_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, year, month, meta_key)
);

-- Row Level Security (optional - enable if you want auth)
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for public read (adjust as needed for auth)
-- CREATE POLICY "Public read" ON projects FOR SELECT USING (true);
-- CREATE POLICY "Public read" ON financial_data FOR SELECT USING (true);
-- CREATE POLICY "Public read" ON project_metadata FOR SELECT USING (true);

-- ============================================
-- Views for common queries
-- ============================================

-- Latest month per project
CREATE VIEW latest_month_per_project AS
SELECT DISTINCT ON (project_id)
  project_id, year, month
FROM financial_data
ORDER BY project_id, year DESC, month DESC;

-- Project summary (key metrics)
CREATE VIEW project_summary AS
SELECT
  p.id AS project_id,
  p.code,
  p.name,
  fd.year,
  fd.month,
  SUM(CASE WHEN fd.financial_type = 'Business Plan' AND fd.item_code = '3' THEN fd.value END) AS bp_gp,
  SUM(CASE WHEN fd.financial_type = 'Projection' AND fd.item_code = '3' THEN fd.value END) AS projected_gp,
  SUM(CASE WHEN fd.financial_type = 'WIP' AND fd.item_code = '3' THEN fd.value END) AS wip_gp,
  SUM(CASE WHEN fd.financial_type = 'Cash Flow' AND fd.item_code = '7' THEN fd.value END) AS cash_flow
FROM projects p
JOIN financial_data fd ON fd.project_id = p.id
GROUP BY p.id, p.code, p.name, fd.year, fd.month;