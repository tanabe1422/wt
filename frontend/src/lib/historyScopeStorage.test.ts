import { beforeEach, describe, expect, it } from 'vitest'

import { getHistoryScope, setHistoryScope } from './historyScopeStorage'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null
      },
      setItem(key: string, value: string) {
        store.set(key, String(value))
      },
      clear() {
        store.clear()
      },
      removeItem(key: string) {
        store.delete(key)
      },
    },
  })
}

describe('historyScopeStorage', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
  })

  it('defaults to all when nothing is stored', () => {
    expect(getHistoryScope('/repo/wt-a')).toBe('all')
  })

  it('stores and restores scope per worktree path', () => {
    setHistoryScope('/repo/wt-a', 'branch')
    setHistoryScope('/repo/wt-b', 'all')

    expect(getHistoryScope('/repo/wt-a')).toBe('branch')
    expect(getHistoryScope('/repo/wt-b')).toBe('all')
  })

  it('overwrites the scope for the same worktree', () => {
    setHistoryScope('/repo/wt-a', 'branch')
    setHistoryScope('/repo/wt-a', 'all')

    expect(getHistoryScope('/repo/wt-a')).toBe('all')
  })

  it('ignores empty worktree paths', () => {
    setHistoryScope('', 'branch')
    expect(getHistoryScope('')).toBe('all')
  })

  it('ignores corrupt storage values', () => {
    localStorage.setItem('wt-manager.historyScopeByWorktree', 'not-json')
    expect(getHistoryScope('/repo/wt-a')).toBe('all')

    localStorage.setItem(
      'wt-manager.historyScopeByWorktree',
      JSON.stringify({ '/repo/wt-a': 'invalid', '/repo/wt-b': 'branch' }),
    )
    expect(getHistoryScope('/repo/wt-a')).toBe('all')
    expect(getHistoryScope('/repo/wt-b')).toBe('branch')
  })
})
