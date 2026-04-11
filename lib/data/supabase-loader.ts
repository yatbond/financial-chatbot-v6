import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getConfig, normaliseFinancialType } from '../config/mappings'
import type { FinancialRow, ProjectInfo, FolderStructure, Metrics } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

  const { data, error } = await client.from('projects').select('*')
  if (error) throw new Error(`Failed to load projects: ${error.message}`)

  for (const p of data) {
    const key = `${p.code} - ${p.name}`
    projects[key] = {
      id: p.id,
      code: p.code,
      name: p.name,
      year: '',   // filled from financial_data
      month: '',
      filename: '', // not needed for Supabase
    }
  }

  // Get available year/month combos
  const { data: monthData } = await client
    .from('financial_data')
    .select('year, month')
    .order('year', { ascending: true })
    .order('month', { ascending: true })

  if (monthData) {
    const seen = new Set<string>()
    for (const m of monthData) {
      const y = String(m.year)
      const mo = String(m.month)
      const key = `${y}-${mo}`
      if (!seen.has(key)) {
        seen.add(key)
        if (!folders[y]) folders[y] = []
        if (!folders[y].includes(mo)) folders[y].push(mo)
        // Update project entries with year/month
        for (const p of Object.values(projects)) {
          if (!p.year) { p.year = y; p.month = mo; }
        }
      }
    }
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

  let query = client
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)

  if (year !== undefined) query = query.eq('year', year)
  if (month !== undefined) query = query.eq('month', month)

  const { data, error } = await query
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

  const getValue = (sheet: string, ftype: string, item: string): number => {
    const row = rows.find(r =>
      r.sheetName === sheet &&
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
    'Cash Flow': getValue('Financial Status', 'Cash Flow', '7'),
    'Start Date': getGeneral('Start Date'),
    'Complete Date': getGeneral('Complete Date'),
    'Target Complete Date': getGeneral('Target Complete Date'),
    'Time Consumed (%)': getGeneral('Time Consumed (%)'),
    'Target Completed (%)': getGeneral('Target Completed (%)'),
  }
}