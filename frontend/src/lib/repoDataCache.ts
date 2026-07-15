import type { BranchEntry, FileStatus, WorktreeEntry } from '../types'

export type SidebarSnapshot = {
  branches: BranchEntry[]
  worktrees: WorktreeEntry[]
  selectedBranch: string | null
  selectedWorktree: string | null
}

const MAX_SIDEBAR_ENTRIES = 12
const MAX_STATUS_ENTRIES = 24

const sidebarCache = new Map<string, SidebarSnapshot>()
const statusCache = new Map<string, FileStatus[]>()

function touch<T>(cache: Map<string, T>, key: string, value: T, max: number): void {
  if (cache.has(key)) {
    cache.delete(key)
  }
  cache.set(key, value)
  while (cache.size > max) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) {
      break
    }
    cache.delete(oldest)
  }
}

export function getSidebarCache(repoPath: string): SidebarSnapshot | undefined {
  const value = sidebarCache.get(repoPath)
  if (value === undefined) {
    return undefined
  }
  sidebarCache.delete(repoPath)
  sidebarCache.set(repoPath, value)
  return value
}

export function setSidebarCache(repoPath: string, snapshot: SidebarSnapshot): void {
  touch(sidebarCache, repoPath, snapshot, MAX_SIDEBAR_ENTRIES)
}

export function patchSidebarSelection(
  repoPath: string,
  selectedBranch: string | null,
  selectedWorktree: string | null,
): void {
  const current = sidebarCache.get(repoPath)
  if (!current) {
    return
  }
  touch(
    sidebarCache,
    repoPath,
    { ...current, selectedBranch, selectedWorktree },
    MAX_SIDEBAR_ENTRIES,
  )
}

/** Push/Fetch など作業ツリーが変わらない更新向け。worktrees はそのまま残す。 */
export function patchSidebarBranches(repoPath: string, branches: BranchEntry[]): void {
  const current = sidebarCache.get(repoPath)
  if (!current) {
    return
  }
  touch(sidebarCache, repoPath, { ...current, branches }, MAX_SIDEBAR_ENTRIES)
}

/** 単一ワークツリーの変更ファイル数バッジを更新する。 */
export function patchWorktreeChangedCount(
  repoPath: string,
  worktreePath: string,
  count: number,
): void {
  const current = sidebarCache.get(repoPath)
  if (!current) {
    return
  }
  const worktrees = current.worktrees.map((entry) =>
    entry.path === worktreePath ? { ...entry, changedFileCount: count } : entry,
  )
  touch(sidebarCache, repoPath, { ...current, worktrees }, MAX_SIDEBAR_ENTRIES)
}

/**
 * ローカルブランチの isCurrent を更新する（ブランチ切替後の楽観／同期更新）。
 * worktrees の branch フィールドは別途更新が必要な場合がある。
 */
export function patchSidebarCurrentBranch(repoPath: string, branchName: string): void {
  const current = sidebarCache.get(repoPath)
  if (!current) {
    return
  }
  const branches = current.branches.map((entry) =>
    entry.isRemote
      ? entry
      : { ...entry, isCurrent: entry.name === branchName },
  )
  const worktrees = current.worktrees.map((entry) =>
    entry.path === current.selectedWorktree ? { ...entry, branch: branchName } : entry,
  )
  touch(
    sidebarCache,
    repoPath,
    {
      ...current,
      branches,
      worktrees,
      selectedBranch: branchName,
    },
    MAX_SIDEBAR_ENTRIES,
  )
}

/** ListWorktreesMeta 結果で path/branch を差し替え、既存バッジを可能な限り引き継ぐ。 */
export function patchSidebarWorktreesMeta(
  repoPath: string,
  meta: WorktreeEntry[],
): void {
  const current = sidebarCache.get(repoPath)
  if (!current) {
    return
  }
  const prevByPath = new Map(current.worktrees.map((entry) => [entry.path, entry]))
  const worktrees = meta.map((entry) => {
    const prev = prevByPath.get(entry.path)
    return prev
      ? { ...entry, changedFileCount: prev.changedFileCount }
      : entry
  })
  touch(sidebarCache, repoPath, { ...current, worktrees }, MAX_SIDEBAR_ENTRIES)
}

export function invalidateSidebarCache(repoPath: string): void {
  sidebarCache.delete(repoPath)
}

export function getStatusCache(worktreePath: string): FileStatus[] | undefined {
  const value = statusCache.get(worktreePath)
  if (value === undefined) {
    return undefined
  }
  statusCache.delete(worktreePath)
  statusCache.set(worktreePath, value)
  return value
}

export function setStatusCache(worktreePath: string, entries: FileStatus[]): void {
  touch(statusCache, worktreePath, entries, MAX_STATUS_ENTRIES)
}

export function invalidateStatusCache(worktreePath: string): void {
  statusCache.delete(worktreePath)
}

export function invalidateRepoCaches(repoPath: string): void {
  const sidebar = sidebarCache.get(repoPath)
  if (sidebar) {
    for (const worktree of sidebar.worktrees) {
      statusCache.delete(worktree.path)
    }
  }
  sidebarCache.delete(repoPath)
}

/** @internal test helper */
export function _resetRepoDataCacheForTests(): void {
  sidebarCache.clear()
  statusCache.clear()
}

/** @internal test helper */
export function _sidebarCacheSizeForTests(): number {
  return sidebarCache.size
}

/** @internal test helper */
export function _statusCacheSizeForTests(): number {
  return statusCache.size
}
