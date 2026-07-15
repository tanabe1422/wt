import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import { invalidateWorktreeDiffs } from '../lib/diffCache'
import {
  amendCommit,
  commit,
  continueRebase,
  discardHunk,
  discardLines,
  getAmendInfo,
  getRepoOperationState,
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
import type { AmendInfo, FileStatus, RepoOperationKind } from '../types'
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
  const [repoOperation, setRepoOperation] = useState<RepoOperationKind>('none')
  const [amendInfo, setAmendInfo] = useState<AmendInfo | null>(null)

  const refreshOperationState = useCallback(async () => {
    if (!worktreePath) {
      setRepoOperation('none')
      return
    }
    try {
      const state = await getRepoOperationState(worktreePath)
      setRepoOperation(state.kind)
    } catch {
      setRepoOperation('none')
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
    void refreshOperationState()
  }, [refreshOperationState, unstaged, staged])

  useEffect(() => {
    void refreshAmendInfo()
  }, [refreshAmendInfo, unstaged, staged])

  const conflictCount = unstaged.filter(isConflict).length
  const canContinueRebase =
    repoOperation === 'rebase' && conflictCount === 0 && staged.length > 0
  const commitBlockReason =
    repoOperation === 'rebase'
      ? 'リベース中はバナーの「続行」を使ってください'
      : null

  /** Git 操作は busy、リフレッシュは busy 解除後（体感ブロック短縮） */
  const afterStatusAndBadge = useCallback(async () => {
    await Promise.all([reload(), refreshBadge()])
  }, [reload, refreshBadge])

  const afterStatusBadgeDiff = useCallback(async () => {
    await Promise.all([reload(), refreshBadge(), reloadDiff()])
  }, [reload, refreshBadge, reloadDiff])

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
    if (!unstaged.some((entry) => !isConflict(entry))) {
      return
    }
    await runBusy(async () => {
      try {
        await stageAll(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        setExternalToolError(
          err instanceof Error ? err.message : 'すべて追加に失敗しました',
        )
        return
      }
    })
    await afterStatusAndBadge()
    clearSection('unstaged')
  }, [afterStatusAndBadge, clearSection, runBusy, unstaged, worktreePath])

  const handleUnstageAll = useCallback(async () => {
    if (staged.length === 0) {
      return
    }
    await runBusy(async () => {
      try {
        await unstageAll(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        setExternalToolError(
          err instanceof Error ? err.message : 'すべて除くに失敗しました',
        )
        return
      }
    })
    await afterStatusAndBadge()
    clearSection('staged')
  }, [afterStatusAndBadge, clearSection, runBusy, staged.length, worktreePath])

  const handleCommit = useCallback(
    async (message: string, options: { amend: boolean; pushAfterCommit: boolean }) => {
      await runBusy(async () => {
        if (options.amend) {
          await amendCommit(worktreePath, message)
        } else {
          await commit(worktreePath, message)
        }
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
        }
      })
      clearAll()
      await Promise.all([
        reload(),
        refreshBadge(),
        refreshBranches(),
        refreshAmendInfo(),
        refreshOperationState(),
      ])
    },
    [
      clearAll,
      hasUpstream,
      refreshAmendInfo,
      refreshBadge,
      refreshBranches,
      refreshOperationState,
      runBusy,
      worktreePath,
      reload,
    ],
  )

  const handleContinueRebase = useCallback(async () => {
    if (!canContinueRebase) {
      return
    }
    setExternalToolError(null)
    let keepRefreshing = true
    await runBusy(async () => {
      try {
        await continueRebase(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        const state = await getRepoOperationState(worktreePath)
        if (state.kind === 'rebase') {
          return
        }
        keepRefreshing = false
        setExternalToolError(
          err instanceof Error ? err.message : 'リベースの続行に失敗しました',
        )
      }
    })
    if (!keepRefreshing) {
      return
    }
    await Promise.all([
      reload(),
      refreshBadge(),
      refreshBranches(),
      reloadDiff(),
      refreshOperationState(),
      refreshAmendInfo(),
    ])
  }, [
    canContinueRebase,
    refreshAmendInfo,
    refreshBadge,
    refreshBranches,
    refreshOperationState,
    reload,
    reloadDiff,
    runBusy,
    worktreePath,
  ])

  const handleStageHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await stageHunk(worktreePath, focusFile.path, hunkIndex)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile?.path, runBusy, worktreePath],
  )

  const handleUnstageHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await unstageHunk(worktreePath, focusFile.path, hunkIndex)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile?.path, runBusy, worktreePath],
  )

  const handleDiscardHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile?.path) {
        return
      }
      await runBusy(async () => {
        await discardHunk(worktreePath, focusFile.path, hunkIndex, focusFile.staged)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile, runBusy, worktreePath],
  )

  const handleStageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile?.path || lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await stageLines(worktreePath, focusFile.path, hunkIndex, lineIndices)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile?.path, runBusy, worktreePath],
  )

  const handleUnstageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile?.path || lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await unstageLines(worktreePath, focusFile.path, hunkIndex, lineIndices)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile?.path, runBusy, worktreePath],
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
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile, runBusy, worktreePath],
  )

  const handleOpenMergetool = useCallback(
    async (path: string) => {
      setExternalToolError(null)
      await runBusy(async () => {
        try {
          await openMergetool(worktreePath, path)
          invalidateWorktreeDiffs(worktreePath)
        } catch (err) {
          setExternalToolError(
            err instanceof Error ? err.message : '外部ツールの起動に失敗しました',
          )
          return
        }
      })
      await Promise.all([reload(), refreshBadge(), reloadDiff(), refreshOperationState()])
    },
    [refreshBadge, refreshOperationState, reload, reloadDiff, runBusy, worktreePath],
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
      const showInExplorerItem: ContextMenuEntry = {
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
      const items: ContextMenuEntry[] = [
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
    repoOperation,
    merging: repoOperation === 'merge',
    rebasing: repoOperation === 'rebase',
    canContinueRebase,
    commitBlockReason,
    amendInfo,
    externalToolError,
    refreshOperationState,
    refreshMergeState: refreshOperationState,
    handleContinueRebase,
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
