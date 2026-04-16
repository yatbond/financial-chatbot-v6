import type { FinancialRow } from '../data/types'
import type { ResolvedQuery } from './resolver'

/**
 * Apply resolved query filters to the dataset.
 * Returns matching rows.
 */
export function filter(rows: FinancialRow[], query: ResolvedQuery): FinancialRow[] {
  return rows.filter(row => {
    // 1. Sheet_Name filter
    if (query.sheet && row.sheetName !== query.sheet) return false

    // 2. Financial_Type filter (using normalised value)
    if (query.financialType && row.financialType !== query.financialType) return false

    // 3. Item_Code filter
    if (query.itemCode) {
      if (!matchItemCode(row.itemCode, query.itemCode)) return false
    }

    // 4. Data_Type / Friendly_Name filter
    //    Skip when itemCode is present (itemCode is more specific than friendlyName)
    if (query.dataType && !query.itemCode) {
      if (!matchDataType(row.friendlyName, query.dataType)) return false
    }

    // 5. Month filter
    if (query.month !== undefined) {
      if (parseInt(row.month) !== query.month) return false
    }

    // 6. Year filter
    if (query.year !== undefined) {
      if (parseInt(row.year) !== query.year) return false
    }

    return true
  })
}

/**
 * Match an item code including prefix match:
 * query "2.1" matches row "2.1", "2.1.1", "2.1.2" etc.
 * But exact-match rows score higher (handled in scorer).
 */
function matchItemCode(rowCode: string, queryCode: string): boolean {
  if (rowCode === queryCode) return true
  if (rowCode.startsWith(queryCode + '.')) return true
  return false
}

function matchDataType(rowFriendly: string, queryDataType: string): boolean {
  return rowFriendly.toLowerCase() === queryDataType.toLowerCase()
}
