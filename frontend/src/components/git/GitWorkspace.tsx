import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useGitDiff } from '../../hooks/useGitDiff'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useSectionSelection } from '../../hooks/useSectionSelection'
import {
  commit,
  discardHunk,
  isConflict,
  openMergetool,
  push,
  stageHunk,
  unstageHunk,
} from '../../lib/wails'
import type { FileStatus } from '../../types'
import { ContextMenu } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import { cx } from '../../utils/cx'
import { ChangesPanel } from './ChangesPanel'
import { CommitBar } from './CommitBar'
import { DiffView } from './DiffView'
import styles from './GitWorkspace.module.css'

interface GitWorkspaceProps {
  worktreePath: string
  onSidebarReload?: () => void | Promise<void>
  onBusyChange?: (busy: boolean) => void
}

const FILES_SPLIT_STORAGE_KEY = 'wt-manager.filesSplitRatio'
const FILES_SPLIT_DEFAULT_RATIO = 0.4
const FILES_SPLIT_MIN_RATIO = 0.2
const FILES_SPLIT_MAX_RATIO = 0.75

export function GitWorkspace({
  worktreePath,
  onSidebarReload,
  onBusyChange,
}: GitWorkspaceProps) {
  const [busy, setBusy] = useState(false)
  const [mergetoolError, setMergetoolError] = useState<string | null>(null)

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  const {
    stagedSelection,
    unstagedSelection,
    handleClick,
    clearSection,
    clearAll,
    setFocus,
  } = useSectionSelection()
  const {
    staged,
    unstaged,
    loading,
    error,
    reload,
    stage,
    unstage,
  } = useGitStatus(worktreePath)
  const { menu, openMenu, closeMenu } = useContextMenu()

  const focusFile =
    stagedSelection.focus !== null
      ? { path: stagedSelection.focus, staged: true as const }
      : unstagedSelection.focus !== null
        ? { path: unstagedSelection.focus, staged: false as const }
        : null

  const focusEntry =
    focusFile === null
      ? null
      : [...staged, ...unstaged].find((entry) => entry.path === focusFile.path) ?? null
  const focusIsConflict = focusEntry ? isConflict(focusEntry) : false

  const { diff, loading: diffLoading, error: diffError, reload: reloadDiff } = useGitDiff(
    worktreePath,
    focusFile?.path ?? null,
    focusFile?.staged ?? false,
  )

  const statusErrorDialog = useErrorDialog(error)
  const diffErrorDialog = useErrorDialog(diffError)
  const mergetoolErrorDialog = useErrorDialog(mergetoolError)
  const { ratio, resizing, splitRef, handleResizeStart } = useResizableSplit({
    storageKey: FILES_SPLIT_STORAGE_KEY,
    defaultRatio: FILES_SPLIT_DEFAULT_RATIO,
    minRatio: FILES_SPLIT_MIN_RATIO,
    maxRatio: FILES_SPLIT_MAX_RATIO,
    orientation: 'horizontal',
  })

  const refreshSidebar = useCallback(async () => {
    await onSidebarReload?.()
  }, [onSidebarReload])

  const runBusy = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }, [])

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
    const paths = [...unstagedSelection.paths].filter((path) => {
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
  }, [refreshSidebar, runBusy, setFocus, stage, unstaged, unstagedSelection.paths])

  const handleUnstageSelected = useCallback(async () => {
    const paths = [...stagedSelection.paths]
    if (paths.length === 0) {
      return
    }
    await runBusy(async () => {
      await unstage(paths)
      await refreshSidebar()
      setFocus('unstaged', paths[paths.length - 1])
    })
  }, [refreshSidebar, runBusy, setFocus, stagedSelection.paths, unstage])

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
    async (message: string) => {
      await runBusy(async () => {
        await commit(worktreePath, message)
        clearAll()
        await reload()
        await refreshSidebar()
      })
    },
    [clearAll, refreshSidebar, runBusy, worktreePath, reload],
  )

  const handlePush = useCallback(async () => {
    await runBusy(async () => {
      await push(worktreePath)
      await reload()
      await refreshSidebar()
    })
  }, [refreshSidebar, runBusy, worktreePath, reload])

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
      setMergetoolError(null)
      await runBusy(async () => {
        try {
          await openMergetool(worktreePath, path)
          await reload()
          await refreshSidebar()
          await reloadDiff()
        } catch (err) {
          setMergetoolError(
            err instanceof Error ? err.message : '外部ツールの起動に失敗しました',
          )
        }
      })
    },
    [refreshSidebar, reload, reloadDiff, runBusy, worktreePath],
  )

  const handleFileContextMenu = useCallback(
    (entry: FileStatus, event: MouseEvent) => {
      if (!isConflict(entry)) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      openMenu(event.clientX, event.clientY, [
        {
          label: '外部ツールで競合を解決',
          onClick: () => {
            void handleOpenMergetool(entry.path)
          },
        },
      ])
    },
    [handleOpenMergetool, openMenu],
  )

  if (!worktreePath) {
    return (
      <div className={styles.workspace}>
        <p className={styles.placeholder}>ワークツリーを選択してください</p>
      </div>
    )
  }

  return (
    <div className={styles.workspace}>
      <div
        ref={splitRef}
        className={cx(styles.body, resizing && styles.bodyResizing)}
      >
        <div className={styles.changes} style={{ flex: `${ratio} 1 0%` }}>
          <ChangesPanel
            staged={staged}
            unstaged={unstaged}
            loading={loading}
            stagedSelection={stagedSelection}
            unstagedSelection={unstagedSelection}
            onFileClick={handleClick}
            onFileContextMenu={handleFileContextMenu}
            onStage={(path) => void handleStage(path)}
            onUnstage={(path) => void handleUnstage(path)}
            onStageSelected={() => void handleStageSelected()}
            onUnstageSelected={() => void handleUnstageSelected()}
            onStageAll={() => void handleStageAll()}
            onUnstageAll={() => void handleUnstageAll()}
          />
        </div>
        <ResizeHandle
          orientation="horizontal"
          onPointerDown={handleResizeStart}
          ariaLabel="変更一覧と差分の幅を調整"
          active={resizing}
        />
        <div className={styles.diff} style={{ flex: `${1 - ratio} 1 0%` }}>
          <DiffView
            diff={diff}
            loading={diffLoading && !busy}
            error={diffError}
            file={focusFile?.path ?? null}
            staged={focusFile?.staged ?? false}
            conflict={focusIsConflict}
            busy={busy}
            onStageHunk={(index) => void handleStageHunk(index)}
            onUnstageHunk={(index) => void handleUnstageHunk(index)}
            onDiscardHunk={(index) => void handleDiscardHunk(index)}
          />
        </div>
      </div>
      <CommitBar
        disabled={!worktreePath}
        busy={loading || busy}
        onCommit={handleCommit}
        onPush={handlePush}
      />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={closeMenu}
        />
      )}
      <ErrorDialog
        open={statusErrorDialog.open}
        title="変更の取得に失敗しました"
        message={statusErrorDialog.message}
        onClose={statusErrorDialog.dismiss}
      />
      <ErrorDialog
        open={diffErrorDialog.open}
        title="差分の取得に失敗しました"
        message={diffErrorDialog.message}
        onClose={diffErrorDialog.dismiss}
      />
      <ErrorDialog
        open={mergetoolErrorDialog.open}
        title="競合解決ツールの起動に失敗しました"
        message={mergetoolErrorDialog.message}
        onClose={mergetoolErrorDialog.dismiss}
      />
    </div>
  )
}
