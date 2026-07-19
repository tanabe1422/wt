import type { BranchEntry, BranchTrack, WorktreeEntry } from '../types'
import {
  getStatusCache,
  isStatusCacheFresh,
  patchWorktreeChangedCount,
} from './repoDataCache'
import { listBranchTracks, getWorktreeChangedCounts } from './wails'

export function sidebarSnapshotEqual(
  branchesA: BranchEntry[],
  worktreesA: WorktreeEntry[],
  branchesB: BranchEntry[],
  worktreesB: WorktreeEntry[],
): boolean {
  if (branchesA.length !== branchesB.length || worktreesA.length !== worktreesB.length) {
    return false
  }
  for (let i = 0; i < branchesA.length; i++) {
    const a = branchesA[i]
    const b = branchesB[i]
    if (
      a.name !== b.name ||
      a.isRemote !== b.isRemote ||
      a.isCurrent !== b.isCurrent ||
      a.aheadCount !== b.aheadCount ||
      a.behindCount !== b.behindCount ||
      a.hasUpstream !== b.hasUpstream
    ) {
      return false
    }
  }
  for (let i = 0; i < worktreesA.length; i++) {
    const a = worktreesA[i]
    const b = worktreesB[i]
    if (
      a.path !== b.path ||
      a.branch !== b.branch ||
      a.isMain !== b.isMain ||
      a.changedFileCount !== b.changedFileCount
    ) {
      return false
    }
  }
  return true
}

/** ListBranches は現行ブランチの track だけ埋める。他は裏で 1 IPC。 */
export async function fillBranchTracks(
  repoPath: string,
  entries: BranchEntry[],
  isCurrent: () => boolean,
  onTracks: (tracks: BranchTrack[]) => void,
): Promise<void> {
  const needsFill = entries.some((entry) => !entry.isRemote && entry.hasUpstream && !entry.isCurrent)
  if (!needsFill) {
    return
  }
  if (!isCurrent()) {
    return
  }
  try {
    const tracks = await listBranchTracks(repoPath)
    if (!isCurrent()) {
      return
    }
    onTracks(tracks)
  } catch {
    // ahead/behind 更新失敗は非致命
  }
}

/** 非現行ブランチの ahead/behind を前回値から引き継ぐ（チラつき防止）。 */
export function mergeBranchTracks(incoming: BranchEntry[], previous: BranchEntry[]): BranchEntry[] {
  const prevByName = new Map(previous.map((entry) => [entry.name, entry]))
  return incoming.map((entry) => {
    if (entry.isRemote || entry.isCurrent || !entry.hasUpstream) {
      return entry
    }
    const prev = prevByName.get(entry.name)
    if (!prev) {
      return entry
    }
    return {
      ...entry,
      aheadCount: prev.aheadCount,
      behindCount: prev.behindCount,
    }
  })
}

/** Meta 差し替え時に既存バッジ（changedFileCount）を path で引き継ぐ。 */
export function mergeWorktreeBadgeCounts(
  incoming: WorktreeEntry[],
  previous: WorktreeEntry[],
): WorktreeEntry[] {
  const prevByPath = new Map(previous.map((entry) => [entry.path, entry]))
  return incoming.map((entry) => {
    const prev = prevByPath.get(entry.path)
    return prev ? { ...entry, changedFileCount: prev.changedFileCount } : entry
  })
}

/**
 * Meta 表示後にバッジを埋める。選択中 WT を先頭にした 1 バッチ IPC（起動クリティカルパス外）。
 */
export async function fillWorktreeBadges(
  repoPath: string,
  entries: WorktreeEntry[],
  preferredPath: string | null,
  isCurrent: () => boolean,
  onCounts: (counts: { path: string; count: number }[]) => void,
): Promise<void> {
  if (entries.length === 0) {
    return
  }
  if (!isCurrent()) {
    return
  }
  const ordered = [...entries].sort((a, b) => {
    if (a.path === preferredPath) return -1
    if (b.path === preferredPath) return 1
    return 0
  })

  const fromStatus: { path: string; count: number; ok: boolean }[] = []
  const needFetch: string[] = []
  for (const entry of ordered) {
    if (isStatusCacheFresh(entry.path)) {
      const cached = getStatusCache(entry.path)
      if (cached) {
        fromStatus.push({ path: entry.path, count: cached.length, ok: true })
        continue
      }
    }
    needFetch.push(entry.path)
  }

  try {
    const fetched =
      needFetch.length > 0 ? await getWorktreeChangedCounts(needFetch) : []
    if (!isCurrent()) {
      return
    }
    const counts = [...fromStatus, ...fetched.filter((item) => item.ok)]
    for (const item of counts) {
      patchWorktreeChangedCount(repoPath, item.path, item.count)
    }
    if (counts.length > 0) {
      onCounts(counts)
    }
  } catch {
    // バッジ更新失敗は非致命
  }
}
