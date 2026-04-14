export interface FinancialTypeEntry {
  rawType: string
  cleanType: string
  keywords: string[]  // lowercase, split from Acronyms column
}

export interface DataTypeEntry {
  itemCode: string
  dataType: string       // raw Data_Type from CSV
  friendlyName: string   // Friendly_Name / display name
  category: string
  tier: number
  keywords: string[]     // lowercase, split from Acronyms column
}

export interface ConfigMappings {
  financialTypes: FinancialTypeEntry[]
  dataTypes: DataTypeEntry[]
  // keyword → FinancialTypeEntry (flat lookup, each keyword mapped once)
  ftypeByKeyword: Map<string, FinancialTypeEntry>
  // keyword → DataTypeEntry (flat lookup)
  dtypeByKeyword: Map<string, DataTypeEntry>
  // itemCode → DataTypeEntry
  dtypeByItemCode: Map<string, DataTypeEntry>
  // cleanType → list of raw CSV Financial_Type values that normalise to it
  cleanToRaw: Map<string, string[]>
}
