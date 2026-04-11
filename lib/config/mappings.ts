import type { ConfigMappings, FinancialTypeEntry, DataTypeEntry } from './types'

// Hardcoded config — no filesystem dependency (Vercel-safe)
const FINANCIAL_TYPES: FinancialTypeEntry[] = [
  { rawType: 'Budget Tender', cleanType: 'Budget Tender', keywords: ['tender', 'tender budget'] },
  { rawType: 'Budget 1st Working Budget', cleanType: '1st Working Budget', keywords: ['1st working', 'first working', '1wb'] },
  { rawType: 'Budget Adjustment Cost/variation', cleanType: '*not used', keywords: [] },
  { rawType: 'Budget Revision as at', cleanType: 'Latest Budget', keywords: ['latest budget', 'budget', 'bt', 'revision', 'rev', 'rev as at', 'budget revision'] },
  { rawType: 'Business Plan', cleanType: 'Business Plan', keywords: ['bp', 'business plan'] },
  { rawType: 'Audit Report (WIP)', cleanType: 'WIP', keywords: ['wip', 'audit', 'audit report'] },
  { rawType: 'Adjustment Cost/ variation', cleanType: '*not used', keywords: [] },
  { rawType: 'Projection as at', cleanType: 'Projection', keywords: ['projected', 'projection'] },
  { rawType: 'Committed Value / Cost as at', cleanType: 'Committed Cost', keywords: ['committed', 'committed cost', 'committed value'] },
  { rawType: 'Committed Value / Cost % of time elapse', cleanType: '*not used', keywords: [] },
  { rawType: 'Committed Value / Cost Balance', cleanType: '*not used', keywords: [] },
  { rawType: 'Accrual \n(Before Retention) as at', cleanType: 'Accrual', keywords: ['accrual', 'accrued'] },
  { rawType: 'Cash Flow Actual received & paid as at', cleanType: 'Cash Flow', keywords: ['cf', 'cashflow', 'cash flow', 'cash'] },
  { rawType: 'Cash Flow Actual received & paid % of time elapse', cleanType: '*not used', keywords: [] },
  { rawType: 'Cash Flow Balance to ', cleanType: '*not used', keywords: [] },
  { rawType: 'General', cleanType: 'General', keywords: ['general', 'project info'] },
  // Additional raw types seen in Supabase data (migration stored both raw variants)
  { rawType: 'Adjustment Cost / Variation', cleanType: '*not used', keywords: [] },
  { rawType: '% of time elapse', cleanType: '*not used', keywords: [] },
  { rawType: 'Balance', cleanType: '*not used', keywords: [] },
  { rawType: 'Balance to', cleanType: '*not used', keywords: [] },
]

const DATA_TYPES: DataTypeEntry[] = [
  { itemCode: '', dataType: 'Project Code', friendlyName: 'Project Code', category: 'Project Info', tier: 0, keywords: ['project code', 'project no', 'job no', 'pcode'] },
  { itemCode: '', dataType: 'Project Name', friendlyName: 'Project Name', category: 'Project Info', tier: 0, keywords: ['project name', 'project', 'job name'] },
  { itemCode: '', dataType: 'Report Date', friendlyName: 'Report Date', category: 'Project Info', tier: 0, keywords: ['report date', 'report month', 'as at date'] },
  { itemCode: '', dataType: 'Start Date', friendlyName: 'Start Date', category: 'Project Info', tier: 0, keywords: ['start date', 'commencement'] },
  { itemCode: '', dataType: 'Complete Date', friendlyName: 'Completion Date', category: 'Project Info', tier: 0, keywords: ['complete date', 'completion date', 'end date'] },
  { itemCode: '', dataType: 'Target Complete Date', friendlyName: 'Target Completion Date', category: 'Project Info', tier: 0, keywords: ['target complete date', 'target date', 'target completion'] },
  { itemCode: '', dataType: 'Time Consumed (%)', friendlyName: 'Time Consumed %', category: 'Project Info', tier: 0, keywords: ['time consumed', 'time elapsed', 'time %'] },
  { itemCode: '', dataType: 'Target Completed (%)', friendlyName: 'Target Completion %', category: 'Project Info', tier: 0, keywords: ['target completed', 'target %', 'completion %'] },
  { itemCode: '1', dataType: 'Income', friendlyName: 'Total Income', category: 'Income', tier: 1, keywords: ['income', 'revenue', 'total income', 'item 1'] },
  { itemCode: '1.1', dataType: 'Income - Original Contract Works', friendlyName: 'Original Contract Value', category: 'Income', tier: 2, keywords: ['ocw', 'original contract', 'contract value', 'original works'] },
  { itemCode: '1.2', dataType: 'Income - V.O. / Compensation Events', friendlyName: 'VO & Compensation Events', category: 'Income', tier: 2, keywords: ['vo', 'ce', 'variation order', 'compensation events', 'vo ce'] },
  { itemCode: '1.2.1', dataType: 'Income - V.O. / Compensation Events - -V.O. / C.E.', friendlyName: 'VO / CE Amount', category: 'Income', tier: 3, keywords: ['vo amount', 'ce amount', 'vo ce amount'] },
  { itemCode: '1.2.2', dataType: 'Income - V.O. / Compensation Events - -Fee of C.E.', friendlyName: 'CE Fee', category: 'Income', tier: 3, keywords: ['ce fee', 'fee of ce', 'compensation event fee'] },
  { itemCode: '1.3', dataType: 'Income - Provisional Sum', friendlyName: 'Provisional Sum', category: 'Income', tier: 2, keywords: ['ps', 'provisional sum', 'provisional', 'psum'] },
  { itemCode: '1.4', dataType: 'Income - Adjustment for Provisional Quantities', friendlyName: 'Remeasurement & PC Rate Adjustment', category: 'Income', tier: 2, keywords: ['remeasurement', 'pc rates', 'adjustment pq', 'remeas'] },
  { itemCode: '1.5', dataType: 'Income - NSC', friendlyName: 'NSC', category: 'Income', tier: 2, keywords: ['nsc', 'nominated sub contractor income', 'nsc income'] },
  { itemCode: '1.6', dataType: 'Income - Profit & Attendance', friendlyName: 'Profit & Attendance', category: 'Income', tier: 2, keywords: ['p&a', 'profit attendance', 'pa', 'patendance'] },
  { itemCode: '1.7', dataType: 'Income - Claims', friendlyName: 'Claims Income', category: 'Income', tier: 2, keywords: ['claims', 'claims income', 'income claims'] },
  { itemCode: '1.8', dataType: 'Income - Price Fluctuation / CPF', friendlyName: 'Price Fluctuation (CPF)', category: 'Income', tier: 2, keywords: ['cpf', 'price fluctuation', 'price fluctuation income'] },
  { itemCode: '1.9', dataType: 'Income - MPF Reimbursement', friendlyName: 'MPF Reimbursement', category: 'Income', tier: 2, keywords: ['mpf', 'mpf reimbursement', 'mpf repay'] },
  { itemCode: '1.10', dataType: 'Income - SA', friendlyName: 'Special Account Income', category: 'Income', tier: 2, keywords: ['sa', 'special account', 'sa income'] },
  { itemCode: '1.11', dataType: 'Income - CSD', friendlyName: 'CSD Income', category: 'Income', tier: 2, keywords: ['csd', 'csd income'] },
  { itemCode: '1.12', dataType: 'Income - Other Revenue', friendlyName: 'Other Revenue & Pain/Gain Share', category: 'Income', tier: 2, keywords: ['other revenue', 'pain gain', 'pgs', 'pain gain sharing', 'other rev'] },
  { itemCode: '1.12.1', dataType: 'Income - Other Revenue - -Other Revenue', friendlyName: 'Other Revenue', category: 'Income', tier: 3, keywords: ['other revenue detail', 'other rev detail'] },
  { itemCode: '1.12.2', dataType: 'Income - Other Revenue - -Pain Gain Sharing', friendlyName: 'Pain/Gain Share', category: 'Income', tier: 3, keywords: ['pain gain', 'pgs', 'pain gain sharing', 'pgs income'] },
  { itemCode: '1.13', dataType: 'Income - Less :LD', friendlyName: 'Liquidated Damages', category: 'Income', tier: 2, keywords: ['ld', 'liquidated damages', 'ld income', 'damages'] },
  { itemCode: '1.14', dataType: 'Income - Less :Retention Money', friendlyName: 'Retention', category: 'Income', tier: 2, keywords: ['retention', 'retention income', 'ret money'] },
  { itemCode: '1.15', dataType: 'Income - Less :Retention Money (NSC)', friendlyName: 'NSC Retention', category: 'Income', tier: 2, keywords: ['nsc retention', 'retention nsc'] },
  { itemCode: '1.16', dataType: 'Income - Partialing Income Total', friendlyName: 'Partialing Income', category: 'Income', tier: 2, keywords: ['partialing income', 'partial income'] },
  { itemCode: '1.17', dataType: 'Income - Advance Payment', friendlyName: 'Advance Payment', category: 'Income', tier: 2, keywords: ['advance payment', 'advance', 'adv payment'] },
  { itemCode: '2', dataType: 'Less : Cost', friendlyName: 'Total Cost', category: 'Cost', tier: 1, keywords: ['cost', 'total cost', 'less cost', 'item 2'] },
  { itemCode: '2.1', dataType: 'Less : Cost - Preliminaries', friendlyName: 'Preliminaries', category: 'Cost', tier: 2, keywords: ['prelim', 'preliminary', 'preliminaries', 'total prelim', 'prelims'] },
  { itemCode: '2.1.1', dataType: 'Less : Cost - Preliminaries - -Manpower (Mgt. & Supervision)', friendlyName: 'Management & Supervision', category: 'Cost', tier: 3, keywords: ['mgt supervision', 'management staff', 'supervision', 'mgmt staff', 'mgt & sup'] },
  { itemCode: '2.1.2', dataType: 'Less : Cost - Preliminaries - -Manpower (RE)', friendlyName: 'Resident Engineer Staff', category: 'Cost', tier: 3, keywords: ['re', 'resident engineer', 're staff', 're manpower'] },
  { itemCode: '2.1.3', dataType: 'Less : Cost - Preliminaries - -Manpower (Labour)', friendlyName: 'Prelim Labour', category: 'Cost', tier: 3, keywords: ['prelim labour', 'prelim labor', 'labour prelim', 'preliminary labour'] },
  { itemCode: '2.1.4', dataType: 'Less : Cost - Preliminaries - -Adm. Cost one off item', friendlyName: 'Insurance & Bond', category: 'Cost', tier: 3, keywords: ['insurance', 'bond', 'insurance bond', 'one off', 'adm cost one off'] },
  { itemCode: '2.1.5', dataType: 'Less : Cost - Preliminaries - -Adm. Cost Others', friendlyName: 'Site Overhead & RE', category: 'Cost', tier: 3, keywords: ['site overhead', 'general overhead', 'adm others', 'adm cost others'] },
  { itemCode: '2.1.6', dataType: 'Less : Cost - Preliminaries - -Adm. Cost Financial Cost', friendlyName: 'Interest & Bank Charges', category: 'Cost', tier: 3, keywords: ['interest', 'bank charge', 'tr interest', 'financial cost', 'adm financial'] },
  { itemCode: '2.1.7', dataType: 'Less : Cost - Preliminaries - -Adm. Cost Messing', friendlyName: 'Messing / Canteen', category: 'Cost', tier: 3, keywords: ['messing', 'canteen', 'adm messing'] },
  { itemCode: '2.1.8', dataType: 'Less : Cost - Preliminaries - -DSC', friendlyName: 'DSC', category: 'Cost', tier: 3, keywords: ['dsc', 'dsc prelim'] },
  { itemCode: '2.1.9', dataType: 'Less : Cost - Preliminaries - -General Material', friendlyName: 'General Materials', category: 'Cost', tier: 3, keywords: ['general material', 'general materials prelim'] },
  { itemCode: '2.1.10', dataType: 'Less : Cost - Preliminaries - -Plant', friendlyName: 'Prelim Plant', category: 'Cost', tier: 3, keywords: ['prelim plant', 'plant prelim'] },
  { itemCode: '2.1.11', dataType: 'Less : Cost - Preliminaries - -JV Partner Management Fee', friendlyName: 'JV Management Fee', category: 'Cost', tier: 3, keywords: ['jv fee', 'jv management', 'jv partner fee'] },
  { itemCode: '2.1.12', dataType: 'Less : Cost - Preliminaries - -Potential Savings', friendlyName: 'Prelim Savings', category: 'Cost', tier: 3, keywords: ['prelim savings', 'savings prelim', 'potential savings prelim'] },
  { itemCode: '2.1.13', dataType: 'Less : Cost - Preliminaries - -Manpower (HO-Consultant)', friendlyName: 'HO Consultant Staff', category: 'Cost', tier: 3, keywords: ['ho consultant', 'consultant staff', 'ho consultant staff'] },
  { itemCode: '2.1.14', dataType: 'Less : Cost - Preliminaries - -Adm. Cost (Levies)', friendlyName: 'Levies', category: 'Cost', tier: 3, keywords: ['levies', 'levy', 'adm levies'] },
  { itemCode: '2.2', dataType: 'Less : Cost - Materials', friendlyName: 'Total Materials', category: 'Cost', tier: 2, keywords: ['materials', 'material', 'material cost', 'total materials'] },
  { itemCode: '2.2.1', dataType: 'Less : Cost - Materials - -Concrete', friendlyName: 'Concrete', category: 'Cost', tier: 3, keywords: ['concrete', 'concrete material'] },
  { itemCode: '2.2.2', dataType: 'Less : Cost - Materials - -Reinforcement', friendlyName: 'Rebar', category: 'Cost', tier: 3, keywords: ['rebar', 'reinforcement', 'rebar material'] },
  { itemCode: '2.2.3', dataType: 'Less : Cost - Materials - -Tile, Granite & Marble', friendlyName: 'Tile/Granite/Marble', category: 'Cost', tier: 3, keywords: ['tile', 'granite', 'marble', 'tgm'] },
  { itemCode: '2.2.4', dataType: 'Less : Cost - Materials - -Temporary Work', friendlyName: 'Temp Works (Steel & Sheet Piles)', category: 'Cost', tier: 3, keywords: ['temp work', 'temporary work', 'structural steel', 'sheet piles'] },
  { itemCode: '2.2.5', dataType: 'Less : Cost - Materials - -Structural Steel Member', friendlyName: 'Structural Steel', category: 'Cost', tier: 3, keywords: ['structural steel', 'steel member', 'ss member'] },
  { itemCode: '2.2.9', dataType: 'Less : Cost - Materials - -MVAC', friendlyName: 'MVAC Materials', category: 'Cost', tier: 3, keywords: ['mvac', 'mvac material'] },
  { itemCode: '2.2.10', dataType: 'Less : Cost - Materials - -Electrical', friendlyName: 'Electrical Materials', category: 'Cost', tier: 3, keywords: ['electrical', 'electrical material'] },
  { itemCode: '2.2.13', dataType: 'Less : Cost - Materials - -Others Material Cost', friendlyName: 'Other Materials', category: 'Cost', tier: 3, keywords: ['other materials', 'others material', 'misc material'] },
  { itemCode: '2.2.15', dataType: 'Less : Cost - Materials - -Potential Savings', friendlyName: 'Material Savings', category: 'Cost', tier: 3, keywords: ['material savings', 'savings material', 'potential savings material'] },
  { itemCode: '2.3', dataType: 'Less : Cost - Plant & Machinery', friendlyName: 'Total Plant & Machinery', category: 'Cost', tier: 2, keywords: ['plant', 'machinery', 'plant machinery', 'all plant', 'total plant', 'p&m'] },
  { itemCode: '2.3.1', dataType: 'Less : Cost - Plant & Machinery - -Plant (internal)', friendlyName: 'Internal Plant Hire', category: 'Cost', tier: 3, keywords: ['internal hire', 'internal plant', 'plant internal'] },
  { itemCode: '2.3.2', dataType: 'Less : Cost - Plant & Machinery - -Plant (external)', friendlyName: 'External Plant Hire', category: 'Cost', tier: 3, keywords: ['external hire', 'external plant', 'plant external'] },
  { itemCode: '2.3.3', dataType: 'Less : Cost - Plant & Machinery - -Diesel & Lubricant', friendlyName: 'Fuel & Lubricant', category: 'Cost', tier: 3, keywords: ['diesel', 'lubricant', 'fuel', 'diesel lubricant'] },
  { itemCode: '2.3.7', dataType: 'Less : Cost - Plant & Machinery - -Depreciation', friendlyName: 'Plant Depreciation', category: 'Cost', tier: 3, keywords: ['depreciation', 'plant depreciation'] },
  { itemCode: '2.4', dataType: 'Less : Cost - Subcontractor', friendlyName: 'Total Subcontractor', category: 'Cost', tier: 2, keywords: ['subcon', 'sub', 'subbie', 'subcontractor', 'subcontractors', 'total subcon'] },
  { itemCode: '2.4.1', dataType: 'Less : Cost - Subcontractor - -Contract Works', friendlyName: 'Subcontractor Contract Works', category: 'Cost', tier: 3, keywords: ['contract works', 'cw', 'subcon cw', 'subbie cw', 'subcon contract works'] },
  { itemCode: '2.4.2', dataType: 'Less : Cost - Subcontractor - -Variation', friendlyName: 'Subcontractor Variations', category: 'Cost', tier: 3, keywords: ['variation', 'vo', 'subcon vo', 'subbie vo', 'subbie variation', 'subcon variation', 'variations'] },
  { itemCode: '2.4.3', dataType: 'Less : Cost - Subcontractor - -Claim', friendlyName: 'Subcontractor Claims', category: 'Cost', tier: 3, keywords: ['claim', 'claims', 'subcon claim', 'subbie claim'] },
  { itemCode: '2.4.4', dataType: 'Less : Cost - Subcontractor - -Contra Charge', friendlyName: 'Contra Charges', category: 'Cost', tier: 3, keywords: ['contra', 'contra charge', 'cc'] },
  { itemCode: '2.4.5', dataType: 'Less : Cost - Subcontractor - -Down Payment', friendlyName: 'Subcontractor Down Payment', category: 'Cost', tier: 3, keywords: ['down payment', 'dp', 'subcon dp'] },
  { itemCode: '2.4.6', dataType: 'Less : Cost - Subcontractor - -Retention', friendlyName: 'Subcontractor Retention', category: 'Cost', tier: 3, keywords: ['retention', 'subcon retention', 'ret subcon'] },
  { itemCode: '2.4.8', dataType: 'Less : Cost - Subcontractor - -Commercial Settlement', friendlyName: 'Commercial Settlement', category: 'Cost', tier: 3, keywords: ['commercial settlement', 'settlement', 'comm settlement'] },
  { itemCode: '2.5', dataType: 'Less : Cost - Manpower (Labour)', friendlyName: 'Direct Labour', category: 'Cost', tier: 2, keywords: ['labour', 'labor', 'direct labour', 'manpower labour', 'mp labour'] },
  { itemCode: '2.6', dataType: 'Less : Cost - Nominated Package', friendlyName: 'Total Nominated Package', category: 'Cost', tier: 2, keywords: ['nominated package', 'nom package', 'np'] },
  { itemCode: '2.7', dataType: 'Less : Cost - Allow for Contingencies', friendlyName: 'Contingency Reserve', category: 'Cost', tier: 2, keywords: ['contingency', 'contingency reserve'] },
  { itemCode: '2.11', dataType: 'Less : Cost - Incentive / POR Bonus', friendlyName: 'Incentive & POR Bonus', category: 'Cost', tier: 2, keywords: ['incentive', 'por bonus', 'bonus', 'incentive bonus'] },
  { itemCode: '3', dataType: 'Gross Profit (Item 1.0-2.0) (Financial A/C)', friendlyName: 'Gross Profit', category: 'Summary', tier: 1, keywords: ['gp', 'gross profit', 'profit', 'item 3'] },
  { itemCode: '4', dataType: 'Reconciliation', friendlyName: 'Total Reconciliation', category: 'Reconciliation', tier: 1, keywords: ['reconciliation', 'recon', 'total recon'] },
  { itemCode: '4.1', dataType: 'Reconciliation - Internal Interest', friendlyName: 'Internal Interest Adjustment', category: 'Reconciliation', tier: 2, keywords: ['internal interest', 'interest adjustment', 'interest recon'] },
  { itemCode: '4.3', dataType: 'Reconciliation - Total Adjustment', friendlyName: 'Total Adjustments (Recon)', category: 'Reconciliation', tier: 2, keywords: ['total adjustment', 'recon adjustment'] },
  { itemCode: '5', dataType: 'Gross Profit (Item 3.0-4.3)', friendlyName: 'Gross Profit (after recon & overhead)', category: 'Summary', tier: 1, keywords: ['gp after recon', 'net gp', 'gp after overhead', 'item 5'] },
  { itemCode: '6', dataType: 'Overhead', friendlyName: 'Total Overhead', category: 'Overhead', tier: 1, keywords: ['overhead', 'oh', 'total overhead'] },
  { itemCode: '6.1', dataType: 'Overhead - HO Overhead Rate %', friendlyName: 'HO Overhead Rate', category: 'Overhead', tier: 2, keywords: ['ho overhead rate', 'overhead rate', 'oh rate'] },
  { itemCode: '6.1.1', dataType: 'Overhead - HO Overhead Rate % - HO Overhead (6%)', friendlyName: 'HO Overhead (6%)', category: 'Overhead', tier: 3, keywords: ['ho overhead 6%', 'ho oh', 'head office overhead'] },
  { itemCode: '6.1.2', dataType: 'Overhead - HO Overhead Rate % - BU Overhead (1%)', friendlyName: 'BU Overhead', category: 'Overhead', tier: 3, keywords: ['bu overhead', 'bu oh', 'business unit overhead'] },
  { itemCode: '7', dataType: 'Acc. Net Profit/(Loss)', friendlyName: 'Accumulated Net Profit/Loss', category: 'Summary', tier: 1, keywords: ['np', 'net profit', 'net loss', 'item 7'] },
]

let cached: ConfigMappings | null = null

export function getConfig(): ConfigMappings {
  if (cached) return cached

  const ftypeByKeyword = new Map<string, FinancialTypeEntry>()
  for (const entry of FINANCIAL_TYPES) {
    for (const kw of entry.keywords) {
      if (!ftypeByKeyword.has(kw)) {
        ftypeByKeyword.set(kw, entry)
      }
    }
  }

  const dtypeByKeyword = new Map<string, DataTypeEntry>()
  for (const entry of DATA_TYPES) {
    for (const kw of entry.keywords) {
      if (ftypeByKeyword.has(kw)) continue
      if (!dtypeByKeyword.has(kw)) {
        dtypeByKeyword.set(kw, entry)
      }
    }
  }

  const dtypeByItemCode = new Map<string, DataTypeEntry>()
  for (const entry of DATA_TYPES) {
    if (entry.itemCode) {
      dtypeByItemCode.set(entry.itemCode, entry)
    }
  }

  const cleanToRaw = new Map<string, string[]>()
  for (const entry of FINANCIAL_TYPES) {
    const existing = cleanToRaw.get(entry.cleanType) ?? []
    if (entry.rawType && !existing.includes(entry.rawType)) existing.push(entry.rawType)
    if (!existing.includes(entry.cleanType)) existing.push(entry.cleanType)
    cleanToRaw.set(entry.cleanType, existing)
  }

  cached = { financialTypes: FINANCIAL_TYPES, dataTypes: DATA_TYPES, ftypeByKeyword, dtypeByKeyword, dtypeByItemCode, cleanToRaw }
  return cached
}

export function resetConfig(): void {
  cached = null
}

export function normaliseFinancialType(rawValue: string, cfg: ConfigMappings): string {
  const v = rawValue.trim()

  // 1. Direct clean type match
  const directClean = cfg.financialTypes.find(e => e.cleanType === v)
  if (directClean) return directClean.cleanType

  // 2. Direct raw type match
  const directRaw = cfg.financialTypes.find(e => e.rawType === v)
  if (directRaw) return directRaw.cleanType

  // 3. Substring match (rawType contains data value)
  const subMatch = cfg.financialTypes.find(e =>
    e.rawType && e.rawType.toLowerCase().includes(v.toLowerCase()) && v.length > 3
  )
  if (subMatch) return subMatch.cleanType

  // 4. Reverse: data value contains rawType
  const revMatch = cfg.financialTypes.find(e =>
    e.rawType && v.toLowerCase().includes(e.rawType.toLowerCase()) && e.rawType.length > 3
  )
  if (revMatch) return revMatch.cleanType

  return v
}