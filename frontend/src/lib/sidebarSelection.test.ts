import { describe, expect, it } from 'vitest'

import type { BranchEntry, WorktreeEntry } from '../types'
import {
  pickDefaultSelection,
  pickDefaultWorktreePath,
  reconcileSelectionAfterMeta,
  resolveSidebarLoadSelection,
} from './sidebarSelection'

const wt = (path: string, branch: string, isMain = false): WorktreeEntry => ({
  path,
  branch,
  isMain,
  isBare: false,
  isLocked: false,
  isBroken: false,
  changedFileCount: 0,
})

const br = (name: string, isRemote = false): BranchEntry => ({
  name,
  isRemote,
  isCurrent: false,
  aheadCount: 0,
  behindCount: 0,
  hasUpstream: false,
})

describe('pickDefaultWorktreePath', () => {
  it('prefers previous path when still present', () => {
    expect(
      pickDefaultWorktreePath([wt('/main', 'main', true), wt('/feat', 'feat')], '/feat'),
    ).toBe('/feat')
  })

  it('falls back to main then first', () => {
    expect(pickDefaultWorktreePath([wt('/a', 'a'), wt('/b', 'b', true)])).toBe('/b')
    expect(pickDefaultWorktreePath([wt('/a', 'a'), wt('/b', 'b')])).toBe('/a')
    expect(pickDefaultWorktreePath([])).toBeNull()
  })
})

describe('pickDefaultSelection', () => {
  it('keeps previous branch when still local', () => {
    const worktrees = [wt('/main', 'main', true), wt('/feat', 'feat')]
    const branches = [br('main'), br('feat'), br('origin/main', true)]
    expect(
      pickDefaultSelection(worktrees, branches, {
        selectedWorktree: '/feat',
        selectedBranch: 'feat',
      }),
    ).toEqual({ selectedWorktree: '/feat', selectedBranch: 'feat' })
  })

  it('derives branch from chosen worktree when previous is gone', () => {
    const worktrees = [wt('/main', 'main', true)]
    const branches = [br('main')]
    expect(
      pickDefaultSelection(worktrees, branches, {
        selectedWorktree: '/gone',
        selectedBranch: 'gone',
      }),
    ).toEqual({ selectedWorktree: '/main', selectedBranch: 'main' })
  })
})

describe('resolveSidebarLoadSelection', () => {
  it('keeps current worktree and branch when preserveSelection', () => {
    const worktrees = [wt('/main', 'main', true), wt('/feat', 'feat')]
    const branches = [br('main'), br('feat')]
    expect(
      resolveSidebarLoadSelection(
        worktrees,
        branches,
        { selectedWorktree: '/feat', selectedBranch: 'feat' },
        true,
      ),
    ).toEqual({ selectedWorktree: '/feat', selectedBranch: 'feat' })
  })

  it('resets to main when preserveSelection is false', () => {
    const worktrees = [wt('/main', 'main', true), wt('/feat', 'feat')]
    const branches = [br('main'), br('feat')]
    expect(
      resolveSidebarLoadSelection(
        worktrees,
        branches,
        { selectedWorktree: '/feat', selectedBranch: 'feat' },
        false,
      ),
    ).toEqual({ selectedWorktree: '/main', selectedBranch: 'main' })
  })

  it('falls back when preserved worktree is gone but keeps local branch', () => {
    const worktrees = [wt('/main', 'main', true)]
    const branches = [br('main'), br('feat')]
    expect(
      resolveSidebarLoadSelection(
        worktrees,
        branches,
        { selectedWorktree: '/gone', selectedBranch: 'feat' },
        true,
      ),
    ).toEqual({ selectedWorktree: '/main', selectedBranch: 'feat' })
  })
})

describe('reconcileSelectionAfterMeta', () => {
  it('returns null when worktree and branch still match', () => {
    expect(
      reconcileSelectionAfterMeta(
        [wt('/main', 'main', true), wt('/feat', 'feat')],
        { selectedWorktree: '/feat', selectedBranch: 'feat' },
      ),
    ).toBeNull()
  })

  it('updates branch when the selected worktree checked out a different branch', () => {
    expect(
      reconcileSelectionAfterMeta(
        [wt('/main', 'main', true), wt('/feat', 'other')],
        { selectedWorktree: '/feat', selectedBranch: 'feat' },
      ),
    ).toEqual({ selectedWorktree: '/feat', selectedBranch: 'other' })
  })

  it('falls back when the selected worktree is gone', () => {
    expect(
      reconcileSelectionAfterMeta([wt('/main', 'main', true)], {
        selectedWorktree: '/gone',
        selectedBranch: 'gone',
      }),
    ).toEqual({ selectedWorktree: '/main', selectedBranch: 'main' })
  })
})
