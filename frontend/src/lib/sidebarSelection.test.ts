import { describe, expect, it } from 'vitest'

import type { BranchEntry, WorktreeEntry } from '../types'
import { pickDefaultSelection, pickDefaultWorktreePath } from './sidebarSelection'

const wt = (path: string, branch: string, isMain = false): WorktreeEntry => ({
  path,
  branch,
  isMain,
  isBare: false,
  isLocked: false,
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
