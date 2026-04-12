import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'

const RISK_FTYPES = ['WIP', 'Committed Cost', 'Cash Flow']
const KEY_CODES = ['3', '7']  // GP and Net Profit

export function handleRisk(rows: FinancialRow[]): string {
  const fsRows = rows.filter(r => r.sheetName === 'Financial Status')
  const bpGP = parseFloat(fsRows.find(r => r.financialType === 'Business Plan' && r.itemCode === '3')?.value ?? '0') || 0

  const lines: string[] = ['⚠️ **Risk Analysis**', '']

  if (bpGP !== 0) {
    lines.push(`Business Plan GP: ${formatCurrency(bpGP)}`)
    lines.push('')
  }

  for (const ftype of RISK_FTYPES) {
    lines.push(`**${ftype}:**`)
    for (const code of KEY_CODES) {
      const row = fsRows.find(r => r.financialType === ftype && r.itemCode === code)
      if (!row) continue
      const val = parseFloat(row.value) || 0
      const diff = bpGP !== 0 ? val - bpGP : null
      const diffStr = diff !== null ? ` (${diff >= 0 ? '+' : ''}${formatCurrency(diff)} vs BP)` : ''
      const label = code === '3' ? 'Gross Profit' : 'Net Profit'
      lines.push(`  ${label}: ${formatCurrency(val)}${diffStr}`)
    }
    lines.push('')
  }

  lines.push('💡 Type `detail` to drill into any item, or `compare wip vs committed` for full comparison')
  return lines.join('\n')
}
