import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * cash flow command — monthly GP summary from Cash Flow sheet.
 * Per spec #9: Show item 3 (GP) and item 5 (GP after recon & overhead)
 * for the last 12 months or all available data.
 */
export function handleCashFlow(rows: FinancialRow[]): string {
  // Use monthly Cash Flow data (data_month IS NOT NULL, sheet = Cash Flow)
  const monthlyRows = rows.filter(r =>
    r.sheetName === 'Cash Flow' &&
    r.dataMonth !== null &&
    (r.itemCode === '3' || r.itemCode === '5')
  )

  // If no monthly data, fall back to snapshot rows
  const cfRows = monthlyRows.length > 0 ? monthlyRows :
    rows.filter(r => r.financialType === 'Cash Flow' && (r.itemCode === '3' || r.itemCode === '5'))

  if (cfRows.length === 0) {
    return '❌ No Cash Flow GP data found.'
  }

  return formatCFRows(cfRows)
}

function formatCFRows(rows: FinancialRow[]): string {
  // Sort by year/month (for snapshot) or by data_month (for monthly)
  const sorted = [...rows].sort((a, b) => {
    const am = a.dataMonth !== null ? parseInt(a.dataMonth) : parseInt(a.month)
    const bm = b.dataMonth !== null ? parseInt(b.dataMonth) : parseInt(b.month)
    const ya = parseInt(a.year) * 100 + am
    const yb = parseInt(b.year) * 100 + bm
    return ya - yb
  })

  const lines: string[] = ['💰 **Cash Flow — GP Summary**', '']

  // Group by item code: 3 = GP, 5 = GP after recon
  const gp3 = sorted.filter(r => r.itemCode === '3')
  const gp5 = sorted.filter(r => r.itemCode === '5')

  if (gp3.length > 0) {
    lines.push('**Gross Profit (Item 3):**')
    for (const r of gp3) {
      const label = r.dataMonth !== null
        ? `${MONTH_NAMES[parseInt(r.dataMonth)] ?? `M${r.dataMonth}`}`
        : `${r.year} ${MONTH_NAMES[parseInt(r.month)] ?? `M${r.month}`}`
      lines.push(`  ${label}: ${formatCurrency(parseFloat(r.value) || 0)}`)
    }
    lines.push('')
  }

  if (gp5.length > 0) {
    lines.push('**GP after Recon & Overhead (Item 5):**')
    for (const r of gp5) {
      const label = r.dataMonth !== null
        ? `${MONTH_NAMES[parseInt(r.dataMonth)] ?? `M${r.dataMonth}`}`
        : `${r.year} ${MONTH_NAMES[parseInt(r.month)] ?? `M${r.month}`}`
      lines.push(`  ${label}: ${formatCurrency(parseFloat(r.value) || 0)}`)
    }
  }

  return lines.join('\n')
}