import { useRemoteCleanup } from '../../hooks/useRemoteCleanup'
import type { BusyChangeHandler } from '../../hooks/useBusy'
import type { RemoteCleanupStatusFilter } from '../../lib/remoteCleanupPrefsStorage'
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
import { ExcludedListDialog } from './ExcludedListDialog'
import styles from './RemoteCleanupDialog.module.css'

interface RemoteCleanupDialogProps {
  open: boolean
  repositoryPath: string
  worktreePath: string
  onClose: () => void
  onDeleted?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
}

function formatCommitAt(iso: string): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function RemoteCleanupDialog({
  open,
  repositoryPath,
  worktreePath,
  onClose,
  onDeleted,
  onBusyChange,
}: RemoteCleanupDialogProps) {
  const {
    baseRef,
    baseOptions,
    mode,
    statusFilter,
    nameFilter,
    visible,
    selected,
    selectedNames,
    allVisibleSelected,
    excluded,
    error,
    confirmOpen,
    excludedOpen,
    baseLoading,
    busy,
    isLoading,
    savingExcluded,
    setConfirmOpen,
    setExcludedOpen,
    updateBaseRef,
    updateStatusFilter,
    updateMode,
    updateNameFilter,
    toggleOne,
    toggleAllVisible,
    handleAddExcluded,
    handleRemoveExcluded,
    handleDelete,
  } = useRemoteCleanup({ open, repositoryPath, worktreePath, onDeleted, onBusyChange })

  if (!open) {
    return null
  }

  const placeholder = isLoading
    ? baseLoading
      ? '基準ブランチを読み込み中…'
      : 'マージ状態を判定しています…'
    : visible.length === 0
      ? '該当するリモートブランチはありません'
      : null

  return (
    <>
      <CleanupDialogShell
        open={open}
        title="リモートブランチ整理"
        titleId="remote-cleanup-title"
        onClose={onClose}
        dialogClassName={styles.dialog}
        bodyClassName={styles.body}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              閉じる
            </Button>
            <Button
              variant="danger"
              disabled={selectedNames.length === 0 || isLoading || busy}
              onClick={() => setConfirmOpen(true)}
            >
              選択を削除
            </Button>
          </>
        }
      >
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.label}>基準ブランチ</span>
            <select
              className={styles.select}
              value={baseRef}
              disabled={isLoading || (!baseLoading && baseOptions.length === 0)}
              onChange={(event) => updateBaseRef(event.target.value)}
            >
              {baseLoading ? (
                <option value="">読み込み中…</option>
              ) : baseOptions.length === 0 ? (
                <option value="">—</option>
              ) : (
                baseOptions.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>表示</span>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(event) => {
                updateStatusFilter(event.target.value as RemoteCleanupStatusFilter)
              }}
            >
              <option value="merged">マージ済み</option>
              <option value="unmerged">未マージ</option>
              <option value="all">すべて</option>
            </select>
          </label>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>判定モード</span>
            <div className={styles.modeRow}>
              <label className={styles.modeOption}>
                <input
                  type="radio"
                  name="merge-check-mode"
                  checked={mode === 'ancestry'}
                  onChange={() => updateMode('ancestry')}
                />
                祖先
              </label>
              <label className={styles.modeOption}>
                <input
                  type="radio"
                  name="merge-check-mode"
                  checked={mode === 'content'}
                  onChange={() => updateMode('content')}
                />
                内容（スカッシュ含む）
              </label>
            </div>
          </div>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>名前フィルタ</span>
            <input
              className={styles.input}
              type="search"
              value={nameFilter}
              placeholder="origin/feature/…"
              onChange={(event) => updateNameFilter(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <span className={styles.listMeta}>
              {isLoading ? '読み込み中…' : `${visible.length} 件`}
              {selectedNames.length > 0 ? ` / ${selectedNames.length} 選択` : ''}
            </span>
            <div className={styles.listHeaderActions}>
              <Button
                variant="ghost"
                disabled={selectedNames.length === 0 || busy || isLoading}
                onClick={() => {
                  void handleAddExcluded()
                }}
              >
                除外に追加
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setExcludedOpen(true)}>
                除外リスト
              </Button>
            </div>
          </div>

          <SelectionTableList placeholder={placeholder}>
            <SelectionTable>
              <thead>
                <tr>
                  <th className={st.colCheck}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={isLoading || visible.length === 0}
                      onChange={toggleAllVisible}
                      aria-label="表示中をすべて選択"
                    />
                  </th>
                  <th className={styles.colBranch}>ブランチ</th>
                  <th className={cx(st.colTabular, styles.colDate)}>最終コミット</th>
                  <th className={styles.colAuthor}>作者</th>
                  <th className={styles.colStatus}>状態</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <SelectionTableRow key={entry.name} onClick={() => toggleOne(entry.name)}>
                    <td className={st.colCheck}>
                      <input
                        type="checkbox"
                        checked={selected.has(entry.name)}
                        onChange={() => toggleOne(entry.name)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td className={styles.colBranch}>
                      <span className={cx(st.mono, st.truncate)}>{entry.name}</span>
                    </td>
                    <td className={cx(st.colTabular, styles.colDate)}>
                      {formatCommitAt(entry.lastCommitAt)}
                    </td>
                    <td className={styles.colAuthor}>{entry.lastAuthor || '—'}</td>
                    <td className={styles.colStatus}>
                      <span
                        className={`${styles.badge} ${
                          entry.merged ? styles.badgeMerged : styles.badgeUnmerged
                        }`}
                      >
                        {entry.merged ? 'マージ済み' : '未マージ'}
                      </span>
                    </td>
                  </SelectionTableRow>
                ))}
              </tbody>
            </SelectionTable>
          </SelectionTableList>
        </div>

        {error ? <p className={cleanupDialogShellStyles.error}>{error}</p> : null}
      </CleanupDialogShell>

      <ExcludedListDialog
        open={excludedOpen}
        excluded={excluded}
        busy={savingExcluded}
        onRemove={(name) => {
          void handleRemoveExcluded(name)
        }}
        onClose={() => setExcludedOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="リモートブランチを削除"
        message={
          selectedNames.length > 0
            ? `次の ${selectedNames.length} 件をリモートから削除しますか？\n\n${selectedNames.join('\n')}`
            : ''
        }
        confirmLabel="削除"
        danger
        onConfirm={() => {
          void handleDelete()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
