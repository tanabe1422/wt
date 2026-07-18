import { describe, expect, it } from 'vitest'

import { amendInfoEqual } from './amendInfo'

describe('amendInfoEqual', () => {
  it('treats identical content as equal even when objects differ', () => {
    const a = { canAmend: true, reason: '', headMessage: 'fix' }
    const b = { canAmend: true, reason: '', headMessage: 'fix' }
    expect(amendInfoEqual(a, b)).toBe(true)
  })

  it('detects field changes', () => {
    const a = { canAmend: true, reason: '', headMessage: 'fix' }
    expect(amendInfoEqual(a, { ...a, canAmend: false })).toBe(false)
    expect(amendInfoEqual(a, { ...a, reason: 'blocked' })).toBe(false)
    expect(amendInfoEqual(a, { ...a, headMessage: 'other' })).toBe(false)
  })

  it('handles null', () => {
    expect(amendInfoEqual(null, null)).toBe(true)
    expect(amendInfoEqual(null, { canAmend: false, reason: '', headMessage: '' })).toBe(false)
  })
})
