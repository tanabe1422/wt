import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'

import { useCommitFileDiff } from '../../hooks/useCommitFileDiff'
import { useCommitFiles } from '../../hooks/useCommitFiles'
import { useContextMenu } from '../../hooks/useContextMenu'
import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { useShowFileInExplorer } from '../../hooks/useShowFileInExplorer'
import {
  prefetchCommitDiffs,
  prefetchCommitHover,
  prefetchCommitNeighbors,
} from '../../lib/diffPrefetch'
import type { CommitLogEntry } from '../../types'
import { cx } from '../../utils/cx'
import { ContextMenu } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import { CommitFileList } from './CommitFileList'
import { CommitInfoPanel } from './CommitInfoPanel'
import { DiffView } from './DiffView'
import styles from './CommitDetailPane.module.css'

interface CommitDetailPaneProps {
  worktreePath: string
  commit: CommitLogEntry | null
}

const DETAIL_SPLIT_STORAGE_KEY = 'wt-manager.historyDetailSplitRatio'
const DETAIL_SPLIT_DEFAULT_RATIO = 0.35
const DETAIL_SPLIT_MIN_RATIO = 0.2
const DETAIL_SPLIT_MAX_RATIO = 0.75

export function CommitDetailPane({ worktreePath, commit }: CommitDetailPaneProps) {
  const sha = commit?.sha ?? null
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const { files, loading: filesLoading, error: filesError } = useCommitFiles(worktreePath, sha)
  const {
    diff,
    loading: diffLoading,
    error: diffError,
  } = useCommitFileDiff(worktreePath, sha, selectedPath)
  const { menu, openMenu, closeMenu } = useContextMenu()
  const { showFileDir, errorDialog: explorerErrorDialog } = useShowFileInExplorer(worktreePath)

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
  }, [sha])

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
    if (filesLoading || !worktreePath || !sha || files.length === 0) {
      return
    }
    return prefetchCommitDiffs(
      worktreePath,
      sha,
      files.map((file) => file.path),
    )
  }, [files, filesLoading, sha, worktreePath])

  const filePaths = useMemo(() => files.map((file) => file.path), [files])

  useEffect(() => {
    if (!worktreePath || !sha || filePaths.length === 0) {
      return
    }
    prefetchCommitNeighbors(worktreePath, sha, filePaths, selectedPath)
  }, [worktreePath, sha, filePaths, selectedPath])

  const handleFileHover = useCallback(
    (path: string) => {
      if (!worktreePath || !sha) {
        return
      }
      prefetchCommitHover(worktreePath, sha, path)
    },
    [worktreePath, sha],
  )

  const handleFileContextMenu = useCallback(
    (entry: { path: string }, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (selectedPath !== entry.path) {
        setSelectedPath(entry.path)
      }
      openMenu(event.clientX, event.clientY, [
        {
          label: 'エクスプローラーで表示',
          onClick: () => {
            showFileDir(entry.path)
          },
        },
      ])
    },
    [openMenu, selectedPath, showFileDir],
  )

  if (!commit) {
    return (
      <div className={styles.root}>
        <p className={styles.placeholder}>コミットを選択すると詳細が表示されます</p>
      </div>
    )
  }

  return (
    <div
      ref={splitRef}
      className={cx(styles.root, resizing && styles.rootResizing)}
    >
      <div className={styles.left} style={{ flex: `${ratio} 1 0%` }}>
        <div className={styles.info}>
          <CommitInfoPanel commit={commit} />
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
        ariaLabel="コミット詳細と差分の幅を調整"
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
    </div>
  )
}
