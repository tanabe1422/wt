import { describe, expect, it } from 'vitest'

import type { BranchEntry } from '../types'
import { getBranchMarkFlags } from '../utils/branchMarks'

/** useLocalBranchCleanup の locked 判定と同じ条件 */
function isLocked(
  name: string,
  checkedOutBranch: string | null,
  worktreeBranches: Set<string>,
): boolean {
  const marks = getBranchMarkFlags(name, checkedOutBranch, worktreeBranches)
  return marks.hasWorktree || marks.isCheckedOutOnSelected
}

describe('local branch cleanup lock rules', () => {
  const worktreeBranches = new Set(['main', 'feature/hoge'])

  it('locks worktree-bound and checked-out branches', () => {
    expect(isLocked('main', 'main', worktreeBranches)).toBe(true)
    expect(isLocked('feature/hoge', 'main', worktreeBranches)).toBe(true)
    expect(isLocked('bugfix/xyz', 'main', worktreeBranches)).toBe(false)
  })

  it('filters remote branches out of local cleanup candidates', () => {
    const branches: BranchEntry[] = [
      {
        name: 'main',
        isCurrent: true,
        isRemote: false,
        hasUpstream: true,
        aheadCount: 0,
        behindCount: 0,
      },
      {
        name: 'origin/main',
        isCurrent: false,
        isRemote: true,
        hasUpstream: false,
        aheadCount: 0,
        behindCount: 0,
      },
      {
        name: 'chore/tmp',
        isCurrent: false,
        isRemote: false,
        hasUpstream: false,
        aheadCount: 0,
        behindCount: 0,
      },
    ]
    const local = branches.filter((entry) => !entry.isRemote)
    expect(local.map((entry) => entry.name)).toEqual(['main', 'chore/tmp'])
  })
})
