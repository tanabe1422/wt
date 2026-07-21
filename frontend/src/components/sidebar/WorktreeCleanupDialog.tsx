import { useWorktreeCleanup } from '../../hooks/useWorktreeCleanup'
import type { BusyChangeHandler } from '../../hooks/useBusy'
import type { WorktreeEntry } from '../../types'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import {
  CleanupDialogShell,
  cleanupDialogShellStyles,
} from '../ui/CleanupDialogShell'
import { ConfirmDialog } from '../ui/ConfirmDialog'
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
  onBusyChange?: BusyChangeHandler
}

export function WorktreeCleanupDialog({
  open,
  repoPath,
  worktrees,
  selectedWorktree,
  onSelectWorktree,
  onClose,
  onDeleted,
  onBusyChange,
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
    onBusyChange,
  })

  if (!open) {
    return null
  }

  const selectedNames = rows
    .filter((row) => selectedPaths.includes(row.path))
    .map((row) => row.name)

  return (
    <>
      <CleanupDialogShell
        open={open}
        title="ワークツリーの整理"
        titleId="worktree-cleanup-title"
        onClose={onClose}
        footer={
          <>
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
          </>
        }
      >
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

        {error ? <p className={cleanupDialogShellStyles.error}>{error}</p> : null}
      </CleanupDialogShell>

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
