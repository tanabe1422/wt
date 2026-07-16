import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useBusy, type BusyChangeHandler } from '../../hooks/useBusy'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useGitDestructiveConfirm } from '../../hooks/useGitDestructiveConfirm'
import { useGitDiff } from '../../hooks/useGitDiff'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useGitWorkspaceActions } from '../../hooks/useGitWorkspaceActions'
import { useSectionSelection } from '../../hooks/useSectionSelection'
import { invalidateWorktreeDiffs } from '../../lib/diffCache'
import {
  prefetchWorktreeDiffs,
  prefetchWorktreeHover,
  prefetchWorktreeNeighbors,
} from '../../lib/diffPrefetch'
import { hasStagedChange, hasUnstagedChange, isConflict } from '../../utils/gitStatus'
import { ContextMenu } from '../ui/ContextMenu'
import { ResizeHandle } from '../ui/ResizeHandle'
import { cx } from '../../utils/cx'
import { ChangesPanel } from './ChangesPanel'
import { CommitBar } from './CommitBar'
import { DiffView } from './DiffView'
import { GitWorkspaceDialogs } from './GitWorkspaceDialogs'
import type { FetchPhase } from '../toolbar/GitSyncToolbar'
import styles from './GitWorkspace.module.css'

interface GitWorkspaceProps {
  worktreePath: string
  hasUpstream: boolean
  pushAfterCommit: boolean
  onPushAfterCommitChange: (enabled: boolean) => void
  /** 現行 WT の変更ファイル数バッジのみ */
  onRefreshBadge?: () => void | Promise<void>
  /** ahead/behind・isCurrent */
  onRefreshBranches?: () => void | Promise<void>
  /**
   * 同一 WT 内でコンテンツが変わったとき（ブランチ切替など）。
   * remount せず status / selection を再同期する。
   */
  contentRevision?: number
  /**
   * ウィンドウ復帰など、ローカル変更だけ再取得するとき。
   * 選択は維持し status / フォーカス中 Diff のみ更新する。
   */
  statusRevision?: number
  onBusyChange?: BusyChangeHandler
  /**
   * フェッチ優先 / 裏フェッチ中。差分パネル右下に表示し、操作はブロックしない。
   */
  fetchPhase?: FetchPhase | null
}

const FILES_SPLIT_STORAGE_KEY = 'wt-manager.filesSplitRatio'
const FILES_SPLIT_DEFAULT_RATIO = 0.4
const FILES_SPLIT_MIN_RATIO = 0.2
const FILES_SPLIT_MAX_RATIO = 0.75

export function GitWorkspace({
  worktreePath,
  hasUpstream,
  pushAfterCommit,
  onPushAfterCommitChange,
  onRefreshBadge,
  onRefreshBranches,
  contentRevision = 0,
  statusRevision = 0,
  onBusyChange,
  fetchPhase = null,
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
    entries,
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

  const prefetchTargets = useMemo(
    () => [
      ...entries.filter(hasStagedChange).map((entry) => ({ path: entry.path, staged: true as const })),
      ...entries
        .filter(hasUnstagedChange)
        .map((entry) => ({ path: entry.path, staged: false as const })),
    ],
    [entries],
  )

  // 一括 diff prefetch は idle まで遅延し、起動直後の GetFileDiff 嵐を避ける。
  // フォーカス隣接・hover は即時のまま（下の effect / handleFileHover）。
  useEffect(() => {
    if (loading || !worktreePath || prefetchTargets.length === 0) {
      return
    }
    let cancelled = false
    let cancelPrefetch: (() => void) | undefined
    const start = () => {
      if (cancelled) {
        return
      }
      cancelPrefetch = prefetchWorktreeDiffs(worktreePath, prefetchTargets)
    }

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(start, { timeout: 1200 })
    } else {
      timeoutId = setTimeout(start, 200)
    }

    return () => {
      cancelled = true
      if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      cancelPrefetch?.()
    }
  }, [loading, worktreePath, prefetchTargets])

  useEffect(() => {
    if (!worktreePath || prefetchTargets.length === 0) {
      return
    }
    prefetchWorktreeNeighbors(
      worktreePath,
      prefetchTargets,
      focusFile?.path ?? null,
      focusFile?.staged ?? null,
    )
  }, [worktreePath, prefetchTargets, focusFile?.path, focusFile?.staged])

  const handleFileHover = useCallback(
    (path: string, mode: 'staged' | 'unstaged') => {
      if (!worktreePath) {
        return
      }
      prefetchWorktreeHover(worktreePath, path, mode === 'staged')
    },
    [worktreePath],
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

  const refreshBadge = useCallback(async () => {
    await onRefreshBadge?.()
  }, [onRefreshBadge])

  const refreshBranches = useCallback(async () => {
    await onRefreshBranches?.()
  }, [onRefreshBranches])

  const clearUnstaged = useCallback(() => {
    clearSection('unstaged')
  }, [clearSection])

  const refreshMergeStateRef = useRef<() => Promise<void>>(async () => undefined)
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const reloadDiffRef = useRef(reloadDiff)
  reloadDiffRef.current = reloadDiff
  const contentRevisionSkipRef = useRef(true)
  const statusRevisionSkipRef = useRef(true)

  // 同一 WT 内のコンテンツ変更（ブランチ切替など）: remount せず再同期
  useEffect(() => {
    if (contentRevisionSkipRef.current) {
      contentRevisionSkipRef.current = false
      return
    }
    invalidateWorktreeDiffs(worktreePath)
    clearAll()
    void reloadRef.current()
    void reloadDiffRef.current()
    // reload / reloadDiff はファイル選択で identity が変わるため deps に含めない
  }, [contentRevision, worktreePath, clearAll])

  // ウィンドウ復帰: ローカル status だけ。選択は維持。
  useEffect(() => {
    if (statusRevisionSkipRef.current) {
      statusRevisionSkipRef.current = false
      return
    }
    void reloadRef.current()
    void reloadDiffRef.current()
  }, [statusRevision, worktreePath])

  const destructive = useGitDestructiveConfirm({
    worktreePath,
    unstaged,
    stagedCount: staged.length,
    unstagedCount: unstaged.length,
    runBusy,
    clearAll,
    clearUnstaged,
    afterDestructive: async () => {
      invalidateWorktreeDiffs(worktreePath)
      await Promise.all([
        reload(),
        refreshBadge(),
        refreshBranches(),
        reloadDiff(),
        refreshMergeStateRef.current(),
      ])
    },
  })

  const actions = useGitWorkspaceActions({
    worktreePath,
    hasUpstream,
    staged,
    unstaged,
    stagedSelectionPaths: stagedSelection.paths,
    unstagedSelectionPaths: unstagedSelection.paths,
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
    requestDeletePaths: destructive.requestDeletePaths,
    requestDiscardTrackedPaths: destructive.requestDiscardTrackedPaths,
    runBusy,
  })

  refreshMergeStateRef.current = actions.refreshOperationState

  const handleAbortOperation = useCallback(() => {
    const operation =
      actions.repoOperation === 'rebase'
        ? 'rebase'
        : actions.repoOperation === 'merge' || conflictCount > 0
          ? 'merge'
          : null
    if (operation) {
      destructive.requestAbortOperation(operation)
    }
  }, [actions.repoOperation, conflictCount, destructive])

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
            repoOperation={actions.repoOperation}
            canContinueRebase={actions.canContinueRebase}
            onFileClick={handleClick}
            onFileHover={handleFileHover}
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
            onContinueRebase={() => void actions.handleContinueRebase()}
            onAbortOperation={handleAbortOperation}
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
            onStageLines={(index, lines) => void actions.handleStageLines(index, lines)}
            onUnstageLines={(index, lines) => void actions.handleUnstageLines(index, lines)}
            onDiscardLines={(index, lines) => void actions.handleDiscardLines(index, lines)}
          />
        </div>
        {fetchPhase && !busy ? (
          <div className={styles.backgroundFetch} role="status" aria-live="polite">
            <span className={styles.backgroundFetchSpinner} aria-hidden="true" />
            {fetchPhase === 'priority' ? 'ブランチを取得中…' : '他ブランチを取得中…'}
          </div>
        ) : null}
      </div>
      <CommitBar
        disabled={!worktreePath || Boolean(actions.commitBlockReason)}
        busy={loading || busy}
        amendInfo={actions.amendInfo}
        commitBlockReason={actions.commitBlockReason}
        pushAfterCommit={pushAfterCommit}
        onPushAfterCommitChange={onPushAfterCommitChange}
        onCommit={actions.handleCommit}
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
