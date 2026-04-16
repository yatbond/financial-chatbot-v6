import type { FinancialRow } from '../data/types'
import { getConfig } from '../config/mappings'
import { formatCurrency } from '../pipeline/formatter'

/**
 * list           → tier-1 items
 * list more      → tier-2 items
 * list 2.2       → children of item 2.2
 */
export function handleList(rows: FinancialRow[], arg?: string): string {
  const cfg = getConfig()

  if (!arg || arg === 'list') {
    // Tier-1 items from config
    const tier1 = cfg.dataTypes.filter(d => d.tier === 1)
    const lines = ['📋 **Top-Level Items (Tier 1):**', '']
    for (const dt of tier1) {
      const match = rows.find(r =>
        r.sheetName === 'Financial Status' &&
        r.financialType === 'Business Plan' &&
        r.itemCode === dt.itemCode
      )
      const val = match ? ` — ${formatCurrency(parseFloat(match.value) || 0)}` : ''
      lines.push(`• **${dt.itemCode}** ${dt.friendlyName}${val}`)
    }
    lines.push('')
    lines.push('💡 Type `list more` to see tier-2 items, or `list 2.1` for sub-items')
    return lines.join('\n')
  }

  if (arg === 'more') {
    const tier2 = cfg.dataTypes.filter(d => d.tier === 2)
    const lines = ['📋 **Sub-Items (Tier 2):**', '']
    for (const dt of tier2) {
      lines.push(`• **${dt.itemCode}** ${dt.friendlyName}`)
    }
    return lines.join('\n')
  }

  // list N.N — children of a specific item code
  const parentCode = arg.trim()
  const children = cfg.dataTypes.filter(d => {
    if (!d.itemCode.startsWith(parentCode + '.')) return false
    const extra = d.itemCode.slice(parentCode.length + 1)
    return !extra.includes('.')  // direct children only
  })

  if (children.length === 0) {
    return `❌ No children found for item ${parentCode}. Try \`list\` to see all items.`
  }

  const lines = [`📋 **Sub-items of ${parentCode}:**`, '']
  for (const dt of children) {
    const match = rows.find(r =>
      r.sheetName === 'Financial Status' &&
      r.itemCode === dt.itemCode
    )
    const val = match ? ` — ${formatCurrency(parseFloat(match.value) || 0)}` : ''
    lines.push(`• **${dt.itemCode}** ${dt.friendlyName}${val}`)
  }
  lines.push('')
  lines.push(`💡 Type \`detail ${parentCode}\` to drill in, or click a candidate`)
  return lines.join('\n')
}
