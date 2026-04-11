import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getConfig, normaliseFinancialType } from '../config/mappings'
import type { FinancialRow, ProjectInfo, FolderStructure, Metrics } from './types'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabase
}

// Module-level cache
const rowCache = new Map<string, FinancialRow[]>()

export async function scanStructureSupabase(): Promise<{ folders: FolderStructure; projects: Record<string, ProjectInfo> }> {
  const client = getSupabase()
  const folders: FolderStructure = {}
  const projects: Record<string, ProjectInfo> = {}

  // Fetch all projects
  const { data: projectData, error: projError } = await client.from('projects').select('*')
  if (projError) throw new Error(`Failed to load projects: ${projError.message}`)

  // Fetch latest year/month per project from view
  const { data: viewData, error: viewError } = await client
    .from('latest_month_per_project')
    .select('project_id, year, month')

  if (viewError) throw new Error(`Failed to load view: ${viewError.message}`)

  // Build a lookup: project_id -> {year, month}
  const projectMonthMap = new Map<string, { year: number; month: number }>()
  for (const v of viewData) {
    projectMonthMap.set(v.project_id, { year: v.year, month: v.month })
  }

  // Build projects and folders
  for (const p of projectData) {
    const key = `${p.code} - ${p.name}`
    const latest = projectMonthMap.get(p.id) || { year: 2026, month: 2 }

    projects[key] = {
      id: p.id,
      code: p.code,
      name: p.name,
      year: String(latest.year),
      month: String(latest.month),
      filename: '',
    }

    const y = String(latest.year)
    const m = String(latest.month)
    if (!folders[y]) folders[y] = []
    if (!folders[y].includes(m)) folders[y].push(m)
  }

  // Sort months within each year
  for (const y of Object.keys(folders)) {
    folders[y].sort((a, b) => parseInt(a) - parseInt(b))
  }

  return { folders, projects }
}

export async function loadProjectDataSupabase(
  projectId: string,
  year?: number,
  month?: number,
): Promise<FinancialRow[]> {
  const cacheKey = `${projectId}-${year}-${month}`
  if (rowCache.has(cacheKey)) {
    console.log('DEBUG: returning cached data for', cacheKey, 'rows:', rowCache.get(cacheKey)!.length)
    return rowCache.get(cacheKey)!
  }

  const client = getSupabase()
  const cfg = getConfig()

  console.log('DEBUG: Supabase query - project:', projectId, 'year:', year, 'month:', month)

  // Fetch data for this project with optional year/month filter
  let query = client
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)

  if (year !== undefined) query = query.eq('year', year)
  if (month !== undefined) query = query.eq('month', month)

  const { data, error } = await query.limit(10000)
  
  // DEBUG: include raw Supabase response in return
  const debugInfo = {
    error,
    dataLength: data?.length || 0,
    sampleRawTypes: data?.slice(0, 10).map((r: any) => r.raw_financial_type) || [],
  }
  console.log('DEBUG: Supabase response:', JSON.stringify(debugInfo))
  
  if (error) throw new Error(`Failed to load project data: ${error.message}`)
  if (!data || data.length === 0) return []

  const result: FinancialRow[] = data.map((row: any) => {
    const normFType = normaliseFinancialType(row.raw_financial_type || row.financial_type, cfg)
    return {
      year: String(row.year),
      month: String(row.month),
      sheetName: row.sheet_name,
      financialType: normFType,
      rawFinancialType: row.raw_financial_type || row.financial_type,
      itemCode: row.item_code,
      friendlyName: row.friendly_name,
      category: row.category,
      value: String(row.value ?? row.raw_value ?? ''),
      matchStatus: row.match_status || '',
      sourceFile: row.source_file || '',
      sourceSubfolder: '',
    }
  })

  rowCache.set(cacheKey, result)
  return result
}

export async function computeMetricsSupabase(
  projectId: string,
  year?: number,
  month?: number,
): Promise<Metrics> {
  const rows = await loadProjectDataSupabase(projectId, year, month)

  // DEBUG: log what we're working with
  const finStatusRows = rows.filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3')
  console.log('DEBUG computeMetricsSupabase: total rows:', rows.length, '| Financial Status item_code=3:', finStatusRows.length)
  console.log('DEBUG computeMetricsSupabase: rawFinancialType values:', JSON.stringify([...new Set(finStatusRows.map(r => r.rawFinancialType))]))
  for (const r of finStatusRows) {
    console.log('DEBUG row:', JSON.stringify({ sheet: r.sheetName, raw: r.rawFinancialType, norm: r.financialType, item: r.itemCode, val: r.value }))
  }

  // v5-compatible: ALL GP metrics come from Financial Status sheet
  // using includes() matching on rawFinancialType
  const gpFromFinStatus = (rawTypeContains: string): number => {
    const matches = rows.filter(r =>
      r.sheetName === 'Financial Status' &&
      r.rawFinancialType.toLowerCase().includes(rawTypeContains.toLowerCase()) &&
      r.itemCode === '3'
    )
    console.log(`DEBUG gpFromFinStatus('${rawTypeContains}'): found ${matches.length} matches`)
    return matches.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0)
  }

  const getGeneral = (item: string): string => {
    const row = rows.find(r =>
      r.sheetName === 'Financial Status' &&
      r.financialType === 'General' &&
      r.itemCode === item
    )
    return row?.value ?? ''
  }

  return {
    'Business Plan GP': gpFromFinStatus('business plan'),
    'Projected GP': gpFromFinStatus('projection'),
    'WIP GP': gpFromFinStatus('audit report'),
    'Cash Flow': gpFromFinStatus('cash flow'),
    'Start Date': getGeneral('Start Date'),
    'Complete Date': getGeneral('Complete Date'),
    'Target Complete Date': getGeneral('Target Complete Date'),
    'Time Consumed (%)': getGeneral('Time Consumed (%)'),
    'Target Completed (%)': getGeneral('Target Completed (%)'),
  }
}// rebuild trigger Sat Apr 11 14:05:39 HKT 2026
