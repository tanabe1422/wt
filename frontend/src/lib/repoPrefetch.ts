import {
  getSidebarCache,
  getStatusCache,
  patchWorktreeChangedCount,
  setSidebarCache,
  setStatusCache,
} from './repoDataCache'
import { pickDefaultSelection } from './sidebarSelection'
import {
  getStatus,
  getWorktreeChangedCount,
  listBranches,
  listWorktreesMeta,
} from './wails'

const inFlight = new Map<string, Promise<void>>()

/**
 * Meta + branches でサイドバーキャッシュを温める。
 * GetStatus は並列開始するが、完了は待たない（サイドバー表示をブロックしない）。
 */
async function warmRepo(repoPath: string): Promise<void> {
  try {
    const branchesPromise = listBranches(repoPath)
    const metaPromise = listWorktreesMeta(repoPath)

    let statusStartedFor: string | null = null

    void metaPromise
      .then((meta) => {
        const earlyPath = pickDefaultSelection(meta, [], null).selectedWorktree
        if (earlyPath && !getStatusCache(earlyPath)) {
          statusStartedFor = earlyPath
          void getStatus(earlyPath)
            .then((status) => {
              setStatusCache(earlyPath, status)
            })
            .catch(() => {
              // non-fatal
            })
        }
      })
      .catch(() => {
        // Meta 失敗時は下のフル取得に委ねる
      })

    const [branches, worktrees] = await Promise.all([branchesPromise, metaPromise])
    const selection = pickDefaultSelection(worktrees, branches, null)
    setSidebarCache(repoPath, {
      branches,
      worktrees,
      ...selection,
    })

    const worktreePath = selection.selectedWorktree
    if (worktreePath && !getStatusCache(worktreePath) && worktreePath !== statusStartedFor) {
      void getStatus(worktreePath)
        .then((status) => {
          setStatusCache(worktreePath, status)
        })
        .catch(() => {
          // non-fatal
        })
    }

    // 選択 WT のバッジだけ先に埋める（残りはサイドバー表示後に埋まる）
    if (worktreePath) {
      void getWorktreeChangedCount(worktreePath)
        .then((count) => {
          patchWorktreeChangedCount(repoPath, worktreePath, count)
        })
        .catch(() => {
          // non-fatal
        })
    }
  } catch {
    // Prefetch failures are non-fatal.
  }
}

/**
 * Warm sidebar (+ main/selected worktree status) for a repository tab.
 * Skips when a sidebar snapshot is already cached.
 *
 * Meta のみで一覧を作り、GetStatus を branches と並列にする。
 * 全 WT の git status（バッジ埋め）は起動クリティカルパスに入れない。
 */
export function prefetchRepo(repoPath: string): void {
  if (!repoPath || getSidebarCache(repoPath) || inFlight.has(repoPath)) {
    return
  }

  const promise = warmRepo(repoPath).finally(() => {
    inFlight.delete(repoPath)
  })
  inFlight.set(repoPath, promise)
}

/**
 * 起動時など: prefetch が走っていれば完了を待ち、キャッシュヒットを狙う。
 * 未開始なら kick + await。
 * 完了はサイドバーキャッシュ投入時点（GetStatus 完了は待たない）。
 */
export function ensureRepoPrefetched(repoPath: string): Promise<void> {
  if (!repoPath || getSidebarCache(repoPath)) {
    return Promise.resolve()
  }
  const existing = inFlight.get(repoPath)
  if (existing) {
    return existing
  }
  prefetchRepo(repoPath)
  return inFlight.get(repoPath) ?? Promise.resolve()
}

/** @internal test helper */
export function _resetRepoPrefetchForTests(): void {
  inFlight.clear()
}
