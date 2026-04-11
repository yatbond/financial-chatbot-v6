import { describe, it, expect } from 'vitest'
import { score } from '../lib/pipeline/scorer'
import type { FinancialRow } from '../lib/data/types'
import type { ResolvedQuery } from '../lib/pipeline/resolver'

function makeRow(overrides: Partial<FinancialRow>): FinancialRow {
  return {
    year: '2026', month: '2', sheetName: 'Financial Status',
    financialType: 'Business Plan', rawFinancialType: 'Business Plan',
    itemCode: '3', friendlyName: 'Gross Profit', category: 'Summary',
    value: '1000', matchStatus: 'EXACT', sourceFile: 'test.csv', sourceSubfolder: 'test',
    ...overrides,
  }
}

describe('scorer', () => {
  it('exact sheet match scores 100', () => {
    const rows = [makeRow({ sheetName: 'Financial Status' })]
    const q: ResolvedQuery = { sheet: 'Financial Status' }
    const result = score(rows, q)
    expect(result[0].score).toBeGreaterThanOrEqual(100)
  })

  it('exact financial type match scores additional 80', () => {
    const rows = [makeRow({ financialType: 'Business Plan' })]
    const q: ResolvedQuery = { sheet: 'Financial Status', financialType: 'Business Plan' }
    const result = score(rows, q)
    expect(result[0].score).toBeGreaterThanOrEqual(180)
  })

  it('ranks exact item code match above partial', () => {
    const exact = makeRow({ itemCode: '2.1', friendlyName: 'Preliminaries' })
    const partial = makeRow({ itemCode: '2.1.1', friendlyName: 'Management & Supervision' })
    const q: ResolvedQuery = { sheet: 'Financial Status', financialType: 'Business Plan', itemCode: '2.1' }
    const result = score([partial, exact], q)
    expect(result[0].row.itemCode).toBe('2.1')
  })

  it('no Financial Status sheet bias — row with matching ftype beats unrelated row', () => {
    const relevant = makeRow({ financialType: 'WIP', sheetName: 'Financial Status' })
    const irrelevant = makeRow({ financialType: 'Business Plan', sheetName: 'Financial Status' })
    const q: ResolvedQuery = { sheet: 'Financial Status', financialType: 'WIP' }
    const result = score([irrelevant, relevant], q)
    expect(result[0].row.financialType).toBe('WIP')
  })

  it('top 5 returned in descending score order', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({ itemCode: String(i), value: String(i * 100) })
    )
    const q: ResolvedQuery = { sheet: 'Financial Status', financialType: 'Business Plan', itemCode: '3' }
    const result = score(rows, q)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score)
    }
  })

  it('month match adds 20 points', () => {
    const row = makeRow({ month: '10' })
    const withMonth: ResolvedQuery = { sheet: 'Financial Status', month: 10 }
    const withoutMonth: ResolvedQuery = { sheet: 'Financial Status' }
    const scoredWith = score([row], withMonth)[0].score
    const scoredWithout = score([row], withoutMonth)[0].score
    expect(scoredWith - scoredWithout).toBe(20)
  })
})
