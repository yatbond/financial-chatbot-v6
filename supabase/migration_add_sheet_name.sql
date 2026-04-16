-- Migration: Add sheet_name column and backfill
-- Run this in the Supabase Dashboard SQL Editor

-- Step 1: Add the column
ALTER TABLE financial_data ADD COLUMN IF NOT EXISTS sheet_name TEXT;

-- Step 2: Backfill - snapshot rows (data_month IS NULL) → Financial Status
UPDATE financial_data SET sheet_name = 'Financial Status' WHERE data_month IS NULL AND sheet_name IS NULL;

-- Step 3: Backfill - monthly rows (data_month IS NOT NULL) → same as financial_type
UPDATE financial_data SET sheet_name = financial_type WHERE data_month IS NOT NULL AND sheet_name IS NULL;

-- Step 4: Add NOT NULL constraint (after backfill)
ALTER TABLE financial_data ALTER COLUMN sheet_name SET NOT NULL;

-- Step 5: Add index for sheet_name lookups
CREATE INDEX IF NOT EXISTS idx_fd_sheet_name ON financial_data(sheet_name);

-- Step 6: Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_fd_sheet_ftype ON financial_data(sheet_name, financial_type);

-- Verify
SELECT sheet_name, financial_type, data_month IS NULL as is_snapshot, COUNT(*) 
FROM financial_data 
GROUP BY sheet_name, financial_type, data_month IS NULL 
ORDER BY sheet_name, financial_type;