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
  fetch: 'statusAndBranches', // 実際は B のみ（status 不要）— needsBranches / needsStatus で制御
  push: 'statusAndBranches',
  pull: 'statusBadgeAndBranches',
  createBranch: 'sidebarFull',
  saveStash: 'statusAndBadge',
  manualReload: 'sidebarFull',
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

/** fetch/push はブランチ情報のみ（既存 handleSyncComplete('sidebar') と同等） */
export function toolbarUsesBranchesOnly(op: ToolbarGitOp): boolean {
  return op === 'fetch' || op === 'push'
}
