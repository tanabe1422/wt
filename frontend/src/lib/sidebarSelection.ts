import type { BranchEntry, WorktreeEntry } from '../types'

/** 既定ワークツリー: 前回選択が残っていればそれ、なければ main、なければ先頭。 */
export function pickDefaultWorktreePath(
  worktrees: Pick<WorktreeEntry, 'path' | 'isMain'>[],
  previousPath?: string | null,
): string | null {
  if (previousPath && worktrees.some((entry) => entry.path === previousPath)) {
    return previousPath
  }
  return worktrees.find((entry) => entry.isMain)?.path ?? worktrees[0]?.path ?? null
}

export function pickDefaultSelection(
  worktrees: WorktreeEntry[],
  branches: BranchEntry[],
  previous?: { selectedBranch: string | null; selectedWorktree: string | null } | null,
): { selectedBranch: string | null; selectedWorktree: string | null } {
  const selectedWorktree = pickDefaultWorktreePath(worktrees, previous?.selectedWorktree)

  const selectedBranch =
    previous?.selectedBranch &&
    branches.some((entry) => !entry.isRemote && entry.name === previous.selectedBranch)
      ? previous.selectedBranch
      : (worktrees.find((entry) => entry.path === selectedWorktree)?.branch ?? null)

  return { selectedWorktree, selectedBranch }
}
