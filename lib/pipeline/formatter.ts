import type { ScoredRow } from './scorer'
import type { ResolvedQuery } from './resolver'
import type { FinancialRow } from '../data/types'

export interface Candidate {
  id: number
  value: number
  score: number
  sheet: string
  financialType: string
  dataType: string
  itemCode: string
  month: string
  year: string
}

export interface DetailContext {
  itemCode: string
  sheetName: string
  financialType: string
  children: Array<{ code: string; name: string; value: number }>
}

export interface QueryResponse {
  response: string
  candidates: Candidate[]
  context?: DetailContext
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  return `$${sign}${Math.round(abs).toLocaleString()}`
}

export function format(
  scored: ScoredRow[],
  query: ResolvedQuery,
  allRows: FinancialRow[],
): QueryResponse {
  // If no meaningful filters were applied, the query was not understood
  const hasFilter = !!(query.financialType || query.dataType || query.itemCode || query.month)
  if (!hasFilter) {
    return {
      response: '❓ Query not understood. Try `shortcuts` to see available commands.',
      candidates: [],
    }
  }

  const top = scored.slice(0, 5)

  if (top.length === 0) {
    return {
      response: buildNoResultMessage(query),
      candidates: [],
    }
  }

  const candidates: Candidate[] = top.map((s, i) => ({
    id: i + 1,
    value: parseFloat(s.row.value) || 0,
    score: s.score,
    sheet: s.row.sheetName,
    financialType: s.row.financialType,
    dataType: s.row.friendlyName,
    itemCode: s.row.itemCode,
    month: s.row.month,
    year: s.row.year,
  }))

  const best = top[0]
  const bestValue = parseFloat(best.row.value) || 0

  // Build detail context for the best match
  const context = buildDetailContext(best.row, allRows)

  const lines: string[] = [
    `📊 **${best.row.friendlyName}** (${best.row.financialType})`,
    `Sheet: ${best.row.sheetName} | Item: ${best.row.itemCode}`,
    `Value: **${formatCurrency(bestValue)}** ('000)`,
    '',
  ]

  if (top.length > 1) {
    lines.push('Other matches:')
    for (let i = 1; i < top.length; i++) {
      const c = top[i]
      const val = parseFloat(c.row.value) || 0
      lines.push(`[${i + 1}] ${c.row.friendlyName} (${c.row.financialType}) — ${formatCurrency(val)}`)
    }
    lines.push('')
  }

  if (context) {
    lines.push(`💡 Type \`detail\` to see ${context.children.length} sub-items`)
  }

  return {
    response: lines.join('\n'),
    candidates,
    context: context ?? undefined,
  }
}

function buildDetailContext(row: FinancialRow, allRows: FinancialRow[]): DetailContext | null {
  if (!row.itemCode || !row.itemCode.match(/^\d+(\.\d+)*$/)) return null

  // Find direct children: item codes that are exactly one level deeper
  const prefix = row.itemCode + '.'
  const depth = row.itemCode.split('.').length

  const children = allRows
    .filter(r =>
      r.sheetName === row.sheetName &&
      r.financialType === row.financialType &&
      r.itemCode.startsWith(prefix) &&
      r.itemCode.split('.').length === depth + 1
    )
    .map(r => ({
      code: r.itemCode,
      name: r.friendlyName,
      value: parseFloat(r.value) || 0,
    }))

  if (children.length === 0) return null

  return {
    itemCode: row.itemCode,
    sheetName: row.sheetName,
    financialType: row.financialType,
    children,
  }
}

function buildNoResultMessage(query: ResolvedQuery): string {
  const parts: string[] = ['❌ No matching data found.', '']

  if (query.financialType) parts.push(`Financial type: ${query.financialType}`)
  if (query.sheet) parts.push(`Sheet: ${query.sheet}`)
  if (query.dataType) parts.push(`Data type: ${query.dataType}`)
  if (query.itemCode) parts.push(`Item code: ${query.itemCode}`)
  if (query.month) parts.push(`Month: ${query.month}`)

  parts.push('')
  parts.push('💡 Try:')
  parts.push('• `list` — browse all data items')
  parts.push('• `type` — see available financial types')
  parts.push('• `shortcuts` — see all commands')

  return parts.join('\n')
}
