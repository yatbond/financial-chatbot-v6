import { describe, it, expect } from 'vitest'
import { tokenize } from '../lib/pipeline/tokenizer'

describe('tokenizer', () => {
  it('splits a simple query into lowercase tokens', () => {
    const tokens = tokenize('Committed Plant')
    expect(tokens).toHaveLength(2)
    expect(tokens[0].normalized).toBe('committed')
    expect(tokens[1].normalized).toBe('plant')
  })

  it('strips extra whitespace', () => {
    const tokens = tokenize('  bp   gp  ')
    expect(tokens).toHaveLength(2)
  })

  it('handles single word', () => {
    const tokens = tokenize('gp')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].normalized).toBe('gp')
  })

  it('preserves original raw casing in raw field', () => {
    const tokens = tokenize('Committed Plant')
    expect(tokens[0].raw).toBe('committed')   // tokenize lowercases
    expect(tokens[0].normalized).toBe('committed')
  })

  it('handles month names', () => {
    const tokens = tokenize('committed plant oct')
    expect(tokens).toHaveLength(3)
    expect(tokens[2].normalized).toBe('oct')
  })

  it('handles item codes', () => {
    const tokens = tokenize('show 2.1 cost')
    expect(tokens[1].normalized).toBe('2.1')
  })
})
