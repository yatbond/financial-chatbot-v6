import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'
import type { ResolvedQuery } from '../pipeline/resolver'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * trend [metric] [N] — Show metric values over N months.
 * For Financial Status sheet: shows snapshot values across report months.
 * For monthly sheets (Cash Flow, Projection, etc.): shows values across data months.
 */
export function handleTrend(rows: FinancialRow[], query: ResolvedQuery): string {
  const itemCode = query.itemCode
  const dataType = query.dataType
  const ftype = query.financialType
  const n = query.number ?? 12
  const sheet = query.sheet ?? 'Financial Status'

  if (!itemCode && !dataType) {
    return '❌ Specify a metric. e.g. `trend gp 12`, `trend subcon committed 6`'
  }

  // For trend, we need multiple time periods
  // If sheet is Financial Status → use snapshot rows across different report months
  // If sheet is a monthly type → use monthly rows across data months
  const matchRows = rows.filter(r => {
    // Filter by sheet/data source
    if (sheet === 'Financial Status') {
      // Snapshot rows only
      if (r.dataMonth != null) return false
    } else {
      // Monthly rows for specific financial type
      if (r.dataMonth == null) return false
      if (r.sheetName !== sheet) return false
    }

    if (ftype && r.financialType !== ftype) return false
    if (itemCode && r.itemCode !== itemCode) return false
    if (dataType && r.friendlyName.toLowerCase() !== dataType.toLowerCase()) return false
    return true
  })

  if (matchRows.length === 0) {
    return `❌ No trend data for the specified metric. Try \`trend gp\` or specify a financial type like \`trend gp cf\`.`
  }

  // Group by time period and sort
  // For Financial Status: group by report year/month
  // For monthly sheets: group by data_month
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
    if (r.dataMonth != null) {
      // Monthly data: show data_month
      const dm = parseInt(r.dataMonth)
      lines.push(`${r.year} ${MONTH_NAMES[dm] ?? `M${dm}`}: ${formatCurrency(val)}`)
    } else {
      lines.push(`${r.year} ${monthName}: ${formatCurrency(val)}`)
    }
  }

  return lines.join('\n')
}