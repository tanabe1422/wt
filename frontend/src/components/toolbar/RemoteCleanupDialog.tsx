import { useEffect, useMemo, useState } from 'react'

import {
  defaultRemoteBaseRef,
  deleteRemoteBranches,
  listRemoteMergeStatus,
} from '../../lib/wails'
import type { MergeCheckMode, RemoteMergeEntry } from '../../types'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import styles from './RemoteCleanupDialog.module.css'

type StatusFilter = 'merged' | 'unmerged' | 'all'

interface RemoteCleanupDialogProps {
  open: boolean
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
  worktreePath,
  onClose,
  onDeleted,
}: RemoteCleanupDialogProps) {
  const [baseRef, setBaseRef] = useState('')
  const [baseOptions, setBaseOptions] = useState<string[]>([])
  const [mode, setMode] = useState<MergeCheckMode>('ancestry')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('merged')
  const [nameFilter, setNameFilter] = useState('')
  const [entries, setEntries] = useState<RemoteMergeEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open || !worktreePath) {
      return
    }

    let cancelled = false
    setError('')
    setSelected(new Set())
    setNameFilter('')
    setStatusFilter('merged')
    setMode('ancestry')

    void (async () => {
      try {
        const base = await defaultRemoteBaseRef(worktreePath)
        if (cancelled) {
          return
        }
        setBaseRef(base)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '基準ブランチの取得に失敗しました')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, worktreePath])

  useEffect(() => {
    if (!open || !worktreePath || !baseRef) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    void (async () => {
      try {
        const result = await listRemoteMergeStatus(worktreePath, baseRef, mode)
        if (cancelled) {
          return
        }
        setEntries(result)
        setBaseOptions(
          [baseRef, ...result.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b)),
        )
        setSelected(new Set())
      } catch (err) {
        if (!cancelled) {
          setEntries([])
          setError(err instanceof Error ? err.message : 'マージ状態の取得に失敗しました')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, worktreePath, baseRef, mode])

  const visible = useMemo(() => {
    const q = nameFilter.trim().toLowerCase()
    return entries.filter((entry) => {
      if (statusFilter === 'merged' && !entry.merged) {
        return false
      }
      if (statusFilter === 'unmerged' && entry.merged) {
        return false
      }
      if (q && !entry.name.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [entries, nameFilter, statusFilter])

  const allVisibleSelected =
    visible.length > 0 && visible.every((entry) => selected.has(entry.name))

  function toggleOne(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const entry of visible) {
          next.delete(entry.name)
        }
      } else {
        for (const entry of visible) {
          next.add(entry.name)
        }
      }
      return next
    })
  }

  const selectedNames = useMemo(
    () => [...selected].sort((a, b) => a.localeCompare(b)),
    [selected],
  )

  async function handleDelete() {
    if (selectedNames.length === 0 || !worktreePath) {
      return
    }
    setDeleting(true)
    setError('')
    try {
      await deleteRemoteBranches(worktreePath, selectedNames)
      setConfirmOpen(false)
      setSelected(new Set())
      const result = await listRemoteMergeStatus(worktreePath, baseRef, mode)
      setEntries(result)
      setBaseOptions(
        [baseRef, ...result.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b)),
      )
      await onDeleted?.()
    } catch (err) {
      setConfirmOpen(false)
      setError(err instanceof Error ? err.message : 'リモートブランチの削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

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
                  disabled={loading || baseOptions.length === 0}
                  onChange={(event) => setBaseRef(event.target.value)}
                >
                  {baseOptions.map((ref) => (
                    <option key={ref} value={ref}>
                      {ref}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>表示</span>
                <select
                  className={styles.select}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
                      onChange={() => setMode('ancestry')}
                    />
                    祖先
                  </label>
                  <label className={styles.modeOption}>
                    <input
                      type="radio"
                      name="merge-check-mode"
                      checked={mode === 'content'}
                      onChange={() => setMode('content')}
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
                  onChange={(event) => setNameFilter(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.listHeader}>
              <span className={styles.listMeta}>
                {loading ? '読み込み中…' : `${visible.length} 件`}
                {selectedNames.length > 0 ? ` / ${selectedNames.length} 選択` : ''}
              </span>
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={loading || visible.length === 0}
                  onChange={toggleAllVisible}
                />
                表示中をすべて選択
              </label>
            </div>

            <div className={styles.list}>
              {loading ? (
                <p className={styles.status}>マージ状態を判定しています…</p>
              ) : visible.length === 0 ? (
                <p className={styles.empty}>該当するリモートブランチはありません</p>
              ) : (
                visible.map((entry) => (
                  <label key={entry.name} className={styles.row}>
                    <input
                      type="checkbox"
                      checked={selected.has(entry.name)}
                      onChange={() => toggleOne(entry.name)}
                    />
                    <span className={styles.rowName}>{entry.name}</span>
                    <span className={styles.rowMeta}>
                      {formatCommitAt(entry.lastCommitAt)}
                      {entry.lastAuthor ? ` · ${entry.lastAuthor}` : ''}
                    </span>
                    <span
                      className={`${styles.badge} ${
                        entry.merged ? styles.badgeMerged : styles.badgeUnmerged
                      }`}
                    >
                      {entry.merged ? 'マージ済み' : '未マージ'}
                    </span>
                  </label>
                ))
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={onClose} disabled={deleting}>
              閉じる
            </Button>
            <Button
              variant="danger"
              disabled={selectedNames.length === 0 || loading || deleting}
              onClick={() => setConfirmOpen(true)}
            >
              選択を削除
            </Button>
          </div>
        </div>
      </div>

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
