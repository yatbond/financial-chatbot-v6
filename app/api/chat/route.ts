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
const API_VERSION = 'v6-direct-query'

const sessionContexts = new Map<string, DetailContext>()

function makeClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  console.log('makeClient: serviceRole=', !!process.env.SUPABASE_SERVICE_ROLE_KEY, 'keyLen=', key.length)
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function loadRows(projectId: string, year?: number, month?: number): Promise<FinancialRow[]> {
  const client = makeClient()
  const cfg = getConfig()
  let q = client.from('financial_data').select('*').eq('project_id', projectId)
  if (year !== undefined) q = q.eq('year', year)
  if (month !== undefined) q = q.eq('month', month)
  const { data, error } = await q.limit(10000)
  if (error) throw new Error(error.message)
  if (!data) return []
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
      const { data: projectData } = await client.from('projects').select('*')
      const { data: viewData } = await client.from('latest_month_per_project').select('project_id, year, month')
      const folders: any = {}
      const projects: any = {}
      for (const v of (viewData || [])) {
        const proj = (projectData || []).find((p: any) => p.project_id === v.project_id)
        if (proj) {
          projects[v.project_id] = { id: v.project_id, code: proj.project_code || v.project_id, name: proj.project_name, year: String(v.year), month: String(v.month), filename: v.project_id }
          const folder = proj.folder_name || 'Uncategorized'
          if (!folders[folder]) folders[folder] = []
          folders[folder].push(v.project_id)
        }
      }
      return Response.json({ folders, projects, version: API_VERSION })
    }

    if (action === 'loadProject') {
      const { projectId, year, month } = body
      const rows = await loadRows(projectId, year, month)
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
      const rows = await loadRows(projectId, year, month)
      return Response.json({ metrics: calcMetrics(rows), version: API_VERSION })
    }

    if (action === 'query') {
      const { projectId, year, month, question, context: rawContext } = body
      const rows = await loadRows(projectId, year, month)
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
