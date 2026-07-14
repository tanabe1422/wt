import { useEffect, useMemo, useState } from 'react'

import {
  defaultRemoteBaseRef,
  deleteRemoteBranches,
  getSettings,
  listRemoteMergeStatus,
  saveSettings,
} from '../../lib/wails'
import type { MergeCheckMode, RemoteMergeEntry } from '../../types'
import { localBranchFromRemote } from '../../utils/branchTree'
import { isRemoteCleanupExcluded } from '../../utils/remoteCleanupExcluded'
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

function ExcludedListDialog({
  open,
  excluded,
  busy,
  onRemove,
  onClose,
}: {
  open: boolean
  excluded: string[]
  busy: boolean
  onRemove: (name: string) => void
  onClose: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.excludedDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="excluded-list-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="excluded-list-title">除外リスト</h2>
          <IconButton type="button" aria-label="閉じる" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={styles.excludedBody}>
          <p className={styles.excludedHint}>
            これらのローカルブランチ名に一致するリモートは整理一覧に表示されません。
          </p>
          {excluded.length === 0 ? (
            <p className={styles.empty}>除外中のブランチはありません</p>
          ) : (
            <ul className={styles.excludedList}>
              {excluded.map((name) => (
                <li key={name} className={styles.excludedRow}>
                  <span className={styles.excludedName}>{name}</span>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onRemove(name)}
                  >
                    削除
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  )
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
  const [excluded, setExcluded] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingExcluded, setSavingExcluded] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [excludedOpen, setExcludedOpen] = useState(false)

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
    setExcludedOpen(false)

    void (async () => {
      try {
        const [base, settings] = await Promise.all([
          defaultRemoteBaseRef(worktreePath),
          getSettings(),
        ])
        if (cancelled) {
          return
        }
        setBaseRef(base)
        setExcluded([...(settings.remoteCleanupExcluded ?? [])])
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
      if (isRemoteCleanupExcluded(entry.name, excluded)) {
        return false
      }
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
  }, [entries, excluded, nameFilter, statusFilter])

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

  async function persistExcluded(nextExcluded: string[]) {
    setSavingExcluded(true)
    setError('')
    try {
      const settings = await getSettings()
      const saved = await saveSettings({
        ...settings,
        remoteCleanupExcluded: nextExcluded,
      })
      setExcluded([...(saved.remoteCleanupExcluded ?? nextExcluded)])
      setSelected((prev) => {
        const next = new Set<string>()
        for (const name of prev) {
          if (!isRemoteCleanupExcluded(name, nextExcluded)) {
            next.add(name)
          }
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '除外リストの保存に失敗しました')
    } finally {
      setSavingExcluded(false)
    }
  }

  async function handleAddExcluded() {
    if (selectedNames.length === 0) {
      return
    }
    const next = [...excluded]
    const seen = new Set(next)
    for (const remoteRef of selectedNames) {
      let localName: string
      try {
        localName = localBranchFromRemote(remoteRef)
      } catch {
        localName = remoteRef
      }
      if (!seen.has(localName)) {
        seen.add(localName)
        next.push(localName)
      }
    }
    next.sort((a, b) => a.localeCompare(b))
    await persistExcluded(next)
  }

  async function handleRemoveExcluded(name: string) {
    await persistExcluded(excluded.filter((entry) => entry !== name))
  }

  async function handleDelete() {
    if (selectedNames.length === 0 || !worktreePath) {
      return
    }
    const blocked = selectedNames.filter((name) => isRemoteCleanupExcluded(name, excluded))
    if (blocked.length > 0) {
      setConfirmOpen(false)
      setError(`除外リストのブランチは削除できません: ${blocked.join(', ')}`)
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

  const busy = deleting || savingExcluded

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
              <div className={styles.listHeaderActions}>
                <Button
                  variant="ghost"
                  disabled={selectedNames.length === 0 || busy || loading}
                  onClick={() => {
                    void handleAddExcluded()
                  }}
                >
                  除外に追加
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setExcludedOpen(true)}
                >
                  除外リスト
                </Button>
              </div>
            </div>

            <div className={styles.list}>
              {loading ? (
                <p className={styles.status}>マージ状態を判定しています…</p>
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
                          disabled={loading || visible.length === 0}
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
              disabled={selectedNames.length === 0 || loading || busy}
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
