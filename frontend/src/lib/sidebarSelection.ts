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

/**
 * 手動リロード用: WT メタと UI 選択のズレがあれば次の選択を返す。
 * ズレなし（選択 WT が残り、その branch が selectedBranch と一致）なら null。
 */
export function reconcileSelectionAfterMeta(
  worktrees: Pick<WorktreeEntry, 'path' | 'branch' | 'isMain'>[],
  previous: { selectedBranch: string | null; selectedWorktree: string | null },
): { selectedBranch: string | null; selectedWorktree: string | null } | null {
  const currentPath = previous.selectedWorktree
  const currentEntry =
    currentPath && currentPath !== ''
      ? worktrees.find((entry) => entry.path === currentPath)
      : undefined

  if (currentEntry) {
    const wtBranch = currentEntry.branch || null
    if (wtBranch === previous.selectedBranch) {
      return null
    }
    return { selectedWorktree: currentPath, selectedBranch: wtBranch }
  }

  const selectedWorktree = pickDefaultWorktreePath(worktrees, null)
  const selectedBranch =
    worktrees.find((entry) => entry.path === selectedWorktree)?.branch ?? null
  if (
    selectedWorktree === previous.selectedWorktree &&
    selectedBranch === previous.selectedBranch
  ) {
    return null
  }
  return { selectedWorktree, selectedBranch }
}
