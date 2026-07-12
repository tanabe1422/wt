import { useEffect, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useRangeFileDiff } from '../../hooks/useRangeFileDiff'
import { useRangeFiles } from '../../hooks/useRangeFiles'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { cx } from '../../utils/cx'
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
    </div>
  )
}
