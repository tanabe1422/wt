import { useWorktreeCleanup } from '../../hooks/useWorktreeCleanup'
import type { WorktreeEntry } from '../../types'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import {
  SelectionTable,
  SelectionTableList,
  SelectionTableRow,
  selectionTableStyles as st,
} from '../ui/SelectionTable'
import styles from './WorktreeCleanupDialog.module.css'

interface WorktreeCleanupDialogProps {
  open: boolean
  repoPath: string | null
  worktrees: WorktreeEntry[]
  selectedWorktree: string | null
  onSelectWorktree?: (path: string) => void
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function WorktreeCleanupDialog({
  open,
  repoPath,
  worktrees,
  selectedWorktree,
  onSelectWorktree,
  onClose,
  onDeleted,
}: WorktreeCleanupDialogProps) {
  const {
    rows,
    selected,
    selectedPaths,
    allDeletableSelected,
    deletableCount,
    busy,
    error,
    confirmOpen,
    forceDelete,
    setConfirmOpen,
    setForceDelete,
    toggleOne,
    toggleAllDeletable,
    handleDelete,
  } = useWorktreeCleanup({
    open,
    repoPath,
    worktrees,
    selectedWorktree,
    onSelectWorktree,
    onDeleted,
  })

  if (!open) {
    return null
  }

  const selectedNames = rows
    .filter((row) => selectedPaths.includes(row.path))
    .map((row) => row.name)

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}>
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="worktree-cleanup-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 id="worktree-cleanup-title">ワークツリーの整理</h2>
            <IconButton type="button" aria-label="閉じる" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className={styles.body}>
            <div className={styles.listHeader}>
              <span className={styles.listMeta}>
                {`${rows.length} 件`}
                {selectedPaths.length > 0 ? ` / ${selectedPaths.length} 選択` : ''}
              </span>
            </div>

            <SelectionTableList
              placeholder={rows.length === 0 ? 'ワークツリーはありません' : null}
            >
              <SelectionTable>
                <thead>
                  <tr>
                    <th className={st.colCheck}>
                      <input
                        type="checkbox"
                        checked={allDeletableSelected}
                        disabled={deletableCount === 0 || busy}
                        onChange={toggleAllDeletable}
                        aria-label="削除可能なワークツリーをすべて選択"
                      />
                    </th>
                    <th className={styles.colName}>ワークツリー</th>
                    <th className={styles.colBranch}>ブランチ</th>
                    <th className={cx(st.colNumeric, styles.colChanges)}>未コミット</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const locked = row.locked
                    return (
                      <SelectionTableRow
                        key={row.path}
                        locked={locked}
                        onClick={() => {
                          if (!busy) {
                            toggleOne(row.path)
                          }
                        }}
                      >
                        <td className={st.colCheck}>
                          <input
                            type="checkbox"
                            checked={selected.has(row.path)}
                            disabled={locked || busy}
                            onChange={() => toggleOne(row.path)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`${row.name} を選択`}
                          />
                        </td>
                        <td className={styles.colName}>
                          <span className={styles.nameCell}>
                            <span className={cx(st.mono, st.truncate)}>{row.name}</span>
                            {row.isMain ? <span className={styles.badge}>メイン</span> : null}
                          </span>
                        </td>
                        <td className={styles.colBranch}>
                          <span className={cx(st.mono, st.truncate, styles.branchLabel)}>
                            {row.branchLabel}
                          </span>
                        </td>
                        <td className={cx(st.colNumeric, styles.colChanges)}>
                          {row.changedFileCount}
                        </td>
                      </SelectionTableRow>
                    )
                  })}
                </tbody>
              </SelectionTable>
            </SelectionTableList>

            {error ? <p className={styles.error}>{error}</p> : null}
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              閉じる
            </Button>
            <Button
              variant="danger"
              disabled={selectedPaths.length === 0 || busy || !repoPath}
              onClick={() => setConfirmOpen(true)}
            >
              選択を削除
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="ワークツリーを削除"
        message={
          selectedNames.length > 0
            ? `次の ${selectedNames.length} 件を削除しますか？\n\n${selectedNames.join('\n')}`
            : ''
        }
        confirmLabel="削除"
        danger
        checkboxLabel="強制削除"
        checked={forceDelete}
        onCheckedChange={setForceDelete}
        onConfirm={() => {
          void handleDelete()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
