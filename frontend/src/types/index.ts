export type ExternalToolPreset = 'vscode' | 'winmerge' | 'beyondcompare' | 'custom'

export interface ExternalTool {
  preset: ExternalToolPreset | string
  path: string
  args: string
}

export type OpenAppIcon = 'cursor' | 'zed' | 'vscode' | 'generic'

export interface OpenApp {
  id: string
  name: string
  path: string
  args: string
  icon: OpenAppIcon | string
}

export interface Settings {
  repositories: string[]
  activeRepository: string
  diffTool: ExternalTool
  mergeTool: ExternalTool
  /** Apps that can open a worktree folder from the context menu. */
  openApps?: OpenApp[]
  /** Local branch names excluded from remote cleanup (e.g. main, develop). */
  remoteCleanupExcluded: string[]
  /** Commit 後に自動プッシュするリポジトリ（キーはリポジトリルートパス）。 */
  pushAfterCommit?: Record<string, boolean>
  /** マージ時にファストフォワードを許可するか（キーはリポジトリルート。欠落時は true）。 */
  mergeAllowFastForward?: Record<string, boolean>
  /** Git 実行ログ（コマンド要約 + GIT_TRACE）を %AppData%/wt-manager/logs に書く。 */
  enableGitLogging?: boolean
}

export interface AmendInfo {
  canAmend: boolean
  reason: string
  headMessage: string
}

/** Builtin FSMonitor + untrackedCache for a repository. */
export interface FsMonitorState {
  supported: boolean
  enabled: boolean
}

/** Live / recent git processes for the debug window. */
export interface InflightGitCommand {
  id: number
  dir: string
  args: string[]
  startedAt: number
}

export interface RecentGitCommand {
  dir: string
  args: string[]
  startedAt: number
  endedAt: number
  durationMs: number
  error: string
}

export interface GitDebugSnapshot {
  inflight: InflightGitCommand[]
  recent: RecentGitCommand[]
  /** Commands that started within the last 60 seconds (not capped by recent buffer). */
  lastMinuteCount: number
  /** CLI git with no network (status, rev-parse, …). */
  lastMinuteLocalCount: number
  /** CLI git that may use the network (fetch/pull/push/…). */
  lastMinuteNetworkCount: number
  /** go-git hotpath opens (separate from CLI local). */
  lastMinuteGoGitCount: number
  /** Currently running network CLI git (fetch/pull/push/…). */
  inflightNetworkCount: number
}

export type RepoOperationKind = 'none' | 'merge' | 'rebase'

export interface RepoOperationState {
  kind: RepoOperationKind
}

export interface BranchEntry {
  name: string
  isCurrent: boolean
  isRemote: boolean
  hasUpstream: boolean
  aheadCount: number
  behindCount: number
}

export interface AheadBehind {
  ahead: number
  behind: number
}

export type MergeCheckMode = 'ancestry' | 'content'

export interface RemoteMergeEntry {
  name: string
  merged: boolean
  /** Tip committer date (ISO-8601). */
  lastCommitAt: string
  /** Author of the tip commit. */
  lastAuthor: string
}

export interface WorktreeEntry {
  path: string
  branch: string
  isMain: boolean
  isBare: boolean
  isLocked: boolean
  changedFileCount: number
  /** HEAD のフル SHA。detached 表示用。未取得時は空 */
  head?: string
}

export interface StashEntry {
  index: number
  ref: string
  message: string
}

export interface FileStatus {
  path: string
  index: string
  workTree: string
  staged: boolean
  isDirectory: boolean
}

export interface DiffLine {
  kind: 'add' | 'del' | 'ctx' | 'header'
  content: string
  oldNo?: number
  newNo?: number
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface FileDiff {
  path: string
  hunks: DiffHunk[]
}

export type HistoryScope = 'all' | 'branch'

export type CommitSearchType = 'message' | 'author' | 'path' | 'sha'

export interface CommitParent {
  sha: string
}

export interface CommitAuthor {
  name: string
  email?: string
  date: string
}

export interface CommitDetails {
  author: CommitAuthor
  message: string
}

export interface CommitLogEntry {
  sha: string
  commit: CommitDetails
  parents: CommitParent[]
}

export interface BranchHead {
  name: string
  commit: { sha: string }
}

export interface ListCommitsResult {
  commits: CommitLogEntry[]
  hasMore: boolean
  nextSkip: number
}

export interface CommitFileChange {
  path: string
  oldPath?: string
  status: string
}
