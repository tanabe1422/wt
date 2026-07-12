import { describe, expect, it } from 'vitest'

import type { BranchEntry } from '../types'
import type { WorktreeEntry } from '../types'
import {
  collectWorktreeBranches,
  getBranchMarkFlags,
  getSelectedWorktreeBranch,
} from './branchMarks'
import { buildBranchTree, splitBranchTrees } from './branchTree'

const sampleBranches: BranchEntry[] = [
  { name: 'main', isCurrent: false, isRemote: false, hasUpstream: true, aheadCount: 0, behindCount: 0 },
  { name: 'feature/hoge', isCurrent: true, isRemote: false, hasUpstream: true, aheadCount: 5, behindCount: 0 },
  { name: 'feature/bar', isCurrent: false, isRemote: false, hasUpstream: true, aheadCount: 0, behindCount: 2 },
  { name: 'origin/main', isCurrent: false, isRemote: true, hasUpstream: false, aheadCount: 0, behindCount: 0 },
]

const sampleWorktrees: WorktreeEntry[] = [
  {
    path: '/repo',
    branch: 'feature/hoge',
    isMain: true,
    isBare: false,
    isLocked: false,
    changedFileCount: 3,
  },
  {
    path: '/repo-wt-bar',
    branch: 'feature/bar',
    isMain: false,
    isBare: false,
    isLocked: false,
    changedFileCount: 0,
  },
]

describe('branchTree', () => {
  it('nests slash-separated branch names', () => {
    const tree = buildBranchTree(sampleBranches.filter((entry) => !entry.isRemote))
    const feature = tree.find((node) => node.name === 'feature')
    expect(feature?.children.map((node) => node.name).sort()).toEqual(['bar', 'hoge'])
    expect(feature?.children.find((node) => node.name === 'hoge')?.isCurrent).toBe(true)
  })

  it('propagates ahead and behind counts to leaf nodes', () => {
    const tree = buildBranchTree(sampleBranches.filter((entry) => !entry.isRemote))
    const feature = tree.find((node) => node.name === 'feature')
    expect(feature?.children.find((node) => node.name === 'hoge')).toMatchObject({
      aheadCount: 5,
      behindCount: 0,
    })
    expect(feature?.children.find((node) => node.name === 'bar')).toMatchObject({
      aheadCount: 0,
      behindCount: 2,
    })
  })

  it('splits local and remote trees', () => {
    const { local, remote } = splitBranchTrees(sampleBranches)
    expect(local.some((node) => node.name === 'main')).toBe(true)
    expect(remote.some((node) => node.name === 'origin')).toBe(true)
  })
})

describe('branchMarks', () => {
  it('collects branches checked out in worktrees', () => {
    expect([...collectWorktreeBranches(sampleWorktrees)].sort()).toEqual([
      'feature/bar',
      'feature/hoge',
    ])
  })

  it('returns branch for selected worktree', () => {
    expect(getSelectedWorktreeBranch(sampleWorktrees, '/repo')).toBe('feature/hoge')
    expect(getSelectedWorktreeBranch(sampleWorktrees, '/repo-wt-bar')).toBe('feature/bar')
    expect(getSelectedWorktreeBranch(sampleWorktrees, null)).toBeNull()
  })

  it('marks checkout and worktree branches', () => {
    const worktreeBranches = collectWorktreeBranches(sampleWorktrees)
    const checkedOut = getSelectedWorktreeBranch(sampleWorktrees, '/repo')

    expect(getBranchMarkFlags('feature/hoge', checkedOut, worktreeBranches)).toEqual({
      isCheckedOutOnSelected: true,
      hasWorktree: true,
    })
    expect(getBranchMarkFlags('feature/bar', checkedOut, worktreeBranches)).toEqual({
      isCheckedOutOnSelected: false,
      hasWorktree: true,
    })
    expect(getBranchMarkFlags('main', checkedOut, worktreeBranches)).toEqual({
      isCheckedOutOnSelected: false,
      hasWorktree: false,
    })
  })
})
