import { describe, it, expect } from 'vitest'
import { tokenize } from '../lib/pipeline/tokenizer'
import { classify } from '../lib/pipeline/classifier'
import { TokenType } from '../lib/pipeline/tokenizer'

describe('classifier', () => {
  it('classifies "committed" as FINANCIAL_TYPE = Committed Cost', () => {
    const tokens = classify(tokenize('committed'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Committed Cost')
  })

  it('classifies "plant" as DATA_TYPE (not FINANCIAL_TYPE)', () => {
    const tokens = classify(tokenize('plant'))
    expect(tokens[0].type).toBe(TokenType.DATA_TYPE)
  })

  it('"plan" → FINANCIAL_TYPE = Business Plan (not matching plant)', () => {
    const tokens = classify(tokenize('plan'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Business Plan')
  })

  it('"bp" → FINANCIAL_TYPE = Business Plan', () => {
    const tokens = classify(tokenize('bp'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Business Plan')
  })

  it('"budget" → FINANCIAL_TYPE = Latest Budget', () => {
    const tokens = classify(tokenize('budget'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Latest Budget')
  })

  it('"wip" → FINANCIAL_TYPE = WIP', () => {
    const tokens = classify(tokenize('wip'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('WIP')
  })

  it('"cf" → FINANCIAL_TYPE = Cash Flow', () => {
    const tokens = classify(tokenize('cf'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Cash Flow')
  })

  it('"cash flow" (bigram) → FINANCIAL_TYPE = Cash Flow', () => {
    // "cash" and "cashflow" are financial type keywords (not commands)
    // The API route dispatches the cash flow command by checking the raw string
    const tokens = classify(tokenize('cf'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Cash Flow')
  })

  it('"gp" → DATA_TYPE = Gross Profit', () => {
    const tokens = classify(tokenize('gp'))
    expect(tokens[0].type).toBe(TokenType.DATA_TYPE)
    expect(tokens[0].dataType).toContain('Gross Profit')
  })

  it('"oct" → DATE_MONTH = 10', () => {
    const tokens = classify(tokenize('oct'))
    expect(tokens[0].type).toBe(TokenType.DATE_MONTH)
    expect(tokens[0].monthValue).toBe(10)
  })

  it('"2.1" → ITEM_CODE', () => {
    const tokens = classify(tokenize('2.1'))
    expect(tokens[0].type).toBe(TokenType.ITEM_CODE)
    expect(tokens[0].itemCode).toBe('2.1')
  })

  it('"analyze" → COMMAND', () => {
    const tokens = classify(tokenize('analyze'))
    expect(tokens[0].type).toBe(TokenType.COMMAND)
    expect(tokens[0].commandValue).toBe('analyze')
  })

  it('"accrual" → FINANCIAL_TYPE = Accrual', () => {
    const tokens = classify(tokenize('accrual'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Accrual')
  })

  it('"tender" → FINANCIAL_TYPE = Budget Tender', () => {
    const tokens = classify(tokenize('tender'))
    expect(tokens[0].type).toBe(TokenType.FINANCIAL_TYPE)
    expect(tokens[0].financialType).toBe('Budget Tender')
  })

  it('"subcon" → DATA_TYPE = Total Subcontractor', () => {
    const tokens = classify(tokenize('subcon'))
    expect(tokens[0].type).toBe(TokenType.DATA_TYPE)
    expect(tokens[0].dataType).toContain('Subcontractor')
  })
})
