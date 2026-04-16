import type { FinancialRow } from '../data/types'
import { formatCurrency } from '../pipeline/formatter'
import { tokenize } from '../pipeline/tokenizer'
import { classify } from '../pipeline/classifier'
import { resolve } from '../pipeline/resolver'

/**
 * total [item] [type] — Sum all sub-items under a parent item code.
 * e.g. "total cost committed" → sum item 2.x under Committed Cost
 */
export function handleTotal(rows: FinancialRow[], args: string): string {
  // Reuse pipeline to resolve what item/type is being totalled
  const tokens = classify(tokenize(args))
  const query = resolve(tokens)

  const parentCode = query.itemCode
  const ftype = query.financialType

  if (!parentCode) {
    return '❌ Specify an item to total. e.g. `total cost committed` or `total 2.1 wip`'
  }

  const prefix = parentCode + '.'
  const children = rows.filter(r =>
    (!ftype || r.financialType === ftype) &&
    r.itemCode.startsWith(prefix) &&
    !r.itemCode.slice(prefix.length).includes('.')  // direct children only
  )

  if (children.length === 0) {
    return `❌ No sub-items found for ${parentCode} in ${ftype ?? 'all types'}.`
  }

  let total = 0
  const lines = [`📊 **Total for ${parentCode}** (${ftype ?? 'all types'})`, '']

  for (const child of children) {
    const val = parseFloat(child.value) || 0
    total += val
    lines.push(`• ${child.itemCode} ${child.friendlyName}: ${formatCurrency(val)}`)
  }

  lines.push('')
  lines.push(`**Total: ${formatCurrency(total)}** ('000)`)

  return lines.join('\n')
}
