import type { WorktreeEntry } from '../types'

const SHORT_SHA_LEN = 7

/** branch が空なら detached HEAD */
export function isDetachedWorktree(worktree: Pick<WorktreeEntry, 'branch'>): boolean {
  return !worktree.branch
}

/**
 * ツールバー / 履歴向けの現在ブランチ名。
 * detached 時は selectedBranch にフォールバックせず `'HEAD'`。
 */
export function resolveCurrentBranch(
  worktree: Pick<WorktreeEntry, 'branch'> | null | undefined,
  selectedBranch: string | null | undefined,
): string {
  if (worktree && isDetachedWorktree(worktree)) {
    return 'HEAD'
  }
  return worktree?.branch || selectedBranch || ''
}

/** 先頭7桁。空や短すぎる場合は null */
export function formatShortSha(head: string | null | undefined): string | null {
  const trimmed = (head ?? '').trim()
  if (trimmed.length < SHORT_SHA_LEN) {
    return null
  }
  return trimmed.slice(0, SHORT_SHA_LEN)
}

/** ワークツリー行用: `detached · a1b2c3d` / SHA なしなら `detached` */
export function formatDetachedLabel(head: string | null | undefined): string {
  const short = formatShortSha(head)
  return short ? `detached · ${short}` : 'detached'
}

/** ブランチ一覧上の行用 */
export function formatDetachedHeadRowLabel(head: string | null | undefined): string {
  const short = formatShortSha(head)
  return short ? `detached HEAD · ${short}` : 'detached HEAD'
}

/** 変更パネル案内バナー用 */
export function formatDetachedBannerText(head: string | null | undefined): string {
  const short = formatShortSha(head)
  return short ? `detached HEAD（${short}）` : 'detached HEAD'
}
