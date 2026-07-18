import { useRemoteCleanup } from '../../hooks/useRemoteCleanup'
import type { RemoteCleanupStatusFilter } from '../../lib/remoteCleanupPrefsStorage'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import { ExcludedListDialog } from './ExcludedListDialog'
import styles from './RemoteCleanupDialog.module.css'

interface RemoteCleanupDialogProps {
  open: boolean
  repositoryPath: string
  worktreePath: string
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
  } = useRemoteCleanup({ open, repositoryPath, worktreePath, onDeleted })

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
          aria-labelledby="remote-cleanup-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.header}>
            <h2 id="remote-cleanup-title">リモートブランチ整理</h2>
            <IconButton type="button" aria-label="閉じる" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className={styles.body}>
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

            <div className={styles.list}>
              {isLoading ? (
                <p className={styles.status}>
                  {baseLoading ? '基準ブランチを読み込み中…' : 'マージ状態を判定しています…'}
                </p>
              ) : visible.length === 0 ? (
                <p className={styles.empty}>該当するリモートブランチはありません</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.colCheck}>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          disabled={isLoading || visible.length === 0}
                          onChange={toggleAllVisible}
                          aria-label="表示中をすべて選択"
                        />
                      </th>
                      <th className={styles.colBranch}>ブランチ</th>
                      <th className={styles.colDate}>最終コミット</th>
                      <th className={styles.colAuthor}>作者</th>
                      <th className={styles.colStatus}>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry) => (
                      <tr
                        key={entry.name}
                        className={styles.tableRow}
                        onClick={() => toggleOne(entry.name)}
                      >
                        <td className={styles.colCheck}>
                          <input
                            type="checkbox"
                            checked={selected.has(entry.name)}
                            onChange={() => toggleOne(entry.name)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td className={styles.colBranch}>
                          <span className={styles.branchName}>{entry.name}</span>
                        </td>
                        <td className={styles.colDate}>{formatCommitAt(entry.lastCommitAt)}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.footer}>
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
          </div>
        </div>
      </div>

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
