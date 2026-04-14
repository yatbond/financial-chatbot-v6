import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * cash flow command — 12-month GP summary from Cash Flow sheet.
 */
export function handleCashFlow(rows: FinancialRow[]): string {
  // Try Cash Flow monthly sheet first
  const cfRows = rows.filter(r => r.sheetName === 'Cash Flow' && r.itemCode === '3')

  if (cfRows.length === 0) {
    // Fall back to Financial Status Cash Flow rows
    const fsRows = rows.filter(r =>
      r.sheetName === 'Financial Status' &&
      r.financialType === 'Cash Flow' &&
      r.itemCode === '3'
    )

    if (fsRows.length === 0) {
      return '❌ No Cash Flow GP data found.'
    }

    return formatCFRows(fsRows)
  }

  return formatCFRows(cfRows)
}

function formatCFRows(rows: FinancialRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ya = parseInt(a.year) * 100 + parseInt(a.month)
    const yb = parseInt(b.year) * 100 + parseInt(b.month)
    return ya - yb
  })

  const lines: string[] = ['💰 **Cash Flow — GP Summary**', '']

  for (const r of sorted) {
    const m = parseInt(r.month)
    const name = MONTH_NAMES[m] ?? `M${m}`
    const val = parseFloat(r.value) || 0
    lines.push(`${r.year} ${name}: ${formatCurrency(val)}`)
  }

  return lines.join('\n')
}
