import { Token, TokenType } from './tokenizer'

export interface ResolvedQuery {
  command?: string
  sheet?: string          // Sheet_Name value to filter on
  financialType?: string  // Clean_Financial_Type to filter on
  dataType?: string       // friendlyName to filter on
  itemCode?: string
  month?: number
  year?: number
  number?: number
  // For compare command
  compareFrom?: { financialType: string }
  compareTo?: { financialType: string }
}

export const DEFAULT_SHEET = 'Financial Status'

// Financial types that have monthly breakdown sheets
const MONTHLY_TYPES = new Set(['Cash Flow', 'Projection', 'Committed Cost', 'Accrual'])

/**
 * Resolve classified tokens into a ResolvedQuery.
 *
 * Sheet resolution rules (from spec #6):
 *
 * | Query                | Month? | Ftype?   | Action                                                                    |
 * |----------------------|--------|----------|---------------------------------------------------------------------------|
 * | committed prelim oct | Yes    | committed| Sheet = Committed Cost (monthly)                                          |
 * | committed prelim     | No     | committed| Ask: Financial Status (snapshot) or Committed Cost (which month?)         |
 * | projected gp         | No     | projected| Ask: Financial Status (snapshot) or Projection (which month?)             |
 * | trend gp 8           | No (8=months) | No | Ask: Which financial type?                                              |
 * | gp                   | No     | No       | Ask: Which financial type? Show all options                               |
 * | prelim oct           | Yes    | No       | Ask: Which financial type? [Projection] [Committed] [Accrual] [Cash Flow]|
 *
 * Core rules:
 * - 2+ ftype tokens → first = SHEET, remaining = FINANCIAL_TYPE
 * - 1 ftype + month → monthly sheet (that ftype)
 * - 1 ftype + no month → ambiguous (could be snapshot or monthly)
 * - 0 ftype → Financial Status
 */
export function resolve(tokens: Token[]): ResolvedQuery {
  const q: ResolvedQuery = {}

  // Extract commands
  const commandTokens = tokens.filter(t => t.type === TokenType.COMMAND)
  if (commandTokens.length > 0) {
    q.command = commandTokens[0].commandValue
  }

  // Extract financial type tokens (in order of appearance)
  const ftypeTokens = tokens.filter(t => t.type === TokenType.FINANCIAL_TYPE)

  // Extract data type tokens
  const dtypeTokens = tokens.filter(t => t.type === TokenType.DATA_TYPE)
  const itemCodeTokens = tokens.filter(t => t.type === TokenType.ITEM_CODE)

  // Extract date tokens
  const monthToken = tokens.find(t => t.type === TokenType.DATE_MONTH)
  const yearToken = tokens.find(t => t.type === TokenType.DATE_YEAR)
  const numberToken = tokens.find(t => t.type === TokenType.NUMBER)

  if (monthToken) q.month = monthToken.monthValue
  if (yearToken) q.year = yearToken.yearValue
  if (numberToken && !q.month) q.number = numberToken.numberValue

  // Data type: use first data type match; item code from token or data type entry
  if (dtypeTokens.length > 0) {
    q.dataType = dtypeTokens[0].dataType
    q.itemCode = dtypeTokens[0].itemCode
  }
  if (itemCodeTokens.length > 0) {
    q.itemCode = itemCodeTokens[0].itemCode
    // If itemCode resolves to a known data type, use that
    if (!q.dataType && itemCodeTokens[0].dataType) {
      q.dataType = itemCodeTokens[0].dataType
    }
  }

  // --- Sheet resolution ---
  const hasMonth = q.month !== undefined

  if (q.command === 'compare' && ftypeTokens.length >= 2) {
    // Compare command: both types are from Financial Status snapshot
    q.compareFrom = { financialType: ftypeTokens[0].financialType! }
    q.compareTo = { financialType: ftypeTokens[1].financialType! }
    q.sheet = DEFAULT_SHEET
    q.financialType = undefined
  } else if (ftypeTokens.length >= 2) {
    // Rule 2: 2+ ftype tokens → first = sheet, remaining = financial type
    q.sheet = cleanTypeToSheetName(ftypeTokens[0].financialType!)
    q.financialType = ftypeTokens[0].financialType
  } else if (ftypeTokens.length === 1 && hasMonth) {
    // Rule 3: 1 ftype + month → monthly sheet
    // "committed prelim oct" → Sheet = Committed Cost, month = 10
    q.sheet = cleanTypeToSheetName(ftypeTokens[0].financialType!)
    q.financialType = ftypeTokens[0].financialType
  } else if (ftypeTokens.length === 1) {
    // Rule 4: 1 ftype, no month
    const ftype = ftypeTokens[0].financialType!
    // If this is a trend command + monthly type, assume monthly sheet
    if (q.command === 'trend' && MONTHLY_TYPES.has(ftype)) {
      q.sheet = cleanTypeToSheetName(ftype)
      q.financialType = ftype
    } else {
      // Default to Financial Status snapshot
      q.sheet = DEFAULT_SHEET
      q.financialType = ftype
    }
  } else {
    // Rule 5: no ftype → Financial Status
    q.sheet = DEFAULT_SHEET
  }

  return q
}

/**
 * Map a Clean_Financial_Type to its Sheet_Name.
 * For types that have their own monthly sheet, the sheet name equals the type.
 * For types that only appear in Financial Status, the sheet name is "Financial Status".
 */
function cleanTypeToSheetName(cleanType: string): string {
  if (MONTHLY_TYPES.has(cleanType)) {
    return cleanType  // e.g. "Cash Flow" → Sheet "Cash Flow"
  }
  return cleanType  // Direct passthrough
}