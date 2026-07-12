import type {
  AmendInfo,
  BranchEntry,
  BranchHead,
  CommitFileChange,
  FileDiff,
  FileStatus,
  HistoryScope,
  ListCommitsResult,
  Settings,
  StashEntry,
  WorktreeEntry,
} from '../types'
import { mockApp } from './wails/mockApp'
import type { WailsApp } from './wails/types'

export type { WailsApp } from './wails/types'
export {
  hasStagedChange,
  hasUnstagedChange,
  isConflict,
  isUntracked,
} from '../utils/gitStatus'

declare global {
  interface Window {
    go?: {
      app: {
        App: WailsApp
      }
    }
  }
}

function isWailsRuntime(): boolean {
  return typeof window.go?.app?.App !== 'undefined'
}

async function callApp<T>(method: keyof WailsApp, ...args: unknown[]): Promise<T> {
  const wailsApp = window.go?.app?.App
  if (wailsApp) {
    const wailsFn = wailsApp[method]
    if (typeof wailsFn === 'function') {
      return (wailsFn as (...a: unknown[]) => Promise<T>).apply(wailsApp, args)
    }
    throw new Error(
      `API "${String(method)}" が利用できません。wails dev を再起動するか、アプリを再ビルドしてください。`,
    )
  }

  const mockFn = mockApp[method]
  if (typeof mockFn !== 'function') {
    throw new Error(`Mock API "${String(method)}" is not implemented`)
  }
  return (mockFn as (...a: unknown[]) => Promise<T>).apply(mockApp, args)
}

export async function ping(): Promise<string> {
  return callApp('Ping')
}

export async function getSettings(): Promise<Settings> {
  return callApp('GetSettings')
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  return callApp('SaveSettings', settings)
}

export async function addRepository(path: string): Promise<Settings> {
  return callApp('AddRepository', path)
}

export async function removeRepository(path: string): Promise<Settings> {
  return callApp('RemoveRepository', path)
}

export async function setActiveRepository(path: string): Promise<Settings> {
  return callApp('SetActiveRepository', path)
}

export async function pickDirectory(): Promise<string> {
  return callApp('PickDirectory')
}

export async function pickFile(): Promise<string> {
  return callApp('PickFile')
}

export async function showInExplorer(path: string): Promise<void> {
  return callApp('ShowInExplorer', path)
}

export async function openTerminal(path: string): Promise<void> {
  return callApp('OpenTerminal', path)
}

export async function listBranches(repoPath = ''): Promise<BranchEntry[]> {
  return callApp('ListBranches', repoPath)
}

export async function listWorktrees(repoPath = ''): Promise<WorktreeEntry[]> {
  return callApp('ListWorktrees', repoPath)
}

export async function defaultWorktreePath(
  repoPath: string,
  branch: string,
): Promise<string> {
  return callApp('DefaultWorktreePath', repoPath, branch)
}

export async function addWorktree(
  repoPath: string,
  targetPath: string,
  branch: string,
  isRemote: boolean,
): Promise<string> {
  return callApp('AddWorktree', repoPath, targetPath, branch, isRemote)
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force: boolean,
): Promise<void> {
  return callApp('RemoveWorktree', repoPath, worktreePath, force)
}

export async function getStatus(worktreePath: string): Promise<FileStatus[]> {
  return callApp('GetStatus', worktreePath)
}

export async function getFileDiff(
  worktreePath: string,
  file: string,
  staged: boolean,
): Promise<FileDiff> {
  return callApp('GetFileDiff', worktreePath, file, staged)
}

export async function stageFiles(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('StageFiles', worktreePath, paths)
}

export async function unstageFiles(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('UnstageFiles', worktreePath, paths)
}

export async function stageHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
): Promise<void> {
  return callApp('StageHunk', worktreePath, file, hunkIndex)
}

export async function unstageHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
): Promise<void> {
  return callApp('UnstageHunk', worktreePath, file, hunkIndex)
}

export async function discardHunk(
  worktreePath: string,
  file: string,
  hunkIndex: number,
  staged: boolean,
): Promise<void> {
  return callApp('DiscardHunk', worktreePath, file, hunkIndex, staged)
}

export async function discardFiles(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('DiscardFiles', worktreePath, paths)
}

export async function deleteUntracked(worktreePath: string, paths: string[]): Promise<void> {
  return callApp('DeleteUntracked', worktreePath, paths)
}

export async function discardAllChanges(worktreePath: string): Promise<void> {
  return callApp('DiscardAllChanges', worktreePath)
}

export async function abortMerge(worktreePath: string): Promise<void> {
  return callApp('AbortMerge', worktreePath)
}

export async function isMerging(worktreePath: string): Promise<boolean> {
  return callApp('IsMerging', worktreePath)
}

export async function commit(worktreePath: string, message: string): Promise<void> {
  return callApp('Commit', worktreePath, message)
}

export async function getAmendInfo(worktreePath: string): Promise<AmendInfo> {
  return callApp('GetAmendInfo', worktreePath)
}

export async function amendCommit(worktreePath: string, message: string): Promise<void> {
  return callApp('AmendCommit', worktreePath, message)
}

export async function fetchRemote(worktreePath: string): Promise<void> {
  return callApp('Fetch', worktreePath)
}

export async function fetchRemotePrune(worktreePath: string): Promise<string[]> {
  return callApp('FetchPrune', worktreePath)
}

export async function pull(worktreePath: string): Promise<void> {
  return callApp('Pull', worktreePath)
}

export async function push(worktreePath: string): Promise<void> {
  return callApp('Push', worktreePath)
}

export async function pushSetUpstream(worktreePath: string, remote = 'origin'): Promise<void> {
  return callApp('PushSetUpstream', worktreePath, remote)
}

export async function openMergetool(worktreePath: string, file: string): Promise<void> {
  return callApp('OpenMergetool', worktreePath, file)
}

export async function openDifftool(
  worktreePath: string,
  file: string,
  staged: boolean,
): Promise<void> {
  return callApp('OpenDifftool', worktreePath, file, staged)
}

export async function listCommits(
  worktreePath: string,
  scope: HistoryScope,
  branch: string,
  skip: number,
  limit: number,
): Promise<ListCommitsResult> {
  return callApp('ListCommits', worktreePath, scope, branch, skip, limit)
}

export async function listBranchHeads(worktreePath: string): Promise<BranchHead[]> {
  return callApp('ListBranchHeads', worktreePath)
}

export async function listCommitFiles(
  worktreePath: string,
  sha: string,
): Promise<CommitFileChange[]> {
  return callApp('ListCommitFiles', worktreePath, sha)
}

export async function getCommitFileDiff(
  worktreePath: string,
  sha: string,
  file: string,
): Promise<FileDiff> {
  return callApp('GetCommitFileDiff', worktreePath, sha, file)
}

export async function listRangeFiles(
  worktreePath: string,
  fromRef: string,
  toRef: string,
): Promise<CommitFileChange[]> {
  return callApp('ListRangeFiles', worktreePath, fromRef, toRef)
}

export async function getRangeFileDiff(
  worktreePath: string,
  fromRef: string,
  toRef: string,
  file: string,
): Promise<FileDiff> {
  return callApp('GetRangeFileDiff', worktreePath, fromRef, toRef, file)
}

export async function switchBranch(worktreePath: string, branch: string): Promise<void> {
  return callApp('SwitchBranch', worktreePath, branch)
}

export async function checkoutRemoteBranch(
  worktreePath: string,
  remoteRef: string,
): Promise<void> {
  return callApp('CheckoutRemoteBranch', worktreePath, remoteRef)
}

export async function createBranch(worktreePath: string, name: string): Promise<void> {
  return callApp('CreateBranch', worktreePath, name)
}

export async function deleteBranch(
  worktreePath: string,
  name: string,
  force: boolean,
): Promise<void> {
  return callApp('DeleteBranch', worktreePath, name, force)
}

export async function renameBranch(
  worktreePath: string,
  oldName: string,
  newName: string,
): Promise<void> {
  return callApp('RenameBranch', worktreePath, oldName, newName)
}

export async function mergeBranch(worktreePath: string, source: string): Promise<void> {
  return callApp('MergeBranch', worktreePath, source)
}

export async function squashMergeBranch(
  worktreePath: string,
  source: string,
): Promise<void> {
  return callApp('SquashMergeBranch', worktreePath, source)
}

export async function resetToCommit(
  worktreePath: string,
  sha: string,
  mode: string,
): Promise<void> {
  return callApp('ResetToCommit', worktreePath, sha, mode)
}

export async function listStashes(worktreePath: string): Promise<StashEntry[]> {
  return callApp('ListStashes', worktreePath)
}

export async function saveStash(
  worktreePath: string,
  message: string,
  includeUntracked: boolean,
): Promise<void> {
  return callApp('SaveStash', worktreePath, message, includeUntracked)
}

export async function applyStash(worktreePath: string, index: number): Promise<void> {
  return callApp('ApplyStash', worktreePath, index)
}

export async function popStash(worktreePath: string, index: number): Promise<void> {
  return callApp('PopStash', worktreePath, index)
}

export async function dropStash(worktreePath: string, index: number): Promise<void> {
  return callApp('DropStash', worktreePath, index)
}

export function isRunningInWails(): boolean {
  return isWailsRuntime()
}
