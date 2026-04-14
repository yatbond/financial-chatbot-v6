import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getConfig, normaliseFinancialType } from '../config/mappings'
import type { FinancialRow, ProjectInfo, FolderStructure, Metrics } from './types'

// Use service role key on server-side (bypasses RLS), anon key as fallback
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
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
  if (rowCache.has(cacheKey)) return rowCache.get(cacheKey)!

  const client = getSupabase()
  const cfg = getConfig()

  // Fetch snapshot data (data_month IS NULL) for the project
  let query = client
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)
    .is('data_month', null)  // Financial Status snapshots only

  if (year !== undefined) query = query.eq('report_year', year)
  if (month !== undefined) query = query.eq('report_month', month)

  const { data, error } = await query.limit(10000)
  if (error) throw new Error(`Failed to load project data: ${error.message}`)
  if (!data || data.length === 0) return []

  const result: FinancialRow[] = data.map((row: any) => {
    const normFType = normaliseFinancialType(row.raw_financial_type || row.financial_type, cfg)
    return {
      year: String(row.report_year),
      month: String(row.report_month),
      sheetName: row.sheet_name || 'Financial Status',
      financialType: normFType,
      rawFinancialType: row.raw_financial_type || row.financial_type,
      itemCode: row.item_code,
      friendlyName: row.friendly_name || '',
      category: row.category || '',
      value: String(row.value ?? row.raw_value ?? ''),
      matchStatus: row.match_status || '',
      sourceFile: row.source_file || '',
      sourceSubfolder: '',
      dataMonth: row.data_month ? String(row.data_month) : null,
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

  const getValue = (sheet: string, ftype: string, item: string): number => {
    const row = rows.find(r =>
      (r.sheetName === sheet || r.sheetName === ftype) &&
      r.financialType === ftype &&
      r.itemCode === item
    )
    return parseFloat(row?.value ?? '0') || 0
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
    'Business Plan GP': getValue('Financial Status', 'Business Plan', '3'),
    'Projected GP': getValue('Financial Status', 'Projection', '3'),
    'WIP GP': getValue('Financial Status', 'WIP', '3'),
    'Cash Flow': getValue('Financial Status', 'Cash Flow', '3'),
    'Start Date': getGeneral('Start Date'),
    'Complete Date': getGeneral('Complete Date'),
    'Target Complete Date': getGeneral('Target Complete Date'),
    'Time Consumed (%)': getGeneral('Time Consumed (%)'),
    'Target Completed (%)': getGeneral('Target Completed (%)'),
  }
}

/**
 * Load monthly data (Cash Flow, Projection, etc.) for a project
 * data_month is set (not NULL)
 */
export async function loadMonthlyDataSupabase(
  projectId: string,
  financialType: string,
  reportYear?: number,
  reportMonth?: number,
): Promise<FinancialRow[]> {
  const client = getSupabase()

  let query = client
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('financial_type', financialType)
    .not('data_month', 'is', null)  // monthly data only

  if (reportYear !== undefined) query = query.eq('report_year', reportYear)
  if (reportMonth !== undefined) query = query.eq('report_month', reportMonth)

  const { data, error } = await query.limit(10000)
  if (error) throw new Error(`Failed to load monthly data: ${error.message}`)
  if (!data || data.length === 0) return []

  return data.map((row: any) => ({
    year: String(row.report_year),
    month: String(row.report_month),
    sheetName: financialType,
    financialType: row.financial_type,
    rawFinancialType: row.financial_type,
    itemCode: row.item_code,
    friendlyName: row.friendly_name || '',
    category: row.category || '',
    value: String(row.value ?? row.raw_value ?? ''),
    matchStatus: row.match_status || '',
    sourceFile: row.source_file || '',
    sourceSubfolder: '',
    dataMonth: String(row.data_month),
  }))
}

/**
 * Get value change log for a project
 */
export async function getChangeLog(
  projectId: string,
  limit: number = 50,
): Promise<any[]> {
  const client = getSupabase()

  const { data, error } = await client
    .from('value_change_log')
    .select('*')
    .eq('project_id', projectId)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load change log: ${error.message}`)
  return data || []
}
