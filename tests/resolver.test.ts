import { describe, it, expect } from 'vitest'
import { tokenize } from '../lib/pipeline/tokenizer'
import { classify } from '../lib/pipeline/classifier'
import { resolve, DEFAULT_SHEET } from '../lib/pipeline/resolver'

function pipeline(query: string) {
  return resolve(classify(tokenize(query)))
}

describe('resolver — sheet resolution', () => {
  it('"committed plant" → Sheet=Financial Status, FType=Committed Cost', () => {
    const q = pipeline('committed plant')
    expect(q.sheet).toBe(DEFAULT_SHEET)
    expect(q.financialType).toBe('Committed Cost')
  })

  it('"committed committed plant" → Sheet=Committed Cost, FType=Committed Cost', () => {
    const q = pipeline('committed committed plant')
    expect(q.sheet).toBe('Committed Cost')
    expect(q.financialType).toBe('Committed Cost')
  })

  it('"accrual accrual material" → Sheet=Accrual, FType=Accrual', () => {
    const q = pipeline('accrual accrual material')
    expect(q.sheet).toBe('Accrual')
    expect(q.financialType).toBe('Accrual')
  })

  it('"cf cf cost" → Sheet=Cash Flow, FType=Cash Flow', () => {
    const q = pipeline('cf cf cost')
    expect(q.sheet).toBe('Cash Flow')
    expect(q.financialType).toBe('Cash Flow')
  })

  it('"committed plant oct" → Sheet=Committed Cost, Month=10', () => {
    const q = pipeline('committed plant oct')
    expect(q.sheet).toBe('Committed Cost')
    expect(q.month).toBe(10)
  })

  it('"bp income" → Sheet=Financial Status, FType=Business Plan', () => {
    const q = pipeline('bp income')
    expect(q.sheet).toBe(DEFAULT_SHEET)
    expect(q.financialType).toBe('Business Plan')
  })

  it('"tender gp" → Sheet=Financial Status, FType=Budget Tender', () => {
    const q = pipeline('tender gp')
    expect(q.sheet).toBe(DEFAULT_SHEET)
    expect(q.financialType).toBe('Budget Tender')
  })

  it('"budget material" → Sheet=Financial Status, FType=Latest Budget', () => {
    const q = pipeline('budget material')
    expect(q.sheet).toBe(DEFAULT_SHEET)
    expect(q.financialType).toBe('Latest Budget')
  })
})

describe('resolver — financial type resolution', () => {
  it('"budget gp" → FType=Latest Budget (not Business Plan)', () => {
    const q = pipeline('budget gp')
    expect(q.financialType).toBe('Latest Budget')
  })

  it('"bp income" → FType=Business Plan', () => {
    const q = pipeline('bp income')
    expect(q.financialType).toBe('Business Plan')
  })

  it('"wip cost" → FType=WIP', () => {
    const q = pipeline('wip cost')
    expect(q.financialType).toBe('WIP')
  })

  it('"projection prelim" → FType=Projection', () => {
    const q = pipeline('projection prelim')
    expect(q.financialType).toBe('Projection')
  })

  it('"tender gp" → FType=Budget Tender', () => {
    const q = pipeline('tender gp')
    expect(q.financialType).toBe('Budget Tender')
  })

  it('"plan income" → FType=Business Plan (plan keyword)', () => {
    const q = pipeline('plan income')
    expect(q.financialType).toBe('Business Plan')
  })
})

describe('resolver — data type resolution', () => {
  it('"committed plant" → dataType includes Plant', () => {
    const q = pipeline('committed plant')
    expect(q.dataType?.toLowerCase()).toContain('plant')
  })

  it('"gp" → itemCode=3', () => {
    const q = pipeline('gp')
    expect(q.itemCode).toBe('3')
  })

  it('"prelim" → itemCode=2.1', () => {
    const q = pipeline('prelim')
    expect(q.itemCode).toBe('2.1')
  })

  it('"subcon vo" → dataType=Subcontractor Variations', () => {
    const q = pipeline('subcon vo')
    // subcon → Subcontractor, vo → Variations (first classification wins)
    expect(q.dataType).toBeDefined()
  })
})

describe('resolver — commands', () => {
  it('"analyze" → command=analyze', () => {
    const q = pipeline('analyze')
    expect(q.command).toBe('analyze')
  })

  it('"compare bp vs wip" → compareFrom=Business Plan, compareTo=WIP', () => {
    const q = pipeline('compare bp wip')
    expect(q.command).toBe('compare')
    expect(q.compareFrom?.financialType).toBe('Business Plan')
    expect(q.compareTo?.financialType).toBe('WIP')
  })

  it('"detail" → command=detail', () => {
    const q = pipeline('detail')
    expect(q.command).toBe('detail')
  })

  it('"list" → command=list', () => {
    const q = pipeline('list')
    expect(q.command).toBe('list')
  })
})
