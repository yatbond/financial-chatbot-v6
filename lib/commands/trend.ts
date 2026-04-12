import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'
import type { ResolvedQuery } from '../pipeline/resolver'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * trend [metric] [N] — Show metric values over N months across all available months.
 * Uses monthly-sheet rows (non-Financial Status).
 */
export function handleTrend(rows: FinancialRow[], query: ResolvedQuery): string {
  const itemCode = query.itemCode
  const dataType = query.dataType
  const ftype = query.financialType
  const n = query.number ?? 12

  if (!itemCode && !dataType) {
    return '❌ Specify a metric. e.g. `trend gp 12`, `trend subcon committed 6`'
  }

  // Use Financial Status rows that have monthly data (year/month vary)
  const matchRows = rows.filter(r => {
    if (r.sheetName !== 'Financial Status') return false
    if (ftype && r.financialType !== ftype) return false
    if (itemCode && r.itemCode !== itemCode) return false
    if (dataType && r.friendlyName.toLowerCase() !== dataType.toLowerCase()) return false
    return true
  })

  if (matchRows.length === 0) {
    return `❌ No trend data for the specified metric. Try \`trend gp\`.`
  }

  // Group by month (each row already represents a single month report)
  // Sort by year/month descending, take last N
  const sorted = [...matchRows].sort((a, b) => {
    const ya = parseInt(a.year) * 100 + parseInt(a.month)
    const yb = parseInt(b.year) * 100 + parseInt(b.month)
    return ya - yb
  })

  const recent = sorted.slice(-n)

  const label = recent[0]?.friendlyName ?? itemCode ?? dataType ?? 'Metric'
  const typeLabel = ftype ? ` (${ftype})` : ''
  const lines = [`📈 **${label}${typeLabel} — Last ${recent.length} Months**`, '']

  for (const r of recent) {
    const m = parseInt(r.month)
    const monthName = MONTH_NAMES[m] ?? `M${m}`
    const val = parseFloat(r.value) || 0
    lines.push(`${r.year} ${monthName}: ${formatCurrency(val)}`)
  }

  return lines.join('\n')
}
