import { loadFinancialTypeMap, loadDataTypeMap } from './loader'
import type { ConfigMappings, FinancialTypeEntry, DataTypeEntry } from './types'

let cached: ConfigMappings | null = null

export function getConfig(): ConfigMappings {
  if (cached) return cached

  const financialTypes = loadFinancialTypeMap()
  const dataTypes = loadDataTypeMap()

  const ftypeByKeyword = new Map<string, FinancialTypeEntry>()
  for (const entry of financialTypes) {
    for (const kw of entry.keywords) {
      // First registered wins — ensures no duplicate key overrides
      if (!ftypeByKeyword.has(kw)) {
        ftypeByKeyword.set(kw, entry)
      }
    }
  }

  const dtypeByKeyword = new Map<string, DataTypeEntry>()
  for (const entry of dataTypes) {
    for (const kw of entry.keywords) {
      // Financial type keywords must NOT match data types.
      // Skip keywords that are already claimed by a financial type.
      if (ftypeByKeyword.has(kw)) continue
      if (!dtypeByKeyword.has(kw)) {
        dtypeByKeyword.set(kw, entry)
      }
    }
  }

  const dtypeByItemCode = new Map<string, DataTypeEntry>()
  for (const entry of dataTypes) {
    if (entry.itemCode) {
      dtypeByItemCode.set(entry.itemCode, entry)
    }
  }

  // Map from cleanType → list of raw CSV values that normalise to it
  const cleanToRaw = new Map<string, string[]>()
  for (const entry of financialTypes) {
    const existing = cleanToRaw.get(entry.cleanType) ?? []
    // Add the rawType itself
    if (entry.rawType && !existing.includes(entry.rawType)) {
      existing.push(entry.rawType)
    }
    // Also add the cleanType itself as a potential raw value
    if (!existing.includes(entry.cleanType)) {
      existing.push(entry.cleanType)
    }
    cleanToRaw.set(entry.cleanType, existing)
  }

  cached = { financialTypes, dataTypes, ftypeByKeyword, dtypeByKeyword, dtypeByItemCode, cleanToRaw }
  return cached
}

/** Reset cache — useful in tests */
export function resetConfig(): void {
  cached = null
}

/**
 * Normalise a raw Financial_Type value from the data CSV to its Clean_Financial_Type.
 * e.g. "Revision as at" → "Latest Budget"
 */
export function normaliseFinancialType(rawValue: string, cfg: ConfigMappings): string {
  const v = rawValue.trim()

  // 1. Direct clean type match
  const directClean = cfg.financialTypes.find(e => e.cleanType === v)
  if (directClean) return directClean.cleanType

  // 2. Direct raw type match
  const directRaw = cfg.financialTypes.find(e => e.rawType === v)
  if (directRaw) return directRaw.cleanType

  // 3. Substring: rawType contains the data value (e.g. "Budget Revision as at" contains "Revision as at")
  const subMatch = cfg.financialTypes.find(e =>
    e.rawType && e.rawType.toLowerCase().includes(v.toLowerCase()) && v.length > 3
  )
  if (subMatch) return subMatch.cleanType

  return v  // unknown — keep as-is
}
