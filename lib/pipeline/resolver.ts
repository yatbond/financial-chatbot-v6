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

/**
 * Resolve classified tokens into a ResolvedQuery.
 *
 * Sheet resolution rules (from spec):
 * 1. Count FINANCIAL_TYPE tokens
 * 2. count >= 2 → first ftype = SHEET, remaining = FINANCIAL_TYPE
 * 3. count == 1 AND month present → that ftype = SHEET (monthly sheet)
 * 4. count == 1 AND no month → SHEET = Financial Status, FINANCIAL_TYPE = that ftype
 * 5. count == 0 → SHEET = Financial Status, FINANCIAL_TYPE = undefined
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

  if (ftypeTokens.length >= 2) {
    // Rule 2: 2+ ftype tokens → first = sheet, remaining = financial type filter
    q.sheet = cleanTypeToSheetName(ftypeTokens[0].financialType!)
    q.financialType = ftypeTokens[0].financialType
  } else if (ftypeTokens.length === 1 && hasMonth) {
    // Rule 3: 1 ftype + month → that ftype as sheet
    q.sheet = cleanTypeToSheetName(ftypeTokens[0].financialType!)
    q.financialType = ftypeTokens[0].financialType
  } else if (ftypeTokens.length === 1) {
    // Rule 4: 1 ftype, no month → Financial Status + ftype as filter
    q.sheet = DEFAULT_SHEET
    q.financialType = ftypeTokens[0].financialType
  } else {
    // Rule 5: no ftype → Financial Status
    q.sheet = DEFAULT_SHEET
  }

  // Handle compare command: "compare X vs Y" or "compare X with Y"
  if (q.command === 'compare' && ftypeTokens.length >= 2) {
    q.compareFrom = { financialType: ftypeTokens[0].financialType! }
    q.compareTo = { financialType: ftypeTokens[1].financialType! }
    q.sheet = DEFAULT_SHEET
    q.financialType = undefined
  }

  return q
}

/**
 * Map a Clean_Financial_Type to its Sheet_Name in the data CSV.
 * Sheet names match the Clean_Financial_Type exactly — this is a direct passthrough.
 * All keyword→type mappings come from the config CSV; no hardcoded maps here.
 */
export function cleanTypeToSheetName(cleanType: string): string {
  return cleanType
}
