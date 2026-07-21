import { useCallback, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import { buildOpenAppMenuItems, withMenuSeparators } from '../lib/openAppMenu'
import { openInApp } from '../lib/wails'
import type { OpenApp } from '../types'
import { joinWorktreePath } from '../utils/worktreePaths'
import { useContextMenu } from './useContextMenu'
import { useErrorDialog } from './useErrorDialog'
import { useExecutableIcons } from './useExecutableIcons'
import { useShowFileInExplorer } from './useShowFileInExplorer'

interface UseHistoryFileContextMenuOptions {
  worktreePath: string
  openApps?: OpenApp[]
  selectedPath: string | null
  setSelectedPath: (path: string) => void
  openDifftool: (path: string) => Promise<void>
}

export function useHistoryFileContextMenu({
  worktreePath,
  openApps = [],
  selectedPath,
  setSelectedPath,
  openDifftool,
}: UseHistoryFileContextMenuOptions) {
  const { menu, openMenu, closeMenu } = useContextMenu()
  const { showFileDir, errorDialog: explorerErrorDialog } = useShowFileInExplorer(worktreePath)
  const [toolError, setToolError] = useState<string | null>(null)
  const toolErrorDialog = useErrorDialog(toolError)
  const openAppPaths = useMemo(() => openApps.map((app) => app.path), [openApps])
  const openAppIconUrls = useExecutableIcons(openAppPaths)

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

  const handleOpenInApp = useCallback(
    (appID: string, relativePath: string) => {
      void (async () => {
        try {
          await openInApp(appID, joinWorktreePath(worktreePath, relativePath))
        } catch (err) {
          setToolError(err instanceof Error ? err.message : 'アプリで開けませんでした')
        }
      })()
    },
    [worktreePath],
  )

  const handleFileContextMenu = useCallback(
    (entry: { path: string }, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (selectedPath !== entry.path) {
        setSelectedPath(entry.path)
      }
      const openItems = buildOpenAppMenuItems(openApps, openAppIconUrls, (appID) => {
        handleOpenInApp(appID, entry.path)
      })
      const diffItems: ContextMenuEntry[] = [
        {
          label: '差分を外部ツールで開く',
          onClick: () => {
            handleOpenDifftool(entry.path)
          },
        },
      ]
      const fileItems: ContextMenuEntry[] = [
        ...openItems,
        {
          label: 'エクスプローラーで表示',
          onClick: () => {
            showFileDir(entry.path)
          },
        },
      ]
      openMenu(event.clientX, event.clientY, withMenuSeparators(diffItems, fileItems))
    },
    [
      handleOpenDifftool,
      handleOpenInApp,
      openAppIconUrls,
      openApps,
      openMenu,
      selectedPath,
      setSelectedPath,
      showFileDir,
    ],
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
