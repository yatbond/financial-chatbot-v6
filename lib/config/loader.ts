import fs from 'fs'
import path from 'path'
import type { FinancialTypeEntry, DataTypeEntry } from './types'

/** Minimal CSV parser that handles quoted fields with embedded commas/newlines. */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < content.length) {
    const ch = content[i]

    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"'
        i += 2
      } else if (ch === '"') {
        inQuotes = false
        i++
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ''
        i++
      } else if (ch === '\r' && content[i + 1] === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i += 2
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Final field/row
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export function loadFinancialTypeMap(): FinancialTypeEntry[] {
  const filePath = path.join(process.cwd(), 'config', 'financial_type_map.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)

  const entries: FinancialTypeEntry[] = []
  const header = rows[0]
  const rawIdx = header.indexOf('Raw_Financial_Type')
  const cleanIdx = header.indexOf('Clean_Financial_Type')
  const acronymIdx = header.indexOf('Acronyms')

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[cleanIdx] || row[cleanIdx].trim() === '') continue
    if (row[cleanIdx].startsWith('*')) continue   // *not used

    const rawType = row[rawIdx]?.trim() ?? ''
    const cleanType = row[cleanIdx].trim()
    const acronymStr = row[acronymIdx]?.trim() ?? ''
    const keywords = acronymStr
      ? acronymStr.split('|').map(k => k.trim().toLowerCase()).filter(Boolean)
      : []

    entries.push({ rawType, cleanType, keywords })
  }

  return entries
}

export function loadDataTypeMap(): DataTypeEntry[] {
  const filePath = path.join(process.cwd(), 'config', 'construction_headings_enriched.csv')
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)

  const entries: DataTypeEntry[] = []
  const header = rows[0]
  const itemCodeIdx = header.indexOf('Item_Code')
  const dataTypeIdx = header.indexOf('Data_Type')
  const friendlyIdx = header.indexOf('Friendly_Name')
  const categoryIdx = header.indexOf('Category')
  const tierIdx = header.indexOf('Tier')
  const acronymIdx = header.indexOf('Acronyms')

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[dataTypeIdx] && !row[friendlyIdx]) continue

    const itemCode = row[itemCodeIdx]?.trim() ?? ''
    const dataType = row[dataTypeIdx]?.trim() ?? ''
    const friendlyName = row[friendlyIdx]?.trim() ?? dataType
    const category = row[categoryIdx]?.trim() ?? ''
    const tier = parseInt(row[tierIdx] ?? '0') || 0
    const acronymStr = row[acronymIdx]?.trim() ?? ''
    const keywords = acronymStr
      ? acronymStr.split('|').map(k => k.trim().toLowerCase()).filter(Boolean)
      : []

    entries.push({ itemCode, dataType, friendlyName, category, tier, keywords })
  }

  return entries
}
