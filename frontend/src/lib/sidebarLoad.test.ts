import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BranchEntry, WorktreeEntry } from '../types'
import {
  fillBranchTracks,
  fillWorktreeBadges,
  mergeBranchTracks,
  mergeWorktreeBadgeCounts,
  sidebarSnapshotEqual,
} from './sidebarLoad'

vi.mock('./wails', () => ({
  getBranchAheadBehind: vi.fn(),
  getWorktreeChangedCount: vi.fn(),
}))

vi.mock('./repoDataCache', () => ({
  patchWorktreeChangedCount: vi.fn(),
}))

import { patchWorktreeChangedCount } from './repoDataCache'
import { getBranchAheadBehind, getWorktreeChangedCount } from './wails'

const branch = (partial: Partial<BranchEntry> & Pick<BranchEntry, 'name'>): BranchEntry => ({
  isRemote: false,
  isCurrent: false,
  aheadCount: 0,
  behindCount: 0,
  hasUpstream: false,
  ...partial,
})

const worktree = (
  partial: Partial<WorktreeEntry> & Pick<WorktreeEntry, 'path' | 'branch'>,
): WorktreeEntry => ({
  isMain: false,
  isBare: false,
  isLocked: false,
  changedFileCount: 0,
  ...partial,
})

describe('sidebarSnapshotEqual', () => {
  it('returns true for identical snapshots', () => {
    const branches = [branch({ name: 'main', isCurrent: true })]
    const worktrees = [worktree({ path: '/r', branch: 'main', isMain: true })]
    expect(sidebarSnapshotEqual(branches, worktrees, branches, worktrees)).toBe(true)
  })

  it('detects branch track and worktree badge differences', () => {
    const branchesA = [branch({ name: 'feat', hasUpstream: true, aheadCount: 1 })]
    const branchesB = [branch({ name: 'feat', hasUpstream: true, aheadCount: 2 })]
    const worktreesA = [worktree({ path: '/r', branch: 'feat', changedFileCount: 1 })]
    const worktreesB = [worktree({ path: '/r', branch: 'feat', changedFileCount: 2 })]
    expect(sidebarSnapshotEqual(branchesA, worktreesA, branchesB, worktreesA)).toBe(false)
    expect(sidebarSnapshotEqual(branchesA, worktreesA, branchesA, worktreesB)).toBe(false)
  })
})

describe('mergeBranchTracks', () => {
  it('keeps previous ahead/behind for non-current upstream branches', () => {
    const previous = [
      branch({ name: 'feat', hasUpstream: true, aheadCount: 3, behindCount: 1 }),
      branch({ name: 'main', isCurrent: true, hasUpstream: true, aheadCount: 0 }),
    ]
    const incoming = [
      branch({ name: 'feat', hasUpstream: true, aheadCount: 0, behindCount: 0 }),
      branch({ name: 'main', isCurrent: true, hasUpstream: true, aheadCount: 2 }),
      branch({ name: 'origin/main', isRemote: true }),
    ]
    expect(mergeBranchTracks(incoming, previous)).toEqual([
      branch({ name: 'feat', hasUpstream: true, aheadCount: 3, behindCount: 1 }),
      branch({ name: 'main', isCurrent: true, hasUpstream: true, aheadCount: 2 }),
      branch({ name: 'origin/main', isRemote: true }),
    ])
  })
})

describe('mergeWorktreeBadgeCounts', () => {
  it('preserves changedFileCount by path', () => {
    const previous = [
      worktree({ path: '/main', branch: 'main', isMain: true, changedFileCount: 5 }),
      worktree({ path: '/feat', branch: 'feat', changedFileCount: 2 }),
    ]
    const incoming = [
      worktree({ path: '/main', branch: 'main', isMain: true, changedFileCount: 0 }),
      worktree({ path: '/feat', branch: 'feat', changedFileCount: 0 }),
      worktree({ path: '/new', branch: 'new', changedFileCount: 0 }),
    ]
    expect(mergeWorktreeBadgeCounts(incoming, previous)).toEqual([
      worktree({ path: '/main', branch: 'main', isMain: true, changedFileCount: 5 }),
      worktree({ path: '/feat', branch: 'feat', changedFileCount: 2 }),
      worktree({ path: '/new', branch: 'new', changedFileCount: 0 }),
    ])
  })
})

describe('fillBranchTracks', () => {
  beforeEach(() => {
    vi.mocked(getBranchAheadBehind).mockReset()
  })

  it('fills tracks for non-current upstream locals and stops when stale', async () => {
    vi.mocked(getBranchAheadBehind)
      .mockResolvedValueOnce({ ahead: 1, behind: 0 })
      .mockResolvedValueOnce({ ahead: 2, behind: 3 })

    const onTrack = vi.fn()
    let current = true
    const entries = [
      branch({ name: 'main', isCurrent: true, hasUpstream: true }),
      branch({ name: 'feat', hasUpstream: true }),
      branch({ name: 'other', hasUpstream: true }),
      branch({ name: 'origin/main', isRemote: true, hasUpstream: true }),
    ]

    await fillBranchTracks('/repo', entries, () => current, (name, ahead, behind) => {
      onTrack(name, ahead, behind)
      current = false
    })

    expect(getBranchAheadBehind).toHaveBeenCalledTimes(1)
    expect(getBranchAheadBehind).toHaveBeenCalledWith('/repo', 'feat')
    expect(onTrack).toHaveBeenCalledWith('feat', 1, 0)
  })
})

describe('fillWorktreeBadges', () => {
  beforeEach(() => {
    vi.mocked(getWorktreeChangedCount).mockReset()
    vi.mocked(patchWorktreeChangedCount).mockReset()
  })

  it('prefers selected worktree then continues in order', async () => {
    vi.mocked(getWorktreeChangedCount).mockImplementation(async (path) => {
      if (path === '/feat') return 7
      if (path === '/main') return 1
      return 0
    })

    const onCount = vi.fn()
    const entries = [
      worktree({ path: '/main', branch: 'main', isMain: true }),
      worktree({ path: '/feat', branch: 'feat' }),
    ]

    await fillWorktreeBadges('/repo', entries, '/feat', () => true, onCount)

    expect(vi.mocked(getWorktreeChangedCount).mock.calls.map((call) => call[0])).toEqual([
      '/feat',
      '/main',
    ])
    expect(onCount).toHaveBeenNthCalledWith(1, '/feat', 7)
    expect(onCount).toHaveBeenNthCalledWith(2, '/main', 1)
    expect(patchWorktreeChangedCount).toHaveBeenCalledWith('/repo', '/feat', 7)
  })
})
