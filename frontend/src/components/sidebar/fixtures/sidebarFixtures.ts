import type { BranchEntry, WorktreeEntry } from '../../../types'

export const FIXTURE_REPO_ROOT = 'C:/dev/sample-repo'

function worktree(
  suffix: string,
  branch: string,
  options: Partial<WorktreeEntry> = {},
): WorktreeEntry {
  const isMain = suffix === ''
  return {
    path: isMain ? FIXTURE_REPO_ROOT : `${FIXTURE_REPO_ROOT}-${suffix}`,
    branch,
    isMain,
    isBare: false,
    isLocked: false,
    changedFileCount: 0,
    ...options,
  }
}

function branch(
  name: string,
  options: Partial<BranchEntry> = {},
): BranchEntry {
  return {
    name,
    isCurrent: false,
    isRemote: false,
    hasUpstream: true,
    aheadCount: 0,
    behindCount: 0,
    ...options,
  }
}

function remoteBranch(name: string): BranchEntry {
  return {
    name,
    isCurrent: false,
    isRemote: true,
    hasUpstream: false,
    aheadCount: 0,
    behindCount: 0,
  }
}

/** 変更ファイルバッジなし */
export const worktreesClean: WorktreeEntry[] = [
  worktree('', 'main', { isMain: true, changedFileCount: 0 }),
  worktree('wt-feature', 'feature/sync-badge', { changedFileCount: 0 }),
]

/** 変更ファイル数のバリエーション */
export const worktreesChangeCounts: WorktreeEntry[] = [
  worktree('', 'main', { isMain: true, changedFileCount: 1 }),
  worktree('wt-few', 'feature/few', { changedFileCount: 5 }),
  worktree('wt-many', 'feature/many', { changedFileCount: 23 }),
  worktree('wt-huge', 'feature/huge', { changedFileCount: 150 }),
]

/** メインのみ変更あり */
export const worktreesMainDirty: WorktreeEntry[] = [
  worktree('', 'feature/hoge', { isMain: true, changedFileCount: 7 }),
  worktree('wt-feature-bar', 'feature/bar', { changedFileCount: 0 }),
]

/** detached HEAD */
export const DETACHED_HEAD_SHA = 'a1b2c3d4e5f6789012345678abcdef01'

export const worktreesDetached: WorktreeEntry[] = [
  worktree('', 'main', { isMain: true, changedFileCount: 0 }),
  worktree('wt-detached', '', {
    changedFileCount: 3,
    head: DETACHED_HEAD_SHA,
  }),
]

/** detached 時: どのローカルも isCurrent でない */
export const branchesDetached: BranchEntry[] = [
  branch('main', { behindCount: 3 }),
  branch('develop', { aheadCount: 2, behindCount: 1 }),
  branch('feature/hoge', { aheadCount: 23 }),
  branch('feature/bar', { behindCount: 5 }),
  remoteBranch('origin/main'),
  remoteBranch('origin/feature/hoge'),
]

/** ahead / behind バッジの単体パターン（フラット一覧用） */
export const branchesBadgePatterns: BranchEntry[] = [
  branch('sync/clean'),
  branch('sync/ahead-only', { aheadCount: 23 }),
  branch('sync/behind-only', { behindCount: 5 }),
  branch('sync/ahead-behind', { aheadCount: 12, behindCount: 3 }),
  branch('sync/large-counts', { aheadCount: 99, behindCount: 150 }),
]

/** ネスト・選択・ワークツリーマーク付きの複合パターン */
export const branchesComposite: BranchEntry[] = [
  branch('main', { behindCount: 3 }),
  branch('develop', { aheadCount: 2, behindCount: 1 }),
  branch('feature/hoge', { isCurrent: true, aheadCount: 23 }),
  branch('feature/bar', { behindCount: 5 }),
  branch('feature/sync-badge', { aheadCount: 12, behindCount: 3 }),
  branch('bugfix/xyz', { aheadCount: 2, behindCount: 1 }),
  remoteBranch('origin/main'),
  remoteBranch('origin/feature/hoge'),
  remoteBranch('origin/feature/bar'),
]

export const worktreesComposite: WorktreeEntry[] = [
  worktree('', 'feature/hoge', { isMain: true, changedFileCount: 7 }),
  worktree('wt-feature-bar', 'feature/bar', { changedFileCount: 0 }),
  worktree('wt-sync', 'feature/sync-badge', { changedFileCount: 2 }),
]

/** ブランチ区別（ToneDistinction）比較用 — 多めのローカル + WT 混在 */
export const branchesToneDistinction: BranchEntry[] = [
  branch('main', { behindCount: 3 }),
  branch('develop', { aheadCount: 2, behindCount: 1 }),
  branch('release/1.2', { aheadCount: 1 }),
  branch('feature/hoge', { isCurrent: true, aheadCount: 23 }),
  branch('feature/bar', { behindCount: 5 }),
  branch('feature/sync-badge', { aheadCount: 12, behindCount: 3 }),
  branch('feature/login-form'),
  branch('feature/settings-panel', { aheadCount: 4 }),
  branch('feature/dark-theme', { behindCount: 2 }),
  branch('bugfix/xyz', { aheadCount: 2, behindCount: 1 }),
  branch('bugfix/null-crash', { behindCount: 1 }),
  branch('bugfix/scroll-jump'),
  branch('chore/deps-bump', { aheadCount: 6 }),
  branch('chore/ci-cache'),
  branch('hotfix/auth-token', { aheadCount: 1, behindCount: 1 }),
  remoteBranch('origin/main'),
  remoteBranch('origin/develop'),
  remoteBranch('origin/feature/hoge'),
  remoteBranch('origin/feature/bar'),
]

export const worktreesToneDistinction: WorktreeEntry[] = [
  worktree('', 'feature/hoge', { isMain: true, changedFileCount: 7 }),
  worktree('wt-feature-bar', 'feature/bar', { changedFileCount: 0 }),
  worktree('wt-sync', 'feature/sync-badge', { changedFileCount: 2 }),
  worktree('wt-login', 'feature/login-form', { changedFileCount: 1 }),
  worktree('wt-hotfix', 'hotfix/auth-token', { changedFileCount: 0 }),
]

/** フルサイドバー用（CountBadge ストーリー InSidebarContext 相当） */
export const branchesFullSidebar: BranchEntry[] = branchesComposite
export const worktreesFullSidebar: WorktreeEntry[] = worktreesComposite
