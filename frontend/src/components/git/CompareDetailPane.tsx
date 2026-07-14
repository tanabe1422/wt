import { useCallback, useEffect, useMemo, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useHistoryFileContextMenu } from '../../hooks/useHistoryFileContextMenu'
import { useRangeFileDiff } from '../../hooks/useRangeFileDiff'
import { useRangeFiles } from '../../hooks/useRangeFiles'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import {
  prefetchRangeDiffs,
  prefetchRangeHover,
  prefetchRangeNeighbors,
} from '../../lib/diffPrefetch'
import { openRangeDifftool } from '../../lib/wails'
import { cx } from '../../utils/cx'
import { ContextMenu } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import { CommitFileList } from './CommitFileList'
import styles from './CommitDetailPane.module.css'
import compareStyles from './CompareDetailPane.module.css'
import { DiffView } from './DiffView'

export interface CompareRange {
  fromRef: string
  toRef: string
}

interface CompareDetailPaneProps {
  worktreePath: string
  range: CompareRange
}

const DETAIL_SPLIT_STORAGE_KEY = 'wt-manager.historyDetailSplitRatio'
const DETAIL_SPLIT_DEFAULT_RATIO = 0.35
const DETAIL_SPLIT_MIN_RATIO = 0.2
const DETAIL_SPLIT_MAX_RATIO = 0.75

export function CompareDetailPane({ worktreePath, range }: CompareDetailPaneProps) {
  const { fromRef, toRef } = range
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { files, loading: filesLoading, error: filesError } = useRangeFiles(
    worktreePath,
    fromRef,
    toRef,
  )
  const {
    diff,
    loading: diffLoading,
    error: diffError,
  } = useRangeFileDiff(worktreePath, fromRef, toRef, selectedPath)

  const openDifftoolForFile = useCallback(
    async (path: string) => {
      await openRangeDifftool(worktreePath, fromRef, toRef, path)
    },
    [fromRef, toRef, worktreePath],
  )

  const {
    menu,
    closeMenu,
    handleFileContextMenu,
    explorerErrorDialog,
    toolErrorDialog,
  } = useHistoryFileContextMenu({
    worktreePath,
    selectedPath,
    setSelectedPath,
    openDifftool: openDifftoolForFile,
  })

  const filesErrorDialog = useErrorDialog(filesError)
  const diffErrorDialog = useErrorDialog(diffError)
  const { ratio, resizing, splitRef, handleResizeStart } = useResizableSplit({
    storageKey: DETAIL_SPLIT_STORAGE_KEY,
    defaultRatio: DETAIL_SPLIT_DEFAULT_RATIO,
    minRatio: DETAIL_SPLIT_MIN_RATIO,
    maxRatio: DETAIL_SPLIT_MAX_RATIO,
    orientation: 'horizontal',
  })

  useEffect(() => {
    setSelectedPath(null)
  }, [fromRef, toRef])

  useEffect(() => {
    if (filesLoading) {
      return
    }
    if (files.length === 0) {
      setSelectedPath(null)
      return
    }
    setSelectedPath((current) => {
      if (current && files.some((file) => file.path === current)) {
        return current
      }
      return files[0]?.path ?? null
    })
  }, [files, filesLoading])

  useEffect(() => {
    if (filesLoading || !worktreePath || !fromRef || !toRef || files.length === 0) {
      return
    }
    return prefetchRangeDiffs(
      worktreePath,
      fromRef,
      toRef,
      files.map((file) => file.path),
    )
  }, [files, filesLoading, fromRef, toRef, worktreePath])

  const filePaths = useMemo(() => files.map((file) => file.path), [files])

  useEffect(() => {
    if (!worktreePath || !fromRef || !toRef || filePaths.length === 0) {
      return
    }
    prefetchRangeNeighbors(worktreePath, fromRef, toRef, filePaths, selectedPath)
  }, [worktreePath, fromRef, toRef, filePaths, selectedPath])

  const handleFileHover = useCallback(
    (path: string) => {
      if (!worktreePath || !fromRef || !toRef) {
        return
      }
      prefetchRangeHover(worktreePath, fromRef, toRef, path)
    },
    [worktreePath, fromRef, toRef],
  )

  return (
    <div
      ref={splitRef}
      className={cx(styles.root, resizing && styles.rootResizing)}
    >
      <div className={styles.left} style={{ flex: `${ratio} 1 0%` }}>
        <div className={styles.info}>
          <div className={compareStyles.header}>
            <p className={compareStyles.title}>Diff 比較</p>
            <p className={compareStyles.range}>
              <span className={compareStyles.ref} title={fromRef}>
                {fromRef}
              </span>
              <span className={compareStyles.arrow} aria-hidden="true">
                →
              </span>
              <span className={compareStyles.ref} title={toRef}>
                {toRef}
              </span>
            </p>
          </div>
        </div>
        <div className={styles.files}>
          <header className={styles.filesHeader}>変更ファイル</header>
          <CommitFileList
            files={files}
            loading={filesLoading}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onFileHover={handleFileHover}
            onFileContextMenu={handleFileContextMenu}
          />
        </div>
      </div>
      <ResizeHandle
        orientation="horizontal"
        onPointerDown={handleResizeStart}
        ariaLabel="比較詳細と差分の幅を調整"
        active={resizing}
      />
      <div className={styles.diff} style={{ flex: `${1 - ratio} 1 0%` }}>
        <DiffView
          diff={diff}
          loading={diffLoading}
          error={diffError}
          file={selectedPath}
        />
      </div>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />
      )}
      <ErrorDialog
        open={filesErrorDialog.open}
        title="変更ファイルの取得に失敗しました"
        message={filesErrorDialog.message}
        onClose={filesErrorDialog.dismiss}
      />
      <ErrorDialog
        open={diffErrorDialog.open}
        title="差分の取得に失敗しました"
        message={diffErrorDialog.message}
        onClose={diffErrorDialog.dismiss}
      />
      <ErrorDialog
        open={explorerErrorDialog.open}
        title="エクスプローラーを開けませんでした"
        message={explorerErrorDialog.message}
        onClose={explorerErrorDialog.dismiss}
      />
      <ErrorDialog
        open={toolErrorDialog.open}
        title="外部ツールの起動に失敗しました"
        message={toolErrorDialog.message}
        onClose={toolErrorDialog.dismiss}
      />
    </div>
  )
}
