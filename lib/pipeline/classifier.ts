import { Token, TokenType, COMMAND_KEYWORDS, MONTH_MAP } from './tokenizer'
import { getConfig } from '../config/mappings'
import type { ConfigMappings } from '../config/types'

/**
 * Classify an array of tokens in-place using greedy left-to-right longest-match.
 * Returns the same array with types and resolved values filled in.
 */
export function classify(tokens: Token[]): Token[] {
  const cfg = getConfig()
  const result: Token[] = []
  let i = 0

  while (i < tokens.length) {
    const remaining = tokens.slice(i)
    const classified = tryClassify(remaining, cfg, i)
    result.push(classified.token)
    i += classified.consumed
  }

  return result
}

interface ClassifyResult {
  token: Token
  consumed: number   // how many tokens were consumed (1 for single, 2 for bigram, etc.)
}

function tryClassify(tokens: Token[], cfg: ConfigMappings, _pos: number): ClassifyResult {
  const t0 = tokens[0]
  const t1 = tokens[1]
  const t2 = tokens[2]

  // Build candidate strings for multi-word matching
  const w1 = t0.normalized
  const w2 = t1 ? `${w1} ${t1.normalized}` : null
  const w3 = t2 ? `${w2} ${t2.normalized}` : null

  // --- 1. COMMAND keywords (single word only) ---
  if (COMMAND_KEYWORDS.has(w1)) {
    return { token: { ...t0, type: TokenType.COMMAND, commandValue: w1 }, consumed: 1 }
  }

  // --- 2. DATE patterns ---
  if (MONTH_MAP[w1]) {
    return { token: { ...t0, type: TokenType.DATE_MONTH, monthValue: MONTH_MAP[w1] }, consumed: 1 }
  }

  // Year pattern: 4-digit year
  if (/^\d{4}$/.test(w1)) {
    const yr = parseInt(w1)
    if (yr >= 2000 && yr <= 2100) {
      return { token: { ...t0, type: TokenType.DATE_YEAR, yearValue: yr }, consumed: 1 }
    }
  }

  // Month as number: 1-12 but NOT item codes (no dots)
  if (/^\d{1,2}$/.test(w1) && !w1.includes('.')) {
    const n = parseInt(w1)
    if (n >= 1 && n <= 12) {
      return { token: { ...t0, type: TokenType.NUMBER, numberValue: n }, consumed: 1 }
    }
  }

  // --- 3. ITEM_CODE pattern: digits with dots (e.g. "2.1", "1.3.2") ---
  if (/^\d+(\.\d+)+$/.test(w1)) {
    const dtEntry = cfg.dtypeByItemCode.get(w1)
    return {
      token: {
        ...t0,
        type: TokenType.ITEM_CODE,
        itemCode: w1,
        dataType: dtEntry?.friendlyName,
      },
      consumed: 1,
    }
  }

  // --- 4. FINANCIAL_TYPE (try 3-gram, 2-gram, 1-gram) ---
  if (w3 && cfg.ftypeByKeyword.has(w3)) {
    const entry = cfg.ftypeByKeyword.get(w3)!
    return {
      token: {
        ...t0,
        raw: `${t0.raw} ${tokens[1].raw} ${tokens[2].raw}`,
        normalized: w3,
        type: TokenType.FINANCIAL_TYPE,
        financialType: entry.cleanType,
      },
      consumed: 3,
    }
  }
  if (w2 && cfg.ftypeByKeyword.has(w2)) {
    const entry = cfg.ftypeByKeyword.get(w2)!
    return {
      token: {
        ...t0,
        raw: `${t0.raw} ${t1!.raw}`,
        normalized: w2,
        type: TokenType.FINANCIAL_TYPE,
        financialType: entry.cleanType,
      },
      consumed: 2,
    }
  }
  if (cfg.ftypeByKeyword.has(w1)) {
    const entry = cfg.ftypeByKeyword.get(w1)!
    return { token: { ...t0, type: TokenType.FINANCIAL_TYPE, financialType: entry.cleanType }, consumed: 1 }
  }

  // --- 5. DATA_TYPE (try 3-gram, 2-gram, 1-gram) ---
  if (w3 && cfg.dtypeByKeyword.has(w3)) {
    const entry = cfg.dtypeByKeyword.get(w3)!
    return {
      token: {
        ...t0,
        raw: `${t0.raw} ${tokens[1].raw} ${tokens[2].raw}`,
        normalized: w3,
        type: TokenType.DATA_TYPE,
        dataType: entry.friendlyName,
        itemCode: entry.itemCode,
      },
      consumed: 3,
    }
  }
  if (w2 && cfg.dtypeByKeyword.has(w2)) {
    const entry = cfg.dtypeByKeyword.get(w2)!
    return {
      token: {
        ...t0,
        raw: `${t0.raw} ${t1!.raw}`,
        normalized: w2,
        type: TokenType.DATA_TYPE,
        dataType: entry.friendlyName,
        itemCode: entry.itemCode,
      },
      consumed: 2,
    }
  }
  if (cfg.dtypeByKeyword.has(w1)) {
    const entry = cfg.dtypeByKeyword.get(w1)!
    return { token: { ...t0, type: TokenType.DATA_TYPE, dataType: entry.friendlyName, itemCode: entry.itemCode }, consumed: 1 }
  }

  // --- 6. Plain number ---
  if (/^\d+$/.test(w1)) {
    return { token: { ...t0, type: TokenType.NUMBER, numberValue: parseInt(w1) }, consumed: 1 }
  }

  return { token: { ...t0, type: TokenType.UNKNOWN }, consumed: 1 }
}
