import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry, ContextMenuItem } from '../components/ui/ContextMenu'
import { invalidateWorktreeDiffs } from '../lib/diffCache'
import {
  amendCommit,
  commit,
  discardHunk,
  discardLines,
  getAmendInfo,
  isMerging,
  openDifftool,
  openMergetool,
  push,
  pushSetUpstream,
  showInExplorer,
  stageAll,
  stageHunk,
  stageLines,
  unstageAll,
  unstageHunk,
  unstageLines,
} from '../lib/wails'
import type { AmendInfo, FileStatus } from '../types'
import { isConflict, isUntracked } from '../utils/gitStatus'
import { worktreeFileDir } from '../utils/worktreePaths'

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
  refreshSidebar,
  clearAll,
  clearSection,
  setFocus,
  openMenu,
  requestDeletePaths,
  requestDiscardTrackedPaths,
  runBusy,
}: UseGitWorkspaceActionsOptions) {
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
    if (!unstaged.some((entry) => !isConflict(entry))) {
      return
    }
    await runBusy(async () => {
      try {
        await stageAll(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar()])
        clearSection('unstaged')
      } catch (err) {
        setExternalToolError(
          err instanceof Error ? err.message : 'すべて追加に失敗しました',
        )
      }
    })
  }, [clearSection, refreshSidebar, reload, runBusy, unstaged, worktreePath])

  const handleUnstageAll = useCallback(async () => {
    if (staged.length === 0) {
      return
    }
    await runBusy(async () => {
      try {
        await unstageAll(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar()])
        clearSection('staged')
      } catch (err) {
        setExternalToolError(
          err instanceof Error ? err.message : 'すべて除くに失敗しました',
        )
      }
    })
  }, [clearSection, refreshSidebar, reload, runBusy, staged.length, worktreePath])

  const handleCommit = useCallback(
    async (message: string, options: { amend: boolean; pushAfterCommit: boolean }) => {
      await runBusy(async () => {
        if (options.amend) {
          await amendCommit(worktreePath, message)
        } else {
          await commit(worktreePath, message)
        }
        clearAll()
        await Promise.all([reload(), refreshSidebar(), refreshAmendInfo()])
        if (options.pushAfterCommit) {
          try {
            if (hasUpstream) {
              await push(worktreePath)
            } else {
              await pushSetUpstream(worktreePath, 'origin')
            }
          } catch (err) {
            const detail = err instanceof Error ? err.message : 'プッシュに失敗しました'
            throw new Error(`push:${detail}`)
          }
          await refreshSidebar()
        }
      })
    },
    [clearAll, hasUpstream, refreshAmendInfo, refreshSidebar, runBusy, worktreePath, reload],
  )

  const handleStageHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await stageHunk(worktreePath, focusFile.path, hunkIndex)
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
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
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
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
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
      })
    },
    [focusFile, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleStageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile?.path || lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await stageLines(worktreePath, focusFile.path, hunkIndex, lineIndices)
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
      })
    },
    [focusFile?.path, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleUnstageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile?.path || lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await unstageLines(worktreePath, focusFile.path, hunkIndex, lineIndices)
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
      })
    },
    [focusFile?.path, refreshSidebar, runBusy, worktreePath, reload, reloadDiff],
  )

  const handleDiscardLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile?.path || lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await discardLines(
          worktreePath,
          focusFile.path,
          hunkIndex,
          lineIndices,
          focusFile.staged,
        )
        invalidateWorktreeDiffs(worktreePath)
        await Promise.all([reload(), refreshSidebar(), reloadDiff()])
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
          invalidateWorktreeDiffs(worktreePath)
          await Promise.all([reload(), refreshSidebar(), reloadDiff(), refreshMergeState()])
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

  const handleShowInExplorer = useCallback(
    (relativePath: string) => {
      void (async () => {
        try {
          await showInExplorer(worktreeFileDir(worktreePath, relativePath))
        } catch (err) {
          setExternalToolError(
            err instanceof Error ? err.message : 'エクスプローラーを開けませんでした',
          )
        }
      })()
    },
    [worktreePath],
  )

  const handleFileContextMenu = useCallback(
    (entry: FileStatus, event: MouseEvent, mode: 'staged' | 'unstaged') => {
      if (entry.isDirectory) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const selectionPaths =
        mode === 'staged' ? stagedSelectionPaths : unstagedSelectionPaths
      const isSelected =
        selectionPaths instanceof Set
          ? selectionPaths.has(entry.path)
          : [...selectionPaths].includes(entry.path)
      if (!isSelected) {
        setFocus(mode, entry.path)
      }
      const showInExplorerItem: ContextMenuItem = {
        label: 'エクスプローラーで表示',
        onClick: () => {
          handleShowInExplorer(entry.path)
        },
      }
      if (isConflict(entry)) {
        openMenu(event.clientX, event.clientY, [
          {
            label: '外部ツールで競合を解決',
            onClick: () => {
              void handleOpenMergetool(entry.path)
            },
          },
          showInExplorerItem,
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
        showInExplorerItem,
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
      handleShowInExplorer,
      openMenu,
      requestDeletePaths,
      requestDiscardTrackedPaths,
      setFocus,
      stagedSelectionPaths,
      unstagedSelectionPaths,
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
    handleStageHunk,
    handleUnstageHunk,
    handleDiscardHunk,
    handleStageLines,
    handleUnstageLines,
    handleDiscardLines,
    handleFileContextMenu,
  }
}
