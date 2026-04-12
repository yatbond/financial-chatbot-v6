import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'
import type { ResolvedQuery } from '../pipeline/resolver'

const KEY_ITEMS = [
  { code: '1', label: 'Total Income' },
  { code: '2', label: 'Total Cost' },
  { code: '3', label: 'Gross Profit' },
  { code: '7', label: 'Net Profit' },
]

export function handleCompare(rows: FinancialRow[], query: ResolvedQuery): string {
  const fromType = query.compareFrom?.financialType
  const toType = query.compareTo?.financialType

  if (!fromType || !toType) {
    return '❌ Specify two types to compare. e.g. `compare bp vs wip` or `compare committed with projection`'
  }

  const fsRows = rows.filter(r => r.sheetName === 'Financial Status')

  const lines: string[] = [`📊 **${fromType} vs ${toType}**`, '']

  for (const item of KEY_ITEMS) {
    const fromRow = fsRows.find(r => r.financialType === fromType && r.itemCode === item.code)
    const toRow = fsRows.find(r => r.financialType === toType && r.itemCode === item.code)

    const fromVal = fromRow ? parseFloat(fromRow.value) || 0 : null
    const toVal = toRow ? parseFloat(toRow.value) || 0 : null

    if (fromVal !== null && toVal !== null) {
      const diff = toVal - fromVal
      const diffStr = diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
      lines.push(`**${item.label} (${item.code})**`)
      lines.push(`  ${fromType}: ${formatCurrency(fromVal)}`)
      lines.push(`  ${toType}: ${formatCurrency(toVal)}`)
      lines.push(`  Difference: ${diffStr}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
