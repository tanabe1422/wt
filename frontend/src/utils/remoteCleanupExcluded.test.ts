import { describe, expect, it } from 'vitest'

import { isRemoteCleanupExcluded } from './remoteCleanupExcluded'

describe('isRemoteCleanupExcluded', () => {
  it('matches local names against remote-tracking refs', () => {
    expect(isRemoteCleanupExcluded('origin/main', ['main', 'develop'])).toBe(true)
    expect(isRemoteCleanupExcluded('origin/feature/foo', ['main'])).toBe(false)
    expect(isRemoteCleanupExcluded('origin/feature/foo', ['feature/foo'])).toBe(true)
  })

  it('returns false for empty exclusion list', () => {
    expect(isRemoteCleanupExcluded('origin/main', [])).toBe(false)
  })
})
