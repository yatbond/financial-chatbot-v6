import { tokenize } from './tokenizer'
import { classify } from './classifier'
import { resolve } from './resolver'
import { filter } from './filter'
import { score } from './scorer'
import { format } from './formatter'
import type { FinancialRow } from '../data/types'
import type { QueryResponse } from './formatter'
import type { DetailContext } from './formatter'

export type { QueryResponse, DetailContext }

/**
 * Run the full query pipeline:
 * tokenize → classify → resolve → filter → score → format
 */
export function runQuery(
  query: string,
  rows: FinancialRow[],
): QueryResponse {
  const tokens = tokenize(query)
  const classified = classify(tokens)
  const resolved = resolve(classified)
  const filtered = filter(rows, resolved)
  const scored = score(filtered, resolved)
  return format(scored, resolved, rows)
}
