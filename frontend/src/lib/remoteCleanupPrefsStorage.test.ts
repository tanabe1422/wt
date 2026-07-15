import { beforeEach, describe, expect, it } from 'vitest'

import {
  defaultRemoteCleanupMode,
  defaultRemoteCleanupStatusFilter,
  getRemoteCleanupPrefs,
  setRemoteCleanupPrefs,
} from './remoteCleanupPrefsStorage'

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

describe('remoteCleanupPrefsStorage', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
  })

  it('returns empty prefs when nothing is stored', () => {
    expect(getRemoteCleanupPrefs('/repo-a')).toEqual({})
  })

  it('stores and restores prefs per repository', () => {
    setRemoteCleanupPrefs('/repo-a', {
      baseRef: 'origin/main',
      mode: 'content',
      statusFilter: 'unmerged',
      nameFilter: 'feature/',
    })
    setRemoteCleanupPrefs('/repo-b', { statusFilter: 'all' })

    expect(getRemoteCleanupPrefs('/repo-a')).toEqual({
      baseRef: 'origin/main',
      mode: 'content',
      statusFilter: 'unmerged',
      nameFilter: 'feature/',
    })
    expect(getRemoteCleanupPrefs('/repo-b')).toEqual({ statusFilter: 'all' })
  })

  it('merges partial updates for the same repository', () => {
    setRemoteCleanupPrefs('/repo-a', { baseRef: 'origin/main', mode: 'ancestry' })
    setRemoteCleanupPrefs('/repo-a', { statusFilter: 'all', nameFilter: 'hotfix' })

    expect(getRemoteCleanupPrefs('/repo-a')).toEqual({
      baseRef: 'origin/main',
      mode: 'ancestry',
      statusFilter: 'all',
      nameFilter: 'hotfix',
    })
  })

  it('ignores empty repository paths', () => {
    setRemoteCleanupPrefs('', { baseRef: 'origin/main' })
    expect(getRemoteCleanupPrefs('')).toEqual({})
  })

  it('ignores corrupt storage values', () => {
    localStorage.setItem('wt-manager.remoteCleanupPrefsByRepo', 'not-json')
    expect(getRemoteCleanupPrefs('/repo-a')).toEqual({})

    localStorage.setItem(
      'wt-manager.remoteCleanupPrefsByRepo',
      JSON.stringify({
        '/repo-a': { mode: 'invalid', statusFilter: 'merged', baseRef: 'origin/main' },
      }),
    )
    expect(getRemoteCleanupPrefs('/repo-a')).toEqual({
      baseRef: 'origin/main',
      statusFilter: 'merged',
    })
  })

  it('exposes default mode and status filter', () => {
    expect(defaultRemoteCleanupMode()).toBe('ancestry')
    expect(defaultRemoteCleanupStatusFilter()).toBe('merged')
  })
})
