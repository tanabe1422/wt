import type { WorktreeEntry } from '../types'

export interface BranchMarkFlags {
  isCheckedOutOnSelected: boolean
  hasWorktree: boolean
}

export function collectWorktreeBranches(worktrees: WorktreeEntry[]): Set<string> {
  const branches = new Set<string>()
  for (const worktree of worktrees) {
    if (worktree.branch) {
      branches.add(worktree.branch)
    }
  }
  return branches
}

export function getSelectedWorktreeBranch(
  worktrees: WorktreeEntry[],
  selectedWorktreePath: string | null,
): string | null {
  if (!selectedWorktreePath) {
    return null
  }
  return worktrees.find((worktree) => worktree.path === selectedWorktreePath)?.branch ?? null
}

/** ブランチを checkout しているワークツリーのパス。なければ null */
export function findWorktreePathByBranch(
  worktrees: WorktreeEntry[],
  branchName: string,
): string | null {
  return worktrees.find((worktree) => worktree.branch === branchName)?.path ?? null
}

export function getBranchMarkFlags(
  branchName: string,
  checkedOutBranch: string | null,
  worktreeBranches: Set<string>,
): BranchMarkFlags {
  return {
    isCheckedOutOnSelected: Boolean(checkedOutBranch && branchName === checkedOutBranch),
    hasWorktree: worktreeBranches.has(branchName),
  }
}
