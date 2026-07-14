import { afterEach, describe, expect, it } from 'vitest'

import type { BranchEntry, FileStatus, WorktreeEntry } from '../types'
import {
  _resetRepoDataCacheForTests,
  _sidebarCacheSizeForTests,
  _statusCacheSizeForTests,
  getSidebarCache,
  getStatusCache,
  invalidateRepoCaches,
  invalidateSidebarCache,
  invalidateStatusCache,
  patchSidebarBranches,
  patchSidebarSelection,
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
})
