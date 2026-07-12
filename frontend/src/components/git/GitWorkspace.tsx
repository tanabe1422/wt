import { useCallback, useRef } from 'react'

import { useBusy } from '../../hooks/useBusy'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useGitDestructiveConfirm } from '../../hooks/useGitDestructiveConfirm'
import { useGitDiff } from '../../hooks/useGitDiff'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useGitWorkspaceActions } from '../../hooks/useGitWorkspaceActions'
import { useSectionSelection } from '../../hooks/useSectionSelection'
import { isConflict } from '../../utils/gitStatus'
import { ContextMenu } from '../ui/ContextMenu'
import { ResizeHandle } from '../ui/ResizeHandle'
import { cx } from '../../utils/cx'
import { ChangesPanel } from './ChangesPanel'
import { CommitBar } from './CommitBar'
import { DiffView } from './DiffView'
import { GitWorkspaceDialogs } from './GitWorkspaceDialogs'
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
  const { busy, runBusy } = useBusy(onBusyChange)
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
  const conflictCount = unstaged.filter(isConflict).length

  const { diff, loading: diffLoading, error: diffError, reload: reloadDiff } = useGitDiff(
    worktreePath,
    focusFile?.path ?? null,
    focusFile?.staged ?? false,
  )

  const statusErrorDialog = useErrorDialog(error)
  const diffErrorDialog = useErrorDialog(diffError)
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

  const clearUnstaged = useCallback(() => {
    clearSection('unstaged')
  }, [clearSection])

  const refreshMergeStateRef = useRef<() => Promise<void>>(async () => undefined)

  const destructive = useGitDestructiveConfirm({
    worktreePath,
    unstaged,
    stagedCount: staged.length,
    unstagedCount: unstaged.length,
    runBusy,
    clearAll,
    clearUnstaged,
    afterDestructive: async () => {
      await reload()
      await refreshSidebar()
      await reloadDiff()
      await refreshMergeStateRef.current()
    },
  })

  const actions = useGitWorkspaceActions({
    worktreePath,
    staged,
    unstaged,
    stagedSelectionPaths: stagedSelection.paths,
    unstagedSelectionPaths: unstagedSelection.paths,
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
    requestDeletePaths: destructive.requestDeletePaths,
    requestDiscardTrackedPaths: destructive.requestDiscardTrackedPaths,
    runBusy,
  })

  refreshMergeStateRef.current = actions.refreshMergeState

  const externalToolErrorDialog = useErrorDialog(actions.externalToolError)

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
            conflictCount={conflictCount}
            merging={actions.merging}
            onFileClick={handleClick}
            onFileContextMenu={actions.handleFileContextMenu}
            onStage={(path) => void actions.handleStage(path)}
            onUnstage={(path) => void actions.handleUnstage(path)}
            onStageSelected={() => void actions.handleStageSelected()}
            onUnstageSelected={() => void actions.handleUnstageSelected()}
            onStageAll={() => void actions.handleStageAll()}
            onUnstageAll={() => void actions.handleUnstageAll()}
            onDiscardSelected={() =>
              destructive.requestDiscardPaths([...unstagedSelection.paths])
            }
            onDiscardAll={destructive.requestDiscardAll}
            onAbortMerge={destructive.requestAbortMerge}
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
            onStageHunk={(index) => void actions.handleStageHunk(index)}
            onUnstageHunk={(index) => void actions.handleUnstageHunk(index)}
            onDiscardHunk={(index) => void actions.handleDiscardHunk(index)}
          />
        </div>
      </div>
      <CommitBar
        disabled={!worktreePath}
        busy={loading || busy}
        amendInfo={actions.amendInfo}
        onCommit={actions.handleCommit}
        onPush={actions.handlePush}
      />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={closeMenu}
        />
      )}
      <GitWorkspaceDialogs
        confirmOpen={destructive.confirmAction !== null}
        confirmTitle={destructive.confirmTitle}
        confirmMessage={destructive.confirmMessage}
        confirmLabel={destructive.confirmLabel}
        onConfirm={() => {
          void destructive.handleConfirmDestructive()
        }}
        onCancelConfirm={destructive.cancelConfirm}
        statusError={statusErrorDialog}
        diffError={diffErrorDialog}
        externalToolError={externalToolErrorDialog}
      />
    </div>
  )
}
