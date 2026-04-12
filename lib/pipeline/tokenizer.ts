export enum TokenType {
  COMMAND = 'COMMAND',
  DATE_MONTH = 'DATE_MONTH',
  DATE_YEAR = 'DATE_YEAR',
  NUMBER = 'NUMBER',
  SHEET_NAME = 'SHEET_NAME',
  FINANCIAL_TYPE = 'FINANCIAL_TYPE',
  DATA_TYPE = 'DATA_TYPE',
  ITEM_CODE = 'ITEM_CODE',
  UNKNOWN = 'UNKNOWN',
}

export interface Token {
  raw: string        // original word(s) from user input
  normalized: string // lowercased, trimmed
  type: TokenType
  // resolved values (set by classifier)
  financialType?: string   // Clean_Financial_Type
  dataType?: string        // friendlyName
  itemCode?: string
  monthValue?: number      // 1–12
  yearValue?: number
  commandValue?: string
  numberValue?: number
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

// "cash"/"cashflow" are financial type keywords (Cash Flow), NOT commands.
// They must not appear here or the classifier would consume them before the
// FINANCIAL_TYPE check, breaking queries like "cashflow income oct".
export const COMMAND_KEYWORDS = new Set([
  'analyze', 'analyse', 'compare', 'trend', 'detail', 'total',
  'list', 'risk', 'shortcuts', 'help', 'type',
])

export { MONTH_MAP }

/**
 * Tokenize a raw query string.
 * Returns tokens with raw + normalized values.
 * Classification is done in the classifier step.
 */
export function tokenize(query: string): Token[] {
  // Normalise whitespace, lowercase
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return words.map(w => ({ raw: w, normalized: w, type: TokenType.UNKNOWN }))
}
