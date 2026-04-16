import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'

const ANALYSIS_FTYPES = [
  { key: 'Business Plan', label: 'Business Plan (BP)' },
  { key: 'Latest Budget', label: 'Latest Budget (Rev)' },
  { key: 'WIP', label: 'WIP' },
  { key: 'Projection', label: 'Projection' },
  { key: 'Committed Cost', label: 'Committed Cost' },
  { key: 'Accrual', label: 'Accrual' },
]

const KEY_ITEMS = [
  { code: '1', label: 'Total Income' },
  { code: '2', label: 'Total Cost' },
  { code: '3', label: 'Gross Profit' },
  { code: '5', label: 'GP after Recon' },
  { code: '6', label: 'Overhead' },
  { code: '7', label: 'Net Profit' },
]

export function handleAnalyze(rows: FinancialRow[]): string {
  // Snapshot rows: dataMonth is null, these belong to the Financial Status sheet
  const fsRows = rows.filter(r => r.dataMonth == null)

  const lines: string[] = ['📊 **Financial Analysis**', '']

  for (const item of KEY_ITEMS) {
    lines.push(`**${item.label} (Item ${item.code})**`)

    for (const ftype of ANALYSIS_FTYPES) {
      const row = fsRows.find(r => r.financialType === ftype.key && r.itemCode === item.code)
      const val = row ? parseFloat(row.value) || 0 : null

      if (val !== null) {
        lines.push(`  ${ftype.label}: ${formatCurrency(val)}`)
      }
    }

    lines.push('')
  }

  lines.push('💡 Type `compare bp vs wip` for side-by-side comparison')
  return lines.join('\n')
}
