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
  listBranchTracks: vi.fn(),
  getWorktreeChangedCounts: vi.fn(),
}))

vi.mock('./repoDataCache', () => ({
  patchWorktreeChangedCount: vi.fn(),
  getStatusCache: vi.fn(),
  isStatusCacheFresh: vi.fn(),
}))

import { getStatusCache, isStatusCacheFresh, patchWorktreeChangedCount } from './repoDataCache'
import { listBranchTracks, getWorktreeChangedCounts } from './wails'

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
    vi.mocked(listBranchTracks).mockReset()
  })

  it('loads all tracks in one call and skips when no non-current upstream locals', async () => {
    vi.mocked(listBranchTracks).mockResolvedValue([
      { name: 'main', ahead: 0, behind: 0 },
      { name: 'feat', ahead: 1, behind: 0 },
      { name: 'other', ahead: 2, behind: 3 },
    ])

    const onTracks = vi.fn()
    const entries = [
      branch({ name: 'main', isCurrent: true, hasUpstream: true }),
      branch({ name: 'feat', hasUpstream: true }),
      branch({ name: 'other', hasUpstream: true }),
      branch({ name: 'origin/main', isRemote: true, hasUpstream: true }),
    ]

    await fillBranchTracks('/repo', entries, () => true, onTracks)

    expect(listBranchTracks).toHaveBeenCalledTimes(1)
    expect(listBranchTracks).toHaveBeenCalledWith('/repo')
    expect(onTracks).toHaveBeenCalledWith([
      { name: 'main', ahead: 0, behind: 0 },
      { name: 'feat', ahead: 1, behind: 0 },
      { name: 'other', ahead: 2, behind: 3 },
    ])
  })

  it('skips IPC when stale before fetch', async () => {
    vi.mocked(listBranchTracks).mockResolvedValue([])
    const onTracks = vi.fn()
    const entries = [branch({ name: 'feat', hasUpstream: true })]

    await fillBranchTracks('/repo', entries, () => false, onTracks)

    expect(listBranchTracks).not.toHaveBeenCalled()
    expect(onTracks).not.toHaveBeenCalled()
  })
})

describe('fillWorktreeBadges', () => {
  beforeEach(() => {
    vi.mocked(getWorktreeChangedCounts).mockReset()
    vi.mocked(patchWorktreeChangedCount).mockReset()
    vi.mocked(getStatusCache).mockReset()
    vi.mocked(isStatusCacheFresh).mockReset()
    vi.mocked(isStatusCacheFresh).mockReturnValue(false)
    vi.mocked(getStatusCache).mockReturnValue(undefined)
  })

  it('batches counts with preferred worktree first', async () => {
    vi.mocked(getWorktreeChangedCounts).mockResolvedValue([
      { path: '/feat', count: 7, ok: true },
      { path: '/main', count: 1, ok: true },
    ])

    const onCounts = vi.fn()
    const entries = [
      worktree({ path: '/main', branch: 'main', isMain: true }),
      worktree({ path: '/feat', branch: 'feat' }),
    ]

    await fillWorktreeBadges('/repo', entries, '/feat', () => true, onCounts)

    expect(getWorktreeChangedCounts).toHaveBeenCalledWith(['/feat', '/main'])
    expect(onCounts).toHaveBeenCalledWith([
      { path: '/feat', count: 7, ok: true },
      { path: '/main', count: 1, ok: true },
    ])
    expect(patchWorktreeChangedCount).toHaveBeenCalledWith('/repo', '/feat', 7)
    expect(patchWorktreeChangedCount).toHaveBeenCalledWith('/repo', '/main', 1)
  })

  it('reuses fresh status cache instead of re-running porcelain', async () => {
    vi.mocked(isStatusCacheFresh).mockImplementation((path) => path === '/feat')
    vi.mocked(getStatusCache).mockImplementation((path) =>
      path === '/feat' ? [{ path: 'a.ts' } as never, { path: 'b.ts' } as never] : undefined,
    )
    vi.mocked(getWorktreeChangedCounts).mockResolvedValue([{ path: '/main', count: 1, ok: true }])

    const onCounts = vi.fn()
    const entries = [
      worktree({ path: '/main', branch: 'main', isMain: true }),
      worktree({ path: '/feat', branch: 'feat' }),
    ]

    await fillWorktreeBadges('/repo', entries, '/feat', () => true, onCounts)

    expect(getWorktreeChangedCounts).toHaveBeenCalledWith(['/main'])
    expect(onCounts).toHaveBeenCalledWith([
      { path: '/feat', count: 2, ok: true },
      { path: '/main', count: 1, ok: true },
    ])
  })

  it('skips failed counts so prior badges are not cleared', async () => {
    vi.mocked(getWorktreeChangedCounts).mockResolvedValue([
      { path: '/feat', count: 0, ok: false },
      { path: '/main', count: 3, ok: true },
    ])
    const onCounts = vi.fn()
    const entries = [
      worktree({ path: '/main', branch: 'main', isMain: true }),
      worktree({ path: '/feat', branch: 'feat' }),
    ]

    await fillWorktreeBadges('/repo', entries, '/feat', () => true, onCounts)

    expect(onCounts).toHaveBeenCalledWith([{ path: '/main', count: 3, ok: true }])
    expect(patchWorktreeChangedCount).toHaveBeenCalledTimes(1)
    expect(patchWorktreeChangedCount).toHaveBeenCalledWith('/repo', '/main', 3)
  })
})
