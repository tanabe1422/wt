import { useLocalBranchCleanup } from '../../hooks/useLocalBranchCleanup'
import type { BusyChangeHandler } from '../../hooks/useBusy'
import type { BranchEntry } from '../../types'
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
  onBusyChange?: BusyChangeHandler
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
  onBusyChange,
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
    onBusyChange,
  })

  if (!open) {
    return null
  }

  return (
    <>
      <CleanupDialogShell
        open={open}
        title="ブランチの整理"
        titleId="local-branch-cleanup-title"
        onClose={onClose}
        footer={
          <>
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
          </>
        }
      >
        <div className={styles.listHeader}>
          <span className={styles.listMeta}>
            {`${rows.length} 件`}
            {selectedNames.length > 0 ? ` / ${selectedNames.length} 選択` : ''}
          </span>
        </div>

        <SelectionTableList
          placeholder={rows.length === 0 ? 'ローカルブランチはありません' : null}
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
                    aria-label="削除可能なブランチをすべて選択"
                  />
                </th>
                <th className={styles.colBranch}>ブランチ</th>
                <th className={styles.colRemote}>リモート</th>
                <th className={cx(st.colNumeric, styles.colAhead)}>未プッシュ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const locked = row.locked
                return (
                  <SelectionTableRow
                    key={row.name}
                    locked={locked}
                    onClick={() => {
                      if (!busy) {
                        toggleOne(row.name)
                      }
                    }}
                  >
                    <td className={st.colCheck}>
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
                        <span className={cx(st.mono, st.truncate)}>{row.name}</span>
                      </span>
                    </td>
                    <td className={styles.colRemote}>
                      {row.hasUpstream ? 'あり' : 'なし'}
                    </td>
                    <td className={cx(st.colNumeric, styles.colAhead)}>
                      {row.hasUpstream ? row.aheadCount : '—'}
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
