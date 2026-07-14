import { useCallback, useState } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuItem } from '../components/ui/ContextMenu'
import { useContextMenu } from './useContextMenu'
import { useErrorDialog } from './useErrorDialog'
import { useShowFileInExplorer } from './useShowFileInExplorer'

interface UseHistoryFileContextMenuOptions {
  worktreePath: string
  selectedPath: string | null
  setSelectedPath: (path: string) => void
  openDifftool: (path: string) => Promise<void>
}

export function useHistoryFileContextMenu({
  worktreePath,
  selectedPath,
  setSelectedPath,
  openDifftool,
}: UseHistoryFileContextMenuOptions) {
  const { menu, openMenu, closeMenu } = useContextMenu()
  const { showFileDir, errorDialog: explorerErrorDialog } = useShowFileInExplorer(worktreePath)
  const [toolError, setToolError] = useState<string | null>(null)
  const toolErrorDialog = useErrorDialog(toolError)

  const handleOpenDifftool = useCallback(
    (path: string) => {
      void (async () => {
        try {
          await openDifftool(path)
        } catch (err) {
          setToolError(err instanceof Error ? err.message : '外部ツールの起動に失敗しました')
        }
      })()
    },
    [openDifftool],
  )

  const handleFileContextMenu = useCallback(
    (entry: { path: string }, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (selectedPath !== entry.path) {
        setSelectedPath(entry.path)
      }
      const items: ContextMenuItem[] = [
        {
          label: '差分を外部ツールで開く',
          onClick: () => {
            handleOpenDifftool(entry.path)
          },
        },
        {
          label: 'エクスプローラーで表示',
          onClick: () => {
            showFileDir(entry.path)
          },
        },
      ]
      openMenu(event.clientX, event.clientY, items)
    },
    [handleOpenDifftool, openMenu, selectedPath, setSelectedPath, showFileDir],
  )

  return {
    menu,
    closeMenu,
    handleFileContextMenu,
    explorerErrorDialog,
    toolErrorDialog: {
      open: toolErrorDialog.open,
      message: toolErrorDialog.message,
      dismiss: () => {
        toolErrorDialog.dismiss()
        setToolError(null)
      },
    },
  }
}
