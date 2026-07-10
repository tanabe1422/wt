export interface Settings {
  repositories: string[]
  activeRepository: string
}

export interface BranchEntry {
  name: string
  isCurrent: boolean
  isRemote: boolean
  aheadCount: number
  behindCount: number
}

export interface WorktreeEntry {
  path: string
  branch: string
  isMain: boolean
  isBare: boolean
  isLocked: boolean
  changedFileCount: number
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
