import type {
  AmendInfo,
  AheadBehind,
  BranchEntry,
  BranchHead,
  CommitFileChange,
  FileDiff,
  FileStatus,
  ListCommitsResult,
  RemoteMergeEntry,
  RepoOperationState,
  FsMonitorState,
  Settings,
  StashEntry,
  WorktreeEntry,
} from '../../types'

export interface WailsApp {
  Ping(): Promise<string>
  GetSettings(): Promise<Settings>
  SaveSettings(settings: Settings): Promise<Settings>
  AddRepository(path: string): Promise<Settings>
  RemoveRepository(path: string): Promise<Settings>
  SetActiveRepository(path: string): Promise<Settings>
  SetPushAfterCommit(repoPath: string, enabled: boolean): Promise<Settings>
  GetFsMonitor(repoPath: string): Promise<FsMonitorState>
  SetFsMonitor(repoPath: string, enabled: boolean): Promise<FsMonitorState>
  PickDirectory(): Promise<string>
  PickFile(): Promise<string>
  ShowInExplorer(path: string): Promise<void>
  OpenTerminal(path: string): Promise<void>
  ListBranches(repoPath: string): Promise<BranchEntry[]>
  GetBranchAheadBehind(repoPath: string, branch: string): Promise<AheadBehind>
  ListWorktrees(repoPath: string): Promise<WorktreeEntry[]>
  ListWorktreesMeta(repoPath: string): Promise<WorktreeEntry[]>
  GetWorktreeChangedCount(worktreePath: string): Promise<number>
  DefaultWorktreePath(repoPath: string, branch: string): Promise<string>
  AddWorktree(
    repoPath: string,
    targetPath: string,
    branch: string,
    isRemote: boolean,
  ): Promise<string>
  RemoveWorktree(repoPath: string, worktreePath: string, force: boolean): Promise<void>
  GetStatus(worktreePath: string): Promise<FileStatus[]>
  GetFileDiff(worktreePath: string, file: string, staged: boolean): Promise<FileDiff>
  StageFiles(worktreePath: string, paths: string[]): Promise<void>
  StageAll(worktreePath: string): Promise<void>
  UnstageFiles(worktreePath: string, paths: string[]): Promise<void>
  UnstageAll(worktreePath: string): Promise<void>
  StageHunk(worktreePath: string, file: string, hunkIndex: number): Promise<void>
  UnstageHunk(worktreePath: string, file: string, hunkIndex: number): Promise<void>
  DiscardHunk(worktreePath: string, file: string, hunkIndex: number, staged: boolean): Promise<void>
  StageLines(worktreePath: string, file: string, hunkIndex: number, lineIndices: number[]): Promise<void>
  UnstageLines(worktreePath: string, file: string, hunkIndex: number, lineIndices: number[]): Promise<void>
  DiscardLines(
    worktreePath: string,
    file: string,
    hunkIndex: number,
    lineIndices: number[],
    staged: boolean,
  ): Promise<void>
  DiscardFiles(worktreePath: string, paths: string[]): Promise<void>
  DeleteUntracked(worktreePath: string, paths: string[]): Promise<void>
  DiscardAllChanges(worktreePath: string): Promise<void>
  AbortMerge(worktreePath: string): Promise<void>
  AbortRebase(worktreePath: string): Promise<void>
  IsMerging(worktreePath: string): Promise<boolean>
  IsRebasing(worktreePath: string): Promise<boolean>
  GetRepoOperationState(worktreePath: string): Promise<RepoOperationState>
  ContinueRebase(worktreePath: string): Promise<void>
  RebaseBranch(worktreePath: string, upstream: string): Promise<void>
  Commit(worktreePath: string, message: string): Promise<void>
  GetAmendInfo(worktreePath: string): Promise<AmendInfo>
  AmendCommit(worktreePath: string, message: string): Promise<void>
  Fetch(worktreePath: string): Promise<void>
  FetchPrune(worktreePath: string): Promise<string[]>
  Pull(worktreePath: string): Promise<void>
  PullRebase(worktreePath: string): Promise<void>
  Push(worktreePath: string): Promise<void>
  PushSetUpstream(worktreePath: string, remote: string): Promise<void>
  OpenMergetool(worktreePath: string, file: string): Promise<void>
  OpenDifftool(worktreePath: string, file: string, staged: boolean): Promise<void>
  OpenCommitDifftool(worktreePath: string, sha: string, file: string): Promise<void>
  OpenRangeDifftool(
    worktreePath: string,
    fromRef: string,
    toRef: string,
    file: string,
  ): Promise<void>
  ListCommits(
    worktreePath: string,
    scope: string,
    branch: string,
    skip: number,
    limit: number,
    searchType: string,
    searchQuery: string,
  ): Promise<ListCommitsResult>
  ListBranchHeads(worktreePath: string): Promise<BranchHead[]>
  ListCommitFiles(worktreePath: string, sha: string): Promise<CommitFileChange[]>
  GetCommitFileDiff(worktreePath: string, sha: string, file: string): Promise<FileDiff>
  ListRangeFiles(worktreePath: string, fromRef: string, toRef: string): Promise<CommitFileChange[]>
  GetRangeFileDiff(
    worktreePath: string,
    fromRef: string,
    toRef: string,
    file: string,
  ): Promise<FileDiff>
  SwitchBranch(worktreePath: string, branch: string): Promise<void>
  CheckoutRemoteBranch(worktreePath: string, remoteRef: string): Promise<void>
  CreateBranch(worktreePath: string, name: string): Promise<void>
  DeleteBranch(worktreePath: string, name: string, force: boolean): Promise<void>
  DefaultRemoteBaseRef(worktreePath: string): Promise<string>
  ListRemoteMergeStatus(
    worktreePath: string,
    baseRef: string,
    mode: string,
  ): Promise<RemoteMergeEntry[]>
  DeleteRemoteBranches(worktreePath: string, remoteRefs: string[]): Promise<void>
  RenameBranch(worktreePath: string, oldName: string, newName: string): Promise<void>
  MergeBranch(worktreePath: string, source: string): Promise<void>
  SquashMergeBranch(worktreePath: string, source: string): Promise<void>
  ResetToCommit(worktreePath: string, sha: string, mode: string): Promise<void>
  ListStashes(worktreePath: string): Promise<StashEntry[]>
  SaveStash(worktreePath: string, message: string, includeUntracked: boolean): Promise<void>
  ApplyStash(worktreePath: string, index: number): Promise<void>
  PopStash(worktreePath: string, index: number): Promise<void>
  DropStash(worktreePath: string, index: number): Promise<void>
}
