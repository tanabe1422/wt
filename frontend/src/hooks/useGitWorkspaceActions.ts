import { useCallback, useState } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import type { FileStatus } from '../types'
import { isConflict } from '../utils/gitStatus'
import { useCommitRebaseActions } from './useCommitRebaseActions'
import { useFileContextMenu } from './useFileContextMenu'
import { useHunkLineActions } from './useHunkLineActions'

interface UseGitWorkspaceActionsOptions {
  worktreePath: string
  hasUpstream: boolean
  staged: FileStatus[]
  unstaged: FileStatus[]
  stagedSelectionPaths: Iterable<string>
  unstagedSelectionPaths: Iterable<string>
  focusFile: { path: string; staged: boolean } | null
  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  reload: () => Promise<void>
  reloadDiff: () => Promise<void>
  /** 現行 WT の変更ファイル数バッジのみ更新（全 WT status は走らない） */
  refreshBadge: () => Promise<void>
  /** ahead/behind・isCurrent 更新 */
  refreshBranches: () => Promise<void>
  clearAll: () => void
  clearSection: (section: 'staged' | 'unstaged') => void
  setFocus: (section: 'staged' | 'unstaged', path: string) => void
  openMenu: (x: number, y: number, items: ContextMenuEntry[]) => void
  requestDeletePaths: (paths: string[]) => void
  requestDiscardTrackedPaths: (paths: string[]) => void
  runBusy: (action: () => Promise<void>) => Promise<void>
}

/** Workspace 操作の薄いファサード（stage 選択系 + 分割フック合成）。 */
export function useGitWorkspaceActions({
  worktreePath,
  hasUpstream,
  staged,
  unstaged,
  stagedSelectionPaths,
  unstagedSelectionPaths,
  focusFile,
  stage,
  unstage,
  reload,
  reloadDiff,
  refreshBadge,
  refreshBranches,
  clearAll,
  clearSection,
  setFocus,
  openMenu,
  requestDeletePaths,
  requestDiscardTrackedPaths,
  runBusy,
}: UseGitWorkspaceActionsOptions) {
  const [externalToolError, setExternalToolError] = useState<string | null>(null)

  const commitRebase = useCommitRebaseActions({
    worktreePath,
    hasUpstream,
    staged,
    unstaged,
    clearAll,
    reload,
    reloadDiff,
    refreshBadge,
    refreshBranches,
    runBusy,
    setExternalToolError,
  })

  const hunkLine = useHunkLineActions({
    worktreePath,
    focusFile,
    reload,
    reloadDiff,
    refreshBadge,
    runBusy,
  })

  const { handleFileContextMenu } = useFileContextMenu({
    worktreePath,
    stagedSelectionPaths,
    unstagedSelectionPaths,
    setFocus,
    openMenu,
    requestDeletePaths,
    requestDiscardTrackedPaths,
    reload,
    reloadDiff,
    refreshBadge,
    refreshOperationState: commitRebase.refreshOperationState,
    runBusy,
    setExternalToolError,
  })

  const handleStage = useCallback(
    async (path: string) => {
      await runBusy(async () => {
        await stage([path])
      })
      setFocus('staged', path)
      void refreshBadge()
    },
    [refreshBadge, runBusy, setFocus, stage],
  )

  const handleUnstage = useCallback(
    async (path: string) => {
      await runBusy(async () => {
        await unstage([path])
      })
      setFocus('unstaged', path)
      void refreshBadge()
    },
    [refreshBadge, runBusy, setFocus, unstage],
  )

  const handleStageSelected = useCallback(async () => {
    const paths = [...unstagedSelectionPaths].filter((path) => {
      const entry = unstaged.find((item) => item.path === path)
      return entry ? !isConflict(entry) : true
    })
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await stage(paths)
    })
    setFocus('staged', paths[paths.length - 1])
    void refreshBadge()
  }, [refreshBadge, runBusy, setFocus, stage, unstaged, unstagedSelectionPaths])

  const handleUnstageSelected = useCallback(async () => {
    const paths = [...stagedSelectionPaths]
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await unstage(paths)
    })
    setFocus('unstaged', paths[paths.length - 1])
    void refreshBadge()
  }, [refreshBadge, runBusy, setFocus, stagedSelectionPaths, unstage])

  const handleStageAll = useCallback(async () => {
    const paths = unstaged.filter((entry) => !isConflict(entry)).map((entry) => entry.path)
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await stage(paths)
    })
    setFocus('staged', paths[paths.length - 1])
    void refreshBadge()
    clearSection('unstaged')
  }, [clearSection, refreshBadge, runBusy, setFocus, stage, unstaged])

  const handleUnstageAll = useCallback(async () => {
    const paths = staged.map((entry) => entry.path)
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await unstage(paths)
    })
    setFocus('unstaged', paths[paths.length - 1])
    void refreshBadge()
    clearSection('staged')
  }, [clearSection, refreshBadge, runBusy, setFocus, staged, unstage])

  return {
    repoOperation: commitRebase.repoOperation,
    merging: commitRebase.merging,
    rebasing: commitRebase.rebasing,
    canContinueRebase: commitRebase.canContinueRebase,
    commitBlockReason: commitRebase.commitBlockReason,
    amendInfo: commitRebase.amendInfo,
    externalToolError,
    refreshOperationState: commitRebase.refreshOperationState,
    refreshMergeState: commitRebase.refreshMergeState,
    handleContinueRebase: commitRebase.handleContinueRebase,
    handleStage,
    handleUnstage,
    handleStageSelected,
    handleUnstageSelected,
    handleStageAll,
    handleUnstageAll,
    handleCommit: commitRebase.handleCommit,
    handleStageHunk: hunkLine.handleStageHunk,
    handleUnstageHunk: hunkLine.handleUnstageHunk,
    handleDiscardHunk: hunkLine.handleDiscardHunk,
    handleStageLines: hunkLine.handleStageLines,
    handleUnstageLines: hunkLine.handleUnstageLines,
    handleDiscardLines: hunkLine.handleDiscardLines,
    handleFileContextMenu,
  }
}
