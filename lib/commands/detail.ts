import type { FinancialRow } from '../data/types'
import type { DetailContext } from '../pipeline/formatter'
import { formatCurrency } from '../pipeline/formatter'

export interface DetailResult {
  response: string
  context?: DetailContext
}

/**
 * Handle detail commands using stored context or explicit item code.
 *
 * "detail"        → show all children from context
 * "detail N"      → show Nth child from context
 * "detail 2.1"    → show children of item 2.1
 */
export function handleDetail(
  rows: FinancialRow[],
  arg: string | undefined,
  context: DetailContext | null,
): DetailResult {
  // Case 1: explicit item code pattern "2.1" etc.
  if (arg && /^\d+(\.\d+)*$/.test(arg)) {
    return drillByItemCode(rows, arg, context)
  }

  // Case 2: numeric index into context children
  if (arg && /^\d+$/.test(arg) && context) {
    const idx = parseInt(arg) - 1
    if (idx >= 0 && idx < context.children.length) {
      const child = context.children[idx]
      return drillByItemCode(rows, child.code, context)
    }
    return { response: `❌ Index ${arg} out of range. Context has ${context.children.length} children.` }
  }

  // Case 3: no arg, show context children
  if (context) {
    return showContextChildren(rows, context)
  }

  return {
    response: '❌ No detail context available. Run a query first, then type `detail`.',
  }
}

function showContextChildren(rows: FinancialRow[], context: DetailContext): DetailResult {
  const lines = [
    `📊 **Sub-items of ${context.itemCode}** (${context.financialType})`,
    '',
  ]

  for (let i = 0; i < context.children.length; i++) {
    const child = context.children[i]
    lines.push(`[${i + 1}] **${child.code}** ${child.name} — ${formatCurrency(child.value)}`)
  }

  lines.push('')
  lines.push('💡 Type `detail N` to drill into sub-item N')

  // Build new context pointing to first child that has children
  const newContext = buildChildContext(rows, context.children[0]?.code, context.financialType)

  return { response: lines.join('\n'), context: newContext ?? context }
}

function drillByItemCode(rows: FinancialRow[], itemCode: string, prevContext: DetailContext | null): DetailResult {
  const ftype = prevContext?.financialType

  const prefix = itemCode + '.'
  const depth = itemCode.split('.').length

  const matchFilter = (r: FinancialRow) =>
    r.itemCode.startsWith(prefix) &&
    r.itemCode.split('.').length === depth + 1 &&
    (!ftype || r.financialType === ftype)

  const children = rows.filter(matchFilter)

  if (children.length === 0) {
    // No children → show the item itself
    const self = rows.find(r => r.itemCode === itemCode && (!ftype || r.financialType === ftype))
    if (self) {
      return {
        response: `📊 **${self.friendlyName}** (${self.itemCode})\n\nValue: **${formatCurrency(parseFloat(self.value) || 0)}** ('000)\n\nNo sub-items.`,
      }
    }
    return { response: `❌ Item ${itemCode} not found.` }
  }

  const lines = [`📊 **Sub-items of ${itemCode}** (${ftype ?? 'all types'})`, '']
  const childEntries = children.map((r, i) => ({
    code: r.itemCode,
    name: r.friendlyName,
    value: parseFloat(r.value) || 0,
  }))

  for (let i = 0; i < childEntries.length; i++) {
    const c = childEntries[i]
    lines.push(`[${i + 1}] **${c.code}** ${c.name} — ${formatCurrency(c.value)}`)
  }

  lines.push('')
  lines.push('💡 Type `detail N` to drill further')

  const newContext: DetailContext = {
    itemCode,
    sheetName: ftype ?? '',  // Keep for API compatibility
    financialType: ftype ?? '',
    children: childEntries,
  }

  return { response: lines.join('\n'), context: newContext }
}

function buildChildContext(
  rows: FinancialRow[],
  itemCode: string | undefined,
  ftype: string,
): DetailContext | null {
  if (!itemCode) return null
  const prefix = itemCode + '.'
  const depth = itemCode.split('.').length

  const children = rows
    .filter(r =>
      r.itemCode.startsWith(prefix) &&
      r.itemCode.split('.').length === depth + 1 &&
      r.financialType === ftype
    )
    .map(r => ({ code: r.itemCode, name: r.friendlyName, value: parseFloat(r.value) || 0 }))

  if (children.length === 0) return null
  return { itemCode, sheetName: ftype, financialType: ftype, children }
}
