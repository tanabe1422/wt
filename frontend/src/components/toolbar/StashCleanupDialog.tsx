import { useEffect, useState } from 'react'

import { useErrorDialog } from '../../hooks/useErrorDialog'
import { useResizableSplit } from '../../hooks/useResizableSplit'
import { useStashCleanup } from '../../hooks/useStashCleanup'
import { useStashFileDiff } from '../../hooks/useStashFileDiff'
import { useStashFiles } from '../../hooks/useStashFiles'
import { cx } from '../../utils/cx'
import { CommitFileList } from '../git/CommitFileList'
import { DiffView } from '../git/DiffView'
import { Button } from '../ui/Button'
import { CleanupDialogShell } from '../ui/CleanupDialogShell'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ResizeHandle } from '../ui/ResizeHandle'
import {
  SelectionTable,
  SelectionTableList,
  SelectionTableRow,
  selectionTableStyles as st,
} from '../ui/SelectionTable'
import styles from './StashCleanupDialog.module.css'

interface StashCleanupDialogProps {
  open: boolean
  worktreePath: string
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}

const VERTICAL_SPLIT_KEY = 'wt-manager.stashCleanupVerticalRatio'
const HORIZONTAL_SPLIT_KEY = 'wt-manager.stashCleanupHorizontalRatio'

export function StashCleanupDialog({
  open,
  worktreePath,
  onClose,
  onDeleted,
}: StashCleanupDialogProps) {
  const {
    stashes,
    selected,
    selectedIndexes,
    selectedLabels,
    focusedIndex,
    allSelected,
    loading,
    busy,
    error,
    confirmOpen,
    setConfirmOpen,
    toggleOne,
    toggleAll,
    focusRow,
    handleDelete,
  } = useStashCleanup({ open, worktreePath, onDeleted })

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const {
    files,
    loading: filesLoading,
    error: filesError,
  } = useStashFiles(worktreePath, open ? focusedIndex : null)
  const {
    diff,
    loading: diffLoading,
    error: diffError,
  } = useStashFileDiff(worktreePath, open ? focusedIndex : null, selectedPath)

  const filesErrorDialog = useErrorDialog(filesError)
  const diffErrorDialog = useErrorDialog(diffError)

  const {
    ratio: verticalRatio,
    resizing: verticalResizing,
    splitRef: verticalSplitRef,
    handleResizeStart: handleVerticalResizeStart,
  } = useResizableSplit({
    storageKey: VERTICAL_SPLIT_KEY,
    defaultRatio: 0.35,
    minRatio: 0.2,
    maxRatio: 0.65,
    orientation: 'vertical',
  })

  const {
    ratio: horizontalRatio,
    resizing: horizontalResizing,
    splitRef: horizontalSplitRef,
    handleResizeStart: handleHorizontalResizeStart,
  } = useResizableSplit({
    storageKey: HORIZONTAL_SPLIT_KEY,
    defaultRatio: 0.35,
    minRatio: 0.2,
    maxRatio: 0.7,
    orientation: 'horizontal',
  })

  useEffect(() => {
    setSelectedPath(null)
  }, [focusedIndex])

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

  if (!open) {
    return null
  }

  const listPlaceholder = loading
    ? '読み込み中…'
    : stashes.length === 0
      ? 'スタッシュはありません'
      : null

  return (
    <>
      <CleanupDialogShell
        open={open}
        title="スタッシュ整理"
        titleId="stash-cleanup-title"
        onClose={onClose}
        dialogClassName={styles.dialog}
        bodyClassName={styles.shellBody}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              閉じる
            </Button>
            <Button
              variant="danger"
              disabled={selectedIndexes.length === 0 || loading || busy || !worktreePath}
              onClick={() => setConfirmOpen(true)}
            >
              選択を削除
            </Button>
          </>
        }
      >
        <div
          ref={verticalSplitRef}
          className={cx(styles.body, verticalResizing && styles.bodyResizing)}
        >
          <div className={styles.listPane} style={{ flex: `${verticalRatio} 1 0%` }}>
            <div className={styles.listHeader}>
              <span className={styles.listMeta}>
                {loading ? '読み込み中…' : `${stashes.length} 件`}
                {selectedIndexes.length > 0 ? ` / ${selectedIndexes.length} 選択` : ''}
              </span>
            </div>

            <SelectionTableList constrained={false} placeholder={listPlaceholder}>
              <SelectionTable>
                <thead>
                  <tr>
                    <th className={st.colCheck}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        disabled={loading || busy || stashes.length === 0}
                        onChange={toggleAll}
                        aria-label="すべて選択"
                      />
                    </th>
                    <th className={styles.colRef}>参照</th>
                    <th className={styles.colMessage}>メッセージ</th>
                  </tr>
                </thead>
                <tbody>
                  {stashes.map((entry) => {
                    const focused = focusedIndex === entry.index
                    return (
                      <SelectionTableRow
                        key={entry.ref}
                        focused={focused}
                        onClick={() => focusRow(entry.index)}
                      >
                        <td className={st.colCheck}>
                          <input
                            type="checkbox"
                            checked={selected.has(entry.index)}
                            disabled={busy}
                            onChange={() => toggleOne(entry.index)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`${entry.ref} を選択`}
                          />
                        </td>
                        <td className={styles.colRef}>
                          <span className={cx(st.mono, styles.ref)}>{entry.ref}</span>
                        </td>
                        <td className={styles.colMessage}>
                          <span className={st.truncate}>
                            {entry.message || '（メッセージなし）'}
                          </span>
                        </td>
                      </SelectionTableRow>
                    )
                  })}
                </tbody>
              </SelectionTable>
            </SelectionTableList>
          </div>

          <ResizeHandle
            orientation="vertical"
            onPointerDown={handleVerticalResizeStart}
            ariaLabel="スタッシュ一覧と差分の高さを調整"
            active={verticalResizing}
          />

          <div
            ref={horizontalSplitRef}
            className={cx(styles.detailPane, horizontalResizing && styles.bodyResizing)}
            style={{ flex: `${1 - verticalRatio} 1 0%` }}
          >
            {focusedIndex === null ? (
              <p className={styles.placeholder}>スタッシュを選択すると内容が表示されます</p>
            ) : (
              <>
                <div
                  className={styles.filesPane}
                  style={{ flex: `${horizontalRatio} 1 0%` }}
                >
                  <header className={styles.filesHeader}>変更ファイル</header>
                  <CommitFileList
                    files={files}
                    loading={filesLoading}
                    selectedPath={selectedPath}
                    onSelect={setSelectedPath}
                  />
                </div>
                <ResizeHandle
                  orientation="horizontal"
                  onPointerDown={handleHorizontalResizeStart}
                  ariaLabel="ファイル一覧と差分の幅を調整"
                  active={horizontalResizing}
                />
                <div
                  className={styles.diffPane}
                  style={{ flex: `${1 - horizontalRatio} 1 0%` }}
                >
                  <DiffView
                    diff={diff}
                    loading={diffLoading}
                    error={diffError}
                    file={selectedPath}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
      </CleanupDialogShell>

      <ConfirmDialog
        open={confirmOpen}
        title="スタッシュを削除"
        message={
          selectedLabels.length > 0
            ? `次の ${selectedLabels.length} 件を削除しますか？\n\n${selectedLabels.join('\n')}`
            : ''
        }
        confirmLabel="削除"
        danger
        onConfirm={() => {
          void handleDelete()
        }}
        onCancel={() => setConfirmOpen(false)}
      />

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
    </>
  )
}
