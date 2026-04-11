import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConfig, normaliseFinancialType } from '@/lib/config/mappings'
import { runQuery } from '@/lib/pipeline/index'
import { tokenize } from '@/lib/pipeline/tokenizer'
import { classify } from '@/lib/pipeline/classifier'
import { resolve } from '@/lib/pipeline/resolver'
import { handleAnalyze } from '@/lib/commands/analyze'
import { handleCompare } from '@/lib/commands/compare'
import { handleTrend } from '@/lib/commands/trend'
import { handleDetail } from '@/lib/commands/detail'
import { handleTotal } from '@/lib/commands/total'
import { handleList } from '@/lib/commands/list'
import { handleRisk } from '@/lib/commands/risk'
import { handleCashFlow } from '@/lib/commands/cashflow'
import { handleShortcuts, handleType } from '@/lib/commands/shortcuts'
import type { DetailContext } from '@/lib/pipeline/formatter'
import type { FinancialRow } from '@/lib/data/types'

export const dynamic = 'force-dynamic'
const API_VERSION = 'v6-paginated'

const sessionContexts = new Map<string, DetailContext>()

function makeClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Paginate through ALL rows - Supabase default page is 1000
async function loadAllRows(client: ReturnType<typeof makeClient>, projectId: string, year?: number, month?: number): Promise<any[]> {
  const pageSize = 1000
  let allData: any[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let q = client.from('financial_data').select('*').eq('project_id', projectId).range(offset, offset + pageSize - 1)
    if (year !== undefined) q = q.eq('year', year)
    if (month !== undefined) q = q.eq('month', month)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) { hasMore = false; break }
    allData = allData.concat(data)
    if (data.length < pageSize) { hasMore = false; break }
    offset += pageSize
  }
  return allData
}

function mapRows(data: any[]): FinancialRow[] {
  const cfg = getConfig()
  return data.map((row: any) => ({
    year: String(row.year),
    month: String(row.month),
    sheetName: row.sheet_name,
    financialType: normaliseFinancialType(row.raw_financial_type || row.financial_type, cfg),
    rawFinancialType: row.raw_financial_type || row.financial_type,
    itemCode: row.item_code,
    friendlyName: row.friendly_name,
    category: row.category,
    value: String(row.value ?? row.raw_value ?? ''),
    matchStatus: row.match_status || '',
    sourceFile: row.source_file || '',
    sourceSubfolder: '',
  }))
}

function calcMetrics(rows: FinancialRow[]) {
  const gp = (term: string) => rows
    .filter(r => r.sheetName === 'Financial Status' && r.rawFinancialType.toLowerCase().includes(term) && r.itemCode === '3')
    .reduce((s, r) => s + (parseFloat(r.value) || 0), 0)
  const gen = (item: string) => rows.find(r => r.sheetName === 'Financial Status' && r.financialType === 'General' && r.itemCode === item)?.value ?? ''
  return {
    'Business Plan GP': gp('business plan'),
    'Projected GP': gp('projection'),
    'WIP GP': gp('audit report'),
    'Cash Flow': gp('cash flow'),
    'Start Date': gen('Start Date'),
    'Complete Date': gen('Complete Date'),
    'Target Complete Date': gen('Target Complete Date'),
    'Time Consumed (%)': gen('Time Consumed (%)'),
    'Target Completed (%)': gen('Target Completed (%)'),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'getStructure') {
      const client = makeClient()
      const { data: projectData, error: projErr } = await client.from('projects').select('*')
      if (projErr) console.error('getStructure projects error:', projErr)
      const { data: viewData, error: viewErr } = await client.from('latest_month_per_project').select('project_id, year, month')
      if (viewErr) console.error('getStructure view error:', viewErr)
      // Build year→months folder structure for the frontend
      const folders: any = {}
      const projects: any = {}
      const yearMonthSet = new Set<string>()
      for (const v of (viewData || [])) {
        const proj = (projectData || []).find((p: any) => p.id === v.project_id)
        if (proj) {
          const y = String(v.year)
          const m = String(v.month)
          yearMonthSet.add(`${y}-${m}`)
          // Clean name: strip 'Financial Report YYYY-MM' suffix
          let displayName = (proj.name || '').replace(/\s*Financial Report\s+\d{4}-\d{2}$/, '').trim() || proj.code || v.project_id
          projects[v.project_id] = { id: v.project_id, code: proj.code || v.project_id, name: displayName, year: y, month: m, filename: v.project_id }
        }
      }
      // Build year→months from all available year/month combos
      for (const ym of yearMonthSet) {
        const [y, m] = ym.split('-')
        if (!folders[y]) folders[y] = []
        if (!folders[y].includes(m)) folders[y].push(m)
      }
      return Response.json({ folders, projects, version: API_VERSION })
    }

    if (action === 'loadProject') {
      const { projectId, year, month } = body
      const client = makeClient()
      const rawRows = await loadAllRows(client, projectId, year, month)
      const rows = mapRows(rawRows)
      const metrics = calcMetrics(rows)
      const finStatus = rows.filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3')
      return Response.json({
        version: API_VERSION,
        metrics,
        debug: {
          totalRows: rows.length,
          finStatusCount: finStatus.length,
          finStatusTypes: finStatus.map(r => r.rawFinancialType),
          usingServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      })
    }

    if (action === 'metrics') {
      const { projectId, year, month } = body
      const client = makeClient()
      const rawRows = await loadAllRows(client, projectId, year, month)
      const rows = mapRows(rawRows)
      return Response.json({ metrics: calcMetrics(rows), version: API_VERSION })
    }

    if (action === 'query') {
      const { projectId, year, month, question, context: rawContext } = body
      const client = makeClient()
      const rawRows = await loadAllRows(client, projectId, year, month)
      const rows = mapRows(rawRows)
      const context: DetailContext | null = rawContext ?? sessionContexts.get(projectId) ?? null
      const q = question.trim().toLowerCase()
      const resp = await dispatchQuery(q, rows, context, projectId)
      return Response.json({ ...resp, version: API_VERSION })
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[API error]', err)
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

async function dispatchQuery(q: string, rows: FinancialRow[], context: DetailContext | null, projectId: string) {
  if (q === 'shortcuts' || q === 'help') return { response: handleShortcuts(), candidates: [] }
  if (q === 'type' || q === 'types') return { response: handleType(), candidates: [] }
  if (q === 'analyze' || q === 'analyse') return { response: handleAnalyze(rows), candidates: [] }
  if (q === 'risk') return { response: handleRisk(rows), candidates: [] }
  if (q === 'cash flow' || q === 'cashflow' || q === 'cf') return { response: handleCashFlow(rows), candidates: [] }
  const tokens = classify(tokenize(q))
  const resolved = resolve(tokens)
  if (resolved.command === 'compare') return { response: handleCompare(rows, resolved), candidates: [] }
  if (resolved.command === 'trend') return { response: handleTrend(rows, resolved), candidates: [] }
  if (resolved.command === 'list') return { response: handleList(rows, q.replace(/^list\s*/, '').trim() || undefined), candidates: [] }
  if (resolved.command === 'total') return { response: handleTotal(rows, q.replace(/^total\s*/, '').trim()), candidates: [] }
  if (resolved.command === 'detail') {
    const result = handleDetail(rows, q.replace(/^detail\s*/, '').trim() || undefined, context)
    if (result.context) sessionContexts.set(projectId, result.context)
    return { response: result.response, candidates: [], context: result.context }
  }
  const result = runQuery(q, rows)
  if (result.context) sessionContexts.set(projectId, result.context)
  return { response: result.response, candidates: result.candidates, context: result.context }
}
