import fs from 'fs'
import path from 'path'
import { parseCSV } from '../config/loader'
import { getConfig, normaliseFinancialType } from '../config/mappings'
import type { FinancialRow, ProjectInfo, FolderStructure, Metrics } from './types'

const DATA_ROOT = '/mnt/g/My Drive/Ai Chatbot Knowledge Base'

// Module-level cache keyed by absolute file path
const rowCache = new Map<string, FinancialRow[]>()

export function scanStructure(): { folders: FolderStructure; projects: Record<string, ProjectInfo> } {
  const folders: FolderStructure = {}
  const projects: Record<string, ProjectInfo> = {}

  if (!fs.existsSync(DATA_ROOT)) {
    throw new Error(`Data root not found: ${DATA_ROOT}`)
  }

  const yearDirs = fs.readdirSync(DATA_ROOT).filter(d => /^\d{4}$/.test(d))
  for (const year of yearDirs) {
    const yearPath = path.join(DATA_ROOT, year)
    const stat = fs.statSync(yearPath)
    if (!stat.isDirectory()) continue

    const monthDirs = fs.readdirSync(yearPath).filter(d => /^\d{1,2}$/.test(d))
    if (monthDirs.length === 0) continue
    folders[year] = monthDirs

    for (const month of monthDirs) {
      const monthPath = path.join(DATA_ROOT, year, month)
      if (!fs.statSync(monthPath).isDirectory()) continue

      const csvFiles = fs.readdirSync(monthPath).filter(f => f.endsWith('_flat_v5.csv'))
      for (const file of csvFiles) {
        const info = parseProjectFilename(file, year, month)
        if (info) {
          const key = `${info.code} - ${info.name}`
          projects[key] = info
        }
      }
    }
  }

  return { folders, projects }
}

function parseProjectFilename(filename: string, year: string, month: string): ProjectInfo | null {
  // Pattern: "1014 PolyU Financial Report 2026-02_flat_v5.csv"
  //          "1014 Name Report YYYY-MM_flat_v5.csv"
  const match = filename.match(/^(\d+)\s+(.+?)\s+Financial Report \d{4}-\d{2}_flat_v5\.csv$/)
  if (!match) {
    // Fallback: "1036 Financial Report 2026-02_flat_v5.csv" (no name)
    const fallback = filename.match(/^(\d+)\s+Financial Report \d{4}-\d{2}_flat_v5\.csv$/)
    if (fallback) {
      return { code: fallback[1], name: fallback[1], year, month, filename }
    }
    return null
  }
  return { code: match[1], name: match[2], year, month, filename }
}

export function loadProjectData(year: string, month: string, filename: string): FinancialRow[] {
  const filePath = path.join(DATA_ROOT, year, month, filename)
  if (rowCache.has(filePath)) return rowCache.get(filePath)!

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)
  if (rows.length < 2) return []

  const header = rows[0]
  const yearIdx = header.indexOf('Year')
  const monthIdx = header.indexOf('Month')
  const sheetIdx = header.indexOf('Sheet_Name')
  const ftypeIdx = header.indexOf('Financial_Type')
  const itemCodeIdx = header.indexOf('Item_Code')
  const friendlyIdx = header.indexOf('Friendly_Name')
  const categoryIdx = header.indexOf('Category')
  const valueIdx = header.indexOf('Value')
  const matchIdx = header.indexOf('Match_Status')
  const srcFileIdx = header.indexOf('_source_file')
  const srcSubIdx = header.indexOf('_source_subfolder')

  const cfg = getConfig()
  const result: FinancialRow[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 4) continue

    const rawFType = row[ftypeIdx]?.trim() ?? ''
    const normFType = normaliseFinancialType(rawFType, cfg)

    result.push({
      year: row[yearIdx]?.trim() ?? year,
      month: row[monthIdx]?.trim() ?? month,
      sheetName: row[sheetIdx]?.trim() ?? '',
      financialType: normFType,
      rawFinancialType: rawFType,
      itemCode: row[itemCodeIdx]?.trim() ?? '',
      friendlyName: row[friendlyIdx]?.trim() ?? '',
      category: row[categoryIdx]?.trim() ?? '',
      value: row[valueIdx]?.trim() ?? '',
      matchStatus: row[matchIdx]?.trim() ?? '',
      sourceFile: row[srcFileIdx]?.trim() ?? '',
      sourceSubfolder: row[srcSubIdx]?.trim() ?? '',
    })
  }

  rowCache.set(filePath, result)
  return result
}

export function computeMetrics(rows: FinancialRow[]): Metrics {
  const getValue = (sheet: string, ftype: string, item: string): number => {
    const row = rows.find(r =>
      r.sheetName === sheet &&
      r.financialType === ftype &&
      r.itemCode === item
    )
    return parseFloat(row?.value ?? '0') || 0
  }

  const getGeneral = (item: string): string => {
    const row = rows.find(r => r.sheetName === 'Financial Status' && r.financialType === 'General' && r.itemCode === item)
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
