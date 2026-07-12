import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry, ContextMenuItem } from '../components/ui/ContextMenu'
import { commit, discardHunk, getAmendInfo, isMerging, openDifftool, openMergetool, push, stageHunk, unstageHunk, amendCommit } from '../lib/wails'
import type { AmendInfo, FileStatus } from '../types'
import { isConflict, isUntracked } from '../utils/gitStatus'
import { useToast } from './useToast'

interface UseGitWorkspaceActionsOptions {
  worktreePath: string
  staged: FileStatus[]
  unstaged: FileStatus[]
  stagedSelectionPaths: Iterable<string>
  unstagedSelectionPaths: Iterable<string>
  focusFile: { path: string; staged: boolean } | null
  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  reload: () => Promise<void>
  reloadDiff: () => Promise<void>
  refreshSidebar: () => Promise<void>
  clearAll: () => void
  clearSection: (section: 'staged' | 'unstaged') => void
  setFocus: (section: 'staged' | 'unstaged', path: string) => void
  openMenu: (x: number, y: number, items: ContextMenuEntry[]) => void
  requestDeletePaths: (paths: string[]) => void
  requestDiscardTrackedPaths: (paths: string[]) => void
  runBusy: (action: () => Promise<void>) => Promise<void>
}

export function useGitWorkspaceActions({
  worktreePath,
  staged,
  unstaged,
  stagedSelectionPaths,
  unstagedSelectionPaths,
  focusFile,
  stage,
  unstage,
  reload,
  reloadDiff,
  refreshSidebar,
  clearAll,
  clearSection,
  setFocus,
  openMenu,
  requestDeletePaths,
  requestDiscardTrackedPaths,
  runBusy,
}: UseGitWorkspaceActionsOptions) {
  const toast = useToast()
  const [externalToolError, setExternalToolError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [amendInfo, setAmendInfo] = useState<AmendInfo | null>(null)

  const refreshMergeState = useCallback(async () => {
    if (!worktreePath) {
      setMerging(false)
      return
    }
    try {
      setMerging(await isMerging(worktreePath))
    } catch {
      setMerging(false)
    }
  }, [worktreePath])

  const refreshAmendInfo = useCallback(async () => {
    if (!worktreePath) {
      setAmendInfo(null)
      return
    }
    try {
      setAmendInfo(await getAmendInfo(worktreePath))
    } catch {
      setAmendInfo({
        canAmend: false,
        reason: '状態の確認に失敗しました',
        headMessage: '',
      })
    }
  }, [worktreePath])

  useEffect(() => {
    void refreshMergeState()
  }, [refreshMergeState, unstaged, staged])

  useEffect(() => {
    void refreshAmendInfo()
  }, [refreshAmendInfo, unstaged, staged])

  const handleStage = useCallback(
    async (path: string) => {
      await runBusy(async () => {
        await stage([path])
        await refreshSidebar()
        setFocus('staged', path)
      })
    },
    [refreshSidebar, runBusy, setFocus, stage],
  )

  const handleUnstage = useCallback(
    async (path: string) => {
      await runBusy(async () => {
        await unstage([path])
        await refreshSidebar()
        setFocus('unstaged', path)
      })
    },
    [refreshSidebar, runBusy, setFocus, unstage],
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
      await refreshSidebar()
      setFocus('staged', paths[paths.length - 1])
    })
  }, [refreshSidebar, runBusy, setFocus, stage, unstaged, unstagedSelectionPaths])

  const handleUnstageSelected = useCallback(async () => {
    const paths = [...stagedSelectionPaths]
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await unstage(paths)
      await refreshSidebar()
      setFocus('unstaged', paths[paths.length - 1])
    })
  }, [refreshSidebar, runBusy, setFocus, stagedSelectionPaths, unstage])

  const handleStageAll = useCallback(async () => {
    await runBusy(async () => {
      await stage(unstaged.filter((entry) => !isConflict(entry)).map((entry) => entry.path))
      await refreshSidebar()
      clearSection('unstaged')
    })
  }, [clearSection, refreshSidebar, runBusy, stage, unstaged])

  const handleUnstageAll = useCallback(async () => {
    await runBusy(async () => {
      await unstage(staged.map((entry) => entry.path))
      await refreshSidebar()
      clearSection('staged')
    })
  }, [clearSection, refreshSidebar, runBusy, staged, unstage])

  const handleCommit = useCallback(
    async (message: string, options: { amend: boolean }) => {
      await runBusy(async () => {
        if (options.amend) {
          await amendCommit(worktreePath, message)
          toast.success('コミットを修正しました')
        } else {
          await commit(worktreePath, message)
          toast.success('コミットしました')
        }
        clearAll()
        await reload()
        await refreshSidebar()
        await refreshAmendInfo()
      })
    },
    [clearAll, refreshAmendInfo, refreshSidebar, runBusy, toast, worktreePath, reload],
  )

  const handlePush = useCallback(async () => {
    await runBusy(async () => {
      await push(worktreePath)
      await reload()
      await refreshSidebar()
      await refreshAmendInfo()
      toast.success('プッシュしました')
    })
  }, [refreshAmendInfo, refreshSidebar, runBusy, toast, worktreePath, reload])

  const handleStageHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await stageHunk(worktreePath, focusFile.path, hunkIndex)
        await reload()
        await refreshSidebar()
        await reloadDiff()
      })
    },
    [focusFile?.path, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleUnstageHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await unstageHunk(worktreePath, focusFile.path, hunkIndex)
        await reload()
        await refreshSidebar()
        await reloadDiff()
      })
    },
    [focusFile?.path, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleDiscardHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await discardHunk(worktreePath, focusFile.path, hunkIndex, focusFile.staged)
        await reload()
        await refreshSidebar()
        await reloadDiff()
      })
    },
    [focusFile, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleOpenMergetool = useCallback(
    async (path: string) => {
      setExternalToolError(null)
      await runBusy(async () => {
        try {
          await openMergetool(worktreePath, path)
          await reload()
          await refreshSidebar()
          await reloadDiff()
          await refreshMergeState()
        } catch (err) {
          setExternalToolError(
            err instanceof Error ? err.message : '外部ツールの起動に失敗しました',
          )
        }
      })
    },
    [refreshMergeState, refreshSidebar, reload, reloadDiff, runBusy, worktreePath],
  )

  const handleOpenDifftool = useCallback(
    async (path: string, stagedFlag: boolean) => {
      setExternalToolError(null)
      await runBusy(async () => {
        try {
          await openDifftool(worktreePath, path, stagedFlag)
        } catch (err) {
          setExternalToolError(
            err instanceof Error ? err.message : '外部ツールの起動に失敗しました',
          )
        }
      })
    },
    [runBusy, worktreePath],
  )

  const handleFileContextMenu = useCallback(
    (entry: FileStatus, event: MouseEvent, mode: 'staged' | 'unstaged') => {
      if (entry.isDirectory) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (isConflict(entry)) {
        openMenu(event.clientX, event.clientY, [
          {
            label: '外部ツールで競合を解決',
            onClick: () => {
              void handleOpenMergetool(entry.path)
            },
          },
        ])
        return
      }
      const items: ContextMenuItem[] = [
        {
          label: '差分を外部ツールで開く',
          onClick: () => {
            void handleOpenDifftool(entry.path, mode === 'staged')
          },
        },
      ]
      if (mode === 'unstaged') {
        if (isUntracked(entry)) {
          items.push({
            label: 'ファイルを削除',
            onClick: () => {
              requestDeletePaths([entry.path])
            },
          })
        } else {
          items.push({
            label: '変更を破棄',
            onClick: () => {
              requestDiscardTrackedPaths([entry.path])
            },
          })
        }
      }
      openMenu(event.clientX, event.clientY, items)
    },
    [
      handleOpenDifftool,
      handleOpenMergetool,
      openMenu,
      requestDeletePaths,
      requestDiscardTrackedPaths,
    ],
  )

  return {
    merging,
    amendInfo,
    externalToolError,
    refreshMergeState,
    handleStage,
    handleUnstage,
    handleStageSelected,
    handleUnstageSelected,
    handleStageAll,
    handleUnstageAll,
    handleCommit,
    handlePush,
    handleStageHunk,
    handleUnstageHunk,
    handleDiscardHunk,
    handleFileContextMenu,
  }
}
