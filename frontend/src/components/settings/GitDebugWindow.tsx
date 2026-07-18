import { useEffect, useState } from 'react'

import { getGitDebugSnapshot } from '../../lib/wails'
import type { GitDebugSnapshot, InflightGitCommand, RecentGitCommand } from '../../types'
import { IconButton } from '../ui/IconButton'
import styles from './GitDebugWindow.module.css'

const POLL_MS = 250

const emptySnapshot: GitDebugSnapshot = { inflight: [], recent: [], lastMinuteCount: 0 }

interface GitDebugWindowProps {
  open: boolean
  onClose: () => void
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

function formatArgs(args: string[]): string {
  return args.length === 0 ? 'git' : `git ${args.join(' ')}`
}

function formatElapsed(startedAt: number, now: number): string {
  const ms = Math.max(0, now - startedAt)
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDir(dir: string): string {
  if (!dir) {
    return '—'
  }
  const parts = dir.replace(/\\/g, '/').split('/')
  if (parts.length <= 2) {
    return dir
  }
  return `…/${parts.slice(-2).join('/')}`
}

function InflightRow({ entry, now }: { entry: InflightGitCommand; now: number }) {
  return (
    <li className={styles.row}>
      <div className={styles.cmd}>{formatArgs(entry.args)}</div>
      <div className={styles.meta}>
        <span className={styles.badgeLive}>実行中</span>
        <span>{formatElapsed(entry.startedAt, now)}</span>
        <span className={styles.dir} title={entry.dir}>
          {formatDir(entry.dir)}
        </span>
      </div>
    </li>
  )
}

function RecentRow({ entry }: { entry: RecentGitCommand }) {
  return (
    <li className={cxRow(entry.error)}>
      <div className={styles.cmd}>{formatArgs(entry.args)}</div>
      <div className={styles.meta}>
        <span className={entry.error ? styles.badgeErr : styles.badgeOk}>
          {entry.error ? '失敗' : '完了'}
        </span>
        <span>{entry.durationMs}ms</span>
        <span className={styles.dir} title={entry.dir}>
          {formatDir(entry.dir)}
        </span>
      </div>
      {entry.error ? <div className={styles.error}>{entry.error}</div> : null}
    </li>
  )
}

function cxRow(error: string): string {
  return error ? `${styles.row} ${styles.rowError}` : styles.row
}

/** Floating debug panel: in-flight + recent git commands. Does not block the main UI. */
export function GitDebugWindow({ open, onClose }: GitDebugWindowProps) {
  const [snapshot, setSnapshot] = useState<GitDebugSnapshot>(emptySnapshot)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    const tick = () => {
      void getGitDebugSnapshot()
        .then((next) => {
          if (cancelled) {
            return
          }
          setSnapshot({
            inflight: next.inflight ?? [],
            recent: next.recent ?? [],
            lastMinuteCount: next.lastMinuteCount ?? 0,
          })
          setNow(Date.now())
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return
          }
          setError(err instanceof Error ? err.message : '取得に失敗しました')
        })
    }

    tick()
    const timer = window.setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className={styles.panel} role="dialog" aria-labelledby="git-debug-title">
      <div className={styles.header}>
        <div>
          <h2 id="git-debug-title" className={styles.title}>
            Git デバッグ
          </h2>
          <p className={styles.subtitle}>
            直近1分
            <span className={styles.count}>{snapshot.lastMinuteCount}</span>
            <span className={styles.subtitleSep}>·</span>
            250ms 更新
          </p>
        </div>
        <IconButton type="button" aria-label="閉じる" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className={styles.body}>
        {error ? <p className={styles.fetchError}>{error}</p> : null}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            実行中
            <span className={styles.count}>{snapshot.inflight.length}</span>
          </h3>
          {snapshot.inflight.length === 0 ? (
            <p className={styles.empty}>待機中の git はありません</p>
          ) : (
            <ul className={styles.list}>
              {snapshot.inflight.map((entry) => (
                <InflightRow key={entry.id} entry={entry} now={now} />
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            直近
            <span className={styles.count}>{snapshot.recent.length}</span>
          </h3>
          {snapshot.recent.length === 0 ? (
            <p className={styles.empty}>まだ履歴がありません</p>
          ) : (
            <ul className={styles.list}>
              {snapshot.recent.map((entry, index) => (
                <RecentRow
                  key={`${entry.endedAt}-${entry.args.join(' ')}-${index}`}
                  entry={entry}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
