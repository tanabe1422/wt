import { useLocalBranchCleanup } from '../../hooks/useLocalBranchCleanup'
import type { BranchEntry } from '../../types'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import { HardDriveIcon } from './BranchIcons'
import styles from './LocalBranchCleanupDialog.module.css'

interface LocalBranchCleanupDialogProps {
  open: boolean
  worktreePath: string | null
  branches: BranchEntry[]
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
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

function toneClass(row: {
  isCheckedOutOnSelected: boolean
  hasWorktree: boolean
}): string {
  if (row.isCheckedOutOnSelected) {
    return styles.toneActive
  }
  if (row.hasWorktree) {
    return styles.toneWorktree
  }
  return styles.toneIdle
}

export function LocalBranchCleanupDialog({
  open,
  worktreePath,
  branches,
  checkedOutBranch,
  worktreeBranches,
  onClose,
  onDeleted,
}: LocalBranchCleanupDialogProps) {
  const {
    rows,
    selected,
    selectedNames,
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
  } = useLocalBranchCleanup({
    open,
    worktreePath,
    branches,
    checkedOutBranch,
    worktreeBranches,
    onDeleted,
  })

  if (!open) {
    return null
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose}>
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="local-branch-cleanup-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 id="local-branch-cleanup-title">ブランチの整理</h2>
            <IconButton type="button" aria-label="閉じる" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className={styles.body}>
            <div className={styles.listHeader}>
              <span className={styles.listMeta}>
                {`${rows.length} 件`}
                {selectedNames.length > 0 ? ` / ${selectedNames.length} 選択` : ''}
              </span>
            </div>

            <div className={styles.list}>
              {rows.length === 0 ? (
                <p className={styles.empty}>ローカルブランチはありません</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.colCheck}>
                        <input
                          type="checkbox"
                          checked={allDeletableSelected}
                          disabled={deletableCount === 0 || busy}
                          onChange={toggleAllDeletable}
                          aria-label="削除可能なブランチをすべて選択"
                        />
                      </th>
                      <th className={styles.colBranch}>ブランチ</th>
                      <th className={styles.colRemote}>リモート</th>
                      <th className={styles.colAhead}>未プッシュ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const locked = row.locked
                      return (
                        <tr
                          key={row.name}
                          className={cx(styles.tableRow, locked && styles.tableRowLocked)}
                          onClick={() => {
                            if (!locked && !busy) {
                              toggleOne(row.name)
                            }
                          }}
                        >
                          <td className={styles.colCheck}>
                            <input
                              type="checkbox"
                              checked={selected.has(row.name)}
                              disabled={locked || busy}
                              onChange={() => toggleOne(row.name)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`${row.name} を選択`}
                            />
                          </td>
                          <td className={styles.colBranch}>
                            <span className={cx(styles.branchCell, toneClass(row))}>
                              <span className={styles.iconSlot} aria-hidden="true">
                                {row.hasWorktree ? <HardDriveIcon /> : null}
                              </span>
                              <span className={styles.branchName}>{row.name}</span>
                            </span>
                          </td>
                          <td className={styles.colRemote}>
                            {row.hasUpstream ? 'あり' : 'なし'}
                          </td>
                          <td className={styles.colAhead}>
                            {row.hasUpstream ? row.aheadCount : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              閉じる
            </Button>
            <Button
              variant="danger"
              disabled={selectedNames.length === 0 || busy || !worktreePath}
              onClick={() => setConfirmOpen(true)}
            >
              選択を削除
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="ローカルブランチを削除"
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
