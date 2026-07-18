/**
 * Git 操作後に必要なリフレッシュ粒度。
 *
 * - status: 現行 WT の getStatus のみ (S)
 * - statusAndBadge: S + 現行 WT の変更ファイル数バッジ (W1)
 * - statusAndBranches: S + listBranches (B)
 * - statusBadgeAndBranches: S + W1 + B
 * - sidebarFull: listBranches + listWorktreesMeta（バッジは裏で順次埋め）(WF)
 * - none: 事後リフレッシュ不要
 */
export type RefreshScope =
  | 'none'
  | 'status'
  | 'statusAndBadge'
  | 'statusAndBranches'
  | 'statusBadgeAndBranches'
  | 'sidebarFull'

/** ワークスペース（変更パネル / Diff / コミット）操作 */
export type WorkspaceGitOp =
  | 'stage'
  | 'unstage'
  | 'stageAll'
  | 'unstageAll'
  | 'hunkOrLine'
  | 'discard'
  | 'discardAll'
  | 'abortOperation'
  | 'continueRebase'
  | 'commit'
  | 'commitAndPush'
  | 'mergetool'
  | 'difftool'

/** ツールバー操作 */
export type ToolbarGitOp =
  | 'fetch'
  | 'push'
  | 'pull'
  | 'createBranch'
  | 'saveStash'
  | 'manualReload'

/** サイドバー操作 */
export type SidebarGitOp =
  | 'switchBranch'
  | 'checkoutRemote'
  | 'mergeOrRebase'
  | 'renameOrDeleteBranch'
  | 'worktreeAddOrRemove'
  | 'stashApplyOrPop'
  | 'stashDrop'

export type GitOp = WorkspaceGitOp | ToolbarGitOp | SidebarGitOp

const WORKSPACE_POLICY: Record<WorkspaceGitOp, RefreshScope> = {
  stage: 'statusAndBadge',
  unstage: 'statusAndBadge',
  stageAll: 'statusAndBadge',
  unstageAll: 'statusAndBadge',
  hunkOrLine: 'statusAndBadge',
  discard: 'statusAndBadge',
  discardAll: 'statusAndBadge',
  abortOperation: 'statusAndBranches',
  continueRebase: 'statusBadgeAndBranches',
  commit: 'statusBadgeAndBranches',
  commitAndPush: 'statusBadgeAndBranches',
  mergetool: 'statusAndBadge',
  difftool: 'none',
}

const TOOLBAR_POLICY: Record<ToolbarGitOp, RefreshScope> = {
  fetch: 'statusAndBranches', // 実行時は toolbarUsesBranchesOnly で B のみ
  push: 'statusAndBranches',
  pull: 'statusBadgeAndBranches',
  createBranch: 'sidebarFull',
  /** 旧 SyncRefreshScope 'light' 相当（作業ツリー + ブランチ表示の再同期） */
  saveStash: 'statusBadgeAndBranches',
  manualReload: 'statusAndBadge',
}

const SIDEBAR_POLICY: Record<SidebarGitOp, RefreshScope> = {
  switchBranch: 'statusBadgeAndBranches',
  checkoutRemote: 'statusBadgeAndBranches',
  mergeOrRebase: 'statusBadgeAndBranches',
  renameOrDeleteBranch: 'sidebarFull',
  worktreeAddOrRemove: 'sidebarFull',
  stashApplyOrPop: 'statusAndBadge',
  stashDrop: 'none',
}

export function refreshScopeFor(op: GitOp): RefreshScope {
  if (op in WORKSPACE_POLICY) {
    return WORKSPACE_POLICY[op as WorkspaceGitOp]
  }
  if (op in TOOLBAR_POLICY) {
    return TOOLBAR_POLICY[op as ToolbarGitOp]
  }
  return SIDEBAR_POLICY[op as SidebarGitOp]
}

export function needsStatus(scope: RefreshScope): boolean {
  return (
    scope === 'status' ||
    scope === 'statusAndBadge' ||
    scope === 'statusAndBranches' ||
    scope === 'statusBadgeAndBranches'
  )
}

export function needsBadge(scope: RefreshScope): boolean {
  return scope === 'statusAndBadge' || scope === 'statusBadgeAndBranches'
}

export function needsBranches(scope: RefreshScope): boolean {
  return (
    scope === 'statusAndBranches' ||
    scope === 'statusBadgeAndBranches' ||
    scope === 'sidebarFull'
  )
}

export function needsSidebarFull(scope: RefreshScope): boolean {
  return scope === 'sidebarFull'
}

/** fetch/push はブランチ一覧をすぐ返し、他ブランチの ahead/behind は裏で埋める */
export function toolbarUsesBranchesOnly(op: ToolbarGitOp): boolean {
  return op === 'fetch' || op === 'push'
}

/** applyRefreshScope / useGitRefresh が実行する副作用フラグ */
export interface RefreshActions {
  reloadSidebar: boolean
  reloadBranches: boolean
  reloadWorktreesMeta: boolean
  refreshBadge: boolean
  bumpWorkspaceContent: boolean
}

const NO_REFRESH: RefreshActions = {
  reloadSidebar: false,
  reloadBranches: false,
  reloadWorktreesMeta: false,
  refreshBadge: false,
  bumpWorkspaceContent: false,
}

/**
 * RefreshScope を具体的な再取得フラグへ展開する。
 * 旧 SyncRefreshScope の挙動に合わせ、status+badge+branches は meta も取る。
 */
export function refreshActionsFor(
  scope: RefreshScope,
  opts: { skipStatus?: boolean } = {},
): RefreshActions {
  if (scope === 'none') {
    return NO_REFRESH
  }
  if (needsSidebarFull(scope)) {
    return {
      ...NO_REFRESH,
      reloadSidebar: true,
      bumpWorkspaceContent: true,
    }
  }

  const wantStatus = needsStatus(scope) && !opts.skipStatus
  const wantBadge = needsBadge(scope)
  const wantBranches = needsBranches(scope)

  // 旧 'light': B + W1 + worktrees meta + workspace content
  if (wantStatus && wantBadge && wantBranches) {
    return {
      reloadSidebar: false,
      reloadBranches: true,
      reloadWorktreesMeta: true,
      refreshBadge: true,
      bumpWorkspaceContent: true,
    }
  }

  return {
    reloadSidebar: false,
    reloadBranches: wantBranches,
    reloadWorktreesMeta: false,
    refreshBadge: wantBadge,
    bumpWorkspaceContent: wantStatus,
  }
}

/** 操作 → 実行フラグ（fetch/push は status をスキップ） */
export function refreshActionsForOp(op: GitOp): RefreshActions {
  const scope = refreshScopeFor(op)
  const skipStatus =
    op === 'fetch' || op === 'push'
      ? toolbarUsesBranchesOnly(op)
      : false
  return refreshActionsFor(scope, { skipStatus })
}
