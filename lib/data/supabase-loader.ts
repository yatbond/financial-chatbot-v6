import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getConfig, normaliseFinancialType } from '../config/mappings'
import type { FinancialRow, ProjectInfo, FolderStructure, Metrics } from './types'

// Don't read env vars at module level - read them at request time
function getSupabase(): SupabaseClient {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  const SUPABASE_KEY = SUPABASE_SERVICE_ROLE || 
                       process.env.SUPABASE_ANON_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  console.log('getSupabase: serviceRole=', !!SUPABASE_SERVICE_ROLE, 'keyLen=', SUPABASE_KEY.length)
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function scanStructureSupabase(): Promise<{ folders: FolderStructure; projects: Record<string, ProjectInfo> }> {
  const client = getSupabase()
  const folders: FolderStructure = {}
  const projects: Record<string, ProjectInfo> = {}

  const { data: projectData, error: projError } = await client.from('projects').select('*')
  if (projError) throw new Error(`Failed to load projects: ${projError.message}`)

  const { data: viewData, error: viewError } = await client
    .from('latest_month_per_project')
    .select('project_id, year, month')
  if (viewError) throw new Error(`Failed to load view: ${viewError.message}`)

  for (const v of viewData) {
    const proj = projectData.find((p: any) => p.project_id === v.project_id)
    if (proj) {
      projects[v.project_id] = {
        id: v.project_id,
        code: proj.project_code || v.project_id,
        name: proj.project_name,
        year: String(v.year),
        month: String(v.month),
        filename: v.project_id,
      }
      const folder = proj.folder_name || 'Uncategorized'
      if (!folders[folder]) folders[folder] = []
      folders[folder].push(v.project_id)
    }
  }

  return { folders, projects }
}

export async function loadProjectDataSupabase(
  projectId: string,
  year?: number,
  month?: number,
): Promise<FinancialRow[]> {
  const client = getSupabase()
  const cfg = getConfig()

  console.log('loadProjectDataSupabase: project=', projectId, 'year=', year, 'month=', month)

  // Fetch data for this project
  let query = client
    .from('financial_data')
    .select('*')
    .eq('project_id', projectId)

  if (year !== undefined) query = query.eq('year', year)
  if (month !== undefined) query = query.eq('month', month)

  const { data, error } = await query.limit(10000)
  
  console.log('loadProjectDataSupabase: error=', error, 'dataLen=', data?.length)
  if (data && data.length > 0) {
    console.log('loadProjectDataSupabase: sample rows:', JSON.stringify(data.slice(0, 3)))
  }
  
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

  return result
}

export async function computeMetricsSupabase(
  projectId: string,
  year?: number,
  month?: number,
): Promise<Metrics> {
  const rows = await loadProjectDataSupabase(projectId, year, month)

  const finStatusRows = rows.filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3')
  console.log('computeMetricsSupabase: totalRows=', rows.length, 'finStatusRows=', finStatusRows.length)
  
  const allFinStatus = rows.filter(r => r.sheetName === 'Financial Status' && r.itemCode === '3')
  console.log('computeMetricsSupabase: allFinStatus raw types:', JSON.stringify(allFinStatus.map(r => r.rawFinancialType)))

  const gpFromFinStatus = (rawTypeContains: string): number => {
    const matches = rows.filter(r =>
      r.sheetName === 'Financial Status' &&
      r.rawFinancialType.toLowerCase().includes(rawTypeContains.toLowerCase()) &&
      r.itemCode === '3'
    )
    console.log('computeMetricsSupabase: gpFromFinStatus(', rawTypeContains, ') =', matches.length, 'rows')
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
}
