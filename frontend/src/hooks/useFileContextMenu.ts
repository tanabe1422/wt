import { useCallback } from 'react'
import type { Dispatch, MouseEvent, SetStateAction } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import { invalidateWorktreeDiffs } from '../lib/diffCache'
import { openDifftool, openMergetool, showInExplorer } from '../lib/wails'
import type { FileStatus } from '../types'
import { isConflict, isUntracked } from '../utils/gitStatus'
import { worktreeFileDir } from '../utils/worktreePaths'

interface UseFileContextMenuOptions {
  worktreePath: string
  stagedSelectionPaths: Iterable<string>
  unstagedSelectionPaths: Iterable<string>
  setFocus: (section: 'staged' | 'unstaged', path: string) => void
  openMenu: (x: number, y: number, items: ContextMenuEntry[]) => void
  requestDeletePaths: (paths: string[]) => void
  requestDiscardTrackedPaths: (paths: string[]) => void
  reload: () => Promise<void>
  reloadDiff: () => Promise<void>
  refreshBadge: () => Promise<void>
  refreshOperationState: () => Promise<void>
  runBusy: (action: () => Promise<void>) => Promise<void>
  setExternalToolError: Dispatch<SetStateAction<string | null>>
}

/** Changes パネルのファイルコンテキストメニュー（外部ツール含む）。 */
export function useFileContextMenu({
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
  refreshOperationState,
  runBusy,
  setExternalToolError,
}: UseFileContextMenuOptions) {
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
    [
      refreshBadge,
      refreshOperationState,
      reload,
      reloadDiff,
      runBusy,
      setExternalToolError,
      worktreePath,
    ],
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
    [runBusy, setExternalToolError, worktreePath],
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
    [setExternalToolError, worktreePath],
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

  return { handleFileContextMenu }
}
