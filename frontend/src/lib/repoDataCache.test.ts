import { afterEach, describe, expect, it } from 'vitest'

import type { BranchEntry, FileStatus, WorktreeEntry } from '../types'
import {
  _resetRepoDataCacheForTests,
  _setSidebarFetchedAtForTests,
  _setStatusFetchedAtForTests,
  _sidebarCacheSizeForTests,
  _statusCacheSizeForTests,
  getSidebarCache,
  getStatusCache,
  invalidateRepoCaches,
  invalidateSidebarCache,
  invalidateStatusCache,
  isSidebarCacheFresh,
  isStatusCacheFresh,
  patchSidebarBranches,
  patchSidebarCurrentBranch,
  patchSidebarSelection,
  patchSidebarWorktreesMeta,
  patchWorktreeChangedCount,
  REPO_CACHE_FRESH_MS,
  setSidebarCache,
  setStatusCache,
} from './repoDataCache'

const sampleBranch = (name: string): BranchEntry => ({
  name,
  isCurrent: name === 'main',
  isRemote: false,
  hasUpstream: false,
  aheadCount: 0,
  behindCount: 0,
})

const sampleWorktree = (path: string, branch: string, isMain = false): WorktreeEntry => ({
  path,
  branch,
  isMain,
  isBare: false,
  isLocked: false,
  changedFileCount: 0,
})

const sampleStatus = (path: string): FileStatus => ({
  path,
  index: ' ',
  workTree: 'M',
  staged: false,
  isDirectory: false,
})

describe('repoDataCache', () => {
  afterEach(() => {
    _resetRepoDataCacheForTests()
  })

  it('stores and retrieves sidebar snapshots', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [sampleWorktree('/repo-a', 'main', true)],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    expect(getSidebarCache('/repo-a')?.selectedBranch).toBe('main')
    expect(_sidebarCacheSizeForTests()).toBe(1)
  })

  it('patches selection without dropping lists', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main'), sampleBranch('feature')],
      worktrees: [
        sampleWorktree('/repo-a', 'main', true),
        sampleWorktree('/repo-a-feature', 'feature'),
      ],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    patchSidebarSelection('/repo-a', 'feature', '/repo-a-feature')
    const cached = getSidebarCache('/repo-a')
    expect(cached?.selectedBranch).toBe('feature')
    expect(cached?.selectedWorktree).toBe('/repo-a-feature')
    expect(cached?.branches).toHaveLength(2)
  })

  it('patches branches without dropping worktrees or selection', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [sampleWorktree('/repo-a', 'main', true)],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    const updated = { ...sampleBranch('main'), aheadCount: 0, behindCount: 2 }
    patchSidebarBranches('/repo-a', [updated, sampleBranch('feature')])
    const cached = getSidebarCache('/repo-a')
    expect(cached?.branches).toHaveLength(2)
    expect(cached?.branches[0]?.behindCount).toBe(2)
    expect(cached?.worktrees).toHaveLength(1)
    expect(cached?.selectedBranch).toBe('main')
  })

  it('stores status per worktree and invalidates with the repo', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [
        sampleWorktree('/repo-a', 'main', true),
        sampleWorktree('/repo-a-wt', 'feature'),
      ],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    setStatusCache('/repo-a', [sampleStatus('a.ts')])
    setStatusCache('/repo-a-wt', [sampleStatus('b.ts')])
    setStatusCache('/repo-b', [sampleStatus('c.ts')])

    invalidateRepoCaches('/repo-a')

    expect(getSidebarCache('/repo-a')).toBeUndefined()
    expect(getStatusCache('/repo-a')).toBeUndefined()
    expect(getStatusCache('/repo-a-wt')).toBeUndefined()
    expect(getStatusCache('/repo-b')?.[0]?.path).toBe('c.ts')
  })

  it('supports single-key invalidation', () => {
    setSidebarCache('/repo-a', {
      branches: [],
      worktrees: [],
      selectedBranch: null,
      selectedWorktree: null,
    })
    setStatusCache('/wt', [sampleStatus('a.ts')])
    invalidateSidebarCache('/repo-a')
    invalidateStatusCache('/wt')
    expect(_sidebarCacheSizeForTests()).toBe(0)
    expect(_statusCacheSizeForTests()).toBe(0)
  })

  it('patches a single worktree changed-file count', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [
        sampleWorktree('/repo-a', 'main', true),
        { ...sampleWorktree('/repo-a-wt', 'feature'), changedFileCount: 3 },
      ],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    patchWorktreeChangedCount('/repo-a', '/repo-a-wt', 0)
    const cached = getSidebarCache('/repo-a')
    expect(cached?.worktrees.find((entry) => entry.path === '/repo-a-wt')?.changedFileCount).toBe(0)
    expect(cached?.worktrees.find((entry) => entry.path === '/repo-a')?.changedFileCount).toBe(0)
  })

  it('derives badge count from setStatusCache when sidebar knows the worktree', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [
        sampleWorktree('/repo-a', 'main', true),
        { ...sampleWorktree('/repo-a-wt', 'feature'), changedFileCount: 9 },
      ],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    setStatusCache('/repo-a-wt', [sampleStatus('a.ts'), sampleStatus('b.ts')])
    const cached = getSidebarCache('/repo-a')
    expect(cached?.worktrees.find((entry) => entry.path === '/repo-a-wt')?.changedFileCount).toBe(2)
  })

  it('patches current branch flags and selected worktree branch', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main'), sampleBranch('feature')],
      worktrees: [sampleWorktree('/repo-a', 'main', true)],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    patchSidebarCurrentBranch('/repo-a', 'feature')
    const cached = getSidebarCache('/repo-a')
    expect(cached?.selectedBranch).toBe('feature')
    expect(cached?.branches.find((entry) => entry.name === 'feature')?.isCurrent).toBe(true)
    expect(cached?.branches.find((entry) => entry.name === 'main')?.isCurrent).toBe(false)
    expect(cached?.worktrees[0]?.branch).toBe('feature')
  })

  it('patches worktree meta while preserving prior badge counts', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [{ ...sampleWorktree('/repo-a', 'main', true), changedFileCount: 5 }],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    patchSidebarWorktreesMeta('/repo-a', [
      { ...sampleWorktree('/repo-a', 'main', true), changedFileCount: 0 },
      sampleWorktree('/repo-a-new', 'feature'),
    ])
    const cached = getSidebarCache('/repo-a')
    expect(cached?.worktrees).toHaveLength(2)
    expect(cached?.worktrees[0]?.changedFileCount).toBe(5)
    expect(cached?.worktrees[1]?.changedFileCount).toBe(0)
  })

  it('reports sidebar/status freshness for skip-refetch', () => {
    setSidebarCache('/repo-a', {
      branches: [sampleBranch('main')],
      worktrees: [sampleWorktree('/repo-a', 'main', true)],
      selectedBranch: 'main',
      selectedWorktree: '/repo-a',
    })
    setStatusCache('/repo-a', [sampleStatus('a.ts')])
    expect(isSidebarCacheFresh('/repo-a')).toBe(true)
    expect(isStatusCacheFresh('/repo-a')).toBe(true)

    _setSidebarFetchedAtForTests('/repo-a', Date.now() - REPO_CACHE_FRESH_MS - 1)
    _setStatusFetchedAtForTests('/repo-a', Date.now() - REPO_CACHE_FRESH_MS - 1)
    expect(isSidebarCacheFresh('/repo-a')).toBe(false)
    expect(isStatusCacheFresh('/repo-a')).toBe(false)
  })
})
