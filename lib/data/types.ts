export interface FinancialRow {
  year: string
  month: string
  sheetName: string
  financialType: string      // normalised to Clean_Financial_Type
  rawFinancialType: string   // original value from CSV
  itemCode: string
  friendlyName: string       // Friendly_Name column (called Data_Type in spec)
  category: string
  value: string              // kept as string; parse to number where needed
  matchStatus: string
  sourceFile: string
  sourceSubfolder: string
  dataMonth?: string | null  // NULL for snapshots (Financial Status), 4-12 for monthly columns
}

export interface ProjectInfo {
  id?: string
  code: string
  name: string
  year: string
  month: string
  filename: string
}

export interface FolderStructure {
  [year: string]: string[]
}

export interface Metrics {
  'Business Plan GP': number
  'Projected GP': number
  'WIP GP': number
  'Cash Flow': number
  'Start Date': string
  'Complete Date': string
  'Target Complete Date': string
  'Time Consumed (%)': string
  'Target Completed (%)': string
}
