const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://brgpgwxzxryefulblbgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyZ3Bnd3h6eHJ5ZWZ1bGJsYmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTQyNzIsImV4cCI6MjA5MTM5MDI3Mn0.8tv4eRS1XbQnW7HnXF3Xe_9GxbTaTht2o0zWsF8k8S4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FINANCIAL_TYPES = [
  { rawType: 'Budget Tender', cleanType: 'Budget Tender' },
  { rawType: 'Budget 1st Working Budget', cleanType: '1st Working Budget' },
  { rawType: 'Business Plan', cleanType: 'Business Plan' },
  { rawType: 'Audit Report (WIP)', cleanType: 'WIP' },
  { rawType: 'Projection as at', cleanType: 'Projection' },
  { rawType: 'Cash Flow Actual received & paid as at', cleanType: 'Cash Flow' },
  { rawType: 'General', cleanType: 'General' },
];

function normaliseFinancialType(rawValue) {
  const v = rawValue.trim();
  const directClean = FINANCIAL_TYPES.find(e => e.cleanType === v);
  if (directClean) return directClean.cleanType;
  const directRaw = FINANCIAL_TYPES.find(e => e.rawType === v);
  if (directRaw) return directRaw.cleanType;
  const subMatch = FINANCIAL_TYPES.find(e =>
    e.rawType && e.rawType.toLowerCase().includes(v.toLowerCase()) && v.length > 3
  );
  if (subMatch) return subMatch.cleanType;
  const revMatch = FINANCIAL_TYPES.find(e =>
    e.rawType && v.toLowerCase().includes(e.rawType.toLowerCase()) && e.rawType.length > 3
  );
  if (revMatch) return revMatch.cleanType;
  return v;
}

async function test() {
  const { data: projects } = await supabase.from('projects').select('*').limit(3);
  const projectId = projects[0].id;
  console.log('Project:', projects[0].code, projects[0].name);
  
  const { data: viewData } = await supabase.from('latest_month_per_project').select('year, month').eq('project_id', projectId).single();
  const year = viewData.year;
  const month = viewData.month;
  console.log('Period:', year, month);
  
  const { data, error } = await supabase
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('year', year)
    .eq('month', month)
    .limit(10000);
  
  if (error) { console.error('Error:', error); return; }
  console.log('Total rows:', data.length);
  
  const rows = data.map(row => {
    const normFType = normaliseFinancialType(row.raw_financial_type || row.financial_type);
    return {
      sheetName: row.sheet_name,
      financialType: normFType,
      rawFinancialType: row.raw_financial_type || row.financial_type,
      itemCode: String(row.item_code),
      value: String(row.value ?? row.raw_value ?? ''),
    };
  });
  
  // Check itemCode types
  const item3Rows = rows.filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3');
  console.log('\nFinancial Status rows with itemCode="3":');
  for (const r of item3Rows) {
    console.log(`  ft="${r.financialType}" raw="${r.rawFinancialType}" val=${r.value}`);
  }
  
  const getValue = (sheet, ftype, item) => {
    const row = rows.find(r =>
      (r.sheetName === sheet || r.sheetName === ftype) &&
      r.financialType === ftype &&
      r.itemCode === item
    );
    return parseFloat(row?.value ?? '0') || 0;
  };
  
  console.log('\n--- Metrics ---');
  console.log('BP GP:', getValue('Financial Status', 'Business Plan', '3'));
  console.log('Proj GP:', getValue('Financial Status', 'Projection', '3'));
  console.log('WIP GP:', getValue('Financial Status', 'WIP', '3'));
  console.log('CF:', getValue('Financial Status', 'Cash Flow', '3'));
}

test().catch(console.error);