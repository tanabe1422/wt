import {
  getSidebarCache,
  getStatusCache,
  setSidebarCache,
  setStatusCache,
  type SidebarSnapshot,
} from './repoDataCache'
import { getStatus, listBranches, listWorktrees } from './wails'

const inFlight = new Set<string>()

function pickDefaultSelection(
  worktrees: SidebarSnapshot['worktrees'],
  branches: SidebarSnapshot['branches'],
  previous?: SidebarSnapshot | null,
): Pick<SidebarSnapshot, 'selectedBranch' | 'selectedWorktree'> {
  const keepWorktree =
    previous?.selectedWorktree &&
    worktrees.some((entry) => entry.path === previous.selectedWorktree)
      ? previous.selectedWorktree
      : (worktrees.find((entry) => entry.isMain)?.path ?? worktrees[0]?.path ?? null)

  const keepBranch =
    previous?.selectedBranch &&
    branches.some((entry) => !entry.isRemote && entry.name === previous.selectedBranch)
      ? previous.selectedBranch
      : (worktrees.find((entry) => entry.path === keepWorktree)?.branch ?? null)

  return {
    selectedWorktree: keepWorktree,
    selectedBranch: keepBranch,
  }
}

/**
 * Warm sidebar (+ main/selected worktree status) for a repository tab.
 * Skips when a sidebar snapshot is already cached.
 */
export function prefetchRepo(repoPath: string): void {
  if (!repoPath || inFlight.has(repoPath) || getSidebarCache(repoPath)) {
    return
  }

  inFlight.add(repoPath)
  void (async () => {
    try {
      const [branches, worktrees] = await Promise.all([
        listBranches(repoPath),
        listWorktrees(repoPath),
      ])
      const selection = pickDefaultSelection(worktrees, branches, null)
      setSidebarCache(repoPath, {
        branches,
        worktrees,
        ...selection,
      })

      const worktreePath = selection.selectedWorktree
      if (worktreePath && !getStatusCache(worktreePath)) {
        const status = await getStatus(worktreePath)
        setStatusCache(worktreePath, status)
      }
    } catch {
      // Prefetch failures are non-fatal.
    } finally {
      inFlight.delete(repoPath)
    }
  })()
}

/** @internal test helper */
export function _resetRepoPrefetchForTests(): void {
  inFlight.clear()
}
