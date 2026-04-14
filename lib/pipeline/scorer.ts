import type { FinancialRow } from '../data/types'
import type { ResolvedQuery } from './resolver'

export interface ScoredRow {
  row: FinancialRow
  score: number
}

// Score weights — NO arbitrary bonuses (spec §6)
const WEIGHTS = {
  exactSheetMatch: 100,
  exactFinTypeMatch: 80,
  exactDataTypeMatch: 60,
  exactItemCodeMatch: 50,
  monthMatch: 20,
  yearMatch: 15,
}

export function score(rows: FinancialRow[], query: ResolvedQuery): ScoredRow[] {
  const scored = rows.map(row => ({ row, score: computeScore(row, query) }))
  // Sort descending; stable sort preserves CSV order for equal scores
  scored.sort((a, b) => b.score - a.score)
  return scored
}

function computeScore(row: FinancialRow, query: ResolvedQuery): number {
  let s = 0

  if (query.sheet && row.sheetName === query.sheet) s += WEIGHTS.exactSheetMatch
  if (query.financialType && row.financialType === query.financialType) s += WEIGHTS.exactFinTypeMatch
  if (query.dataType && row.friendlyName.toLowerCase() === query.dataType.toLowerCase()) s += WEIGHTS.exactDataTypeMatch
  if (query.itemCode && row.itemCode === query.itemCode) s += WEIGHTS.exactItemCodeMatch
  if (query.month !== undefined && parseInt(row.month) === query.month) s += WEIGHTS.monthMatch
  if (query.year !== undefined && parseInt(row.year) === query.year) s += WEIGHTS.yearMatch

  return s
}
