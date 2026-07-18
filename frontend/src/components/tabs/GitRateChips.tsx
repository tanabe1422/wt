import { useEffect, useState } from 'react'

import { getGitDebugSnapshot } from '../../lib/wails'
import { HardDriveIcon } from '../sidebar/BranchIcons'
import styles from './GitRateChips.module.css'

const POLL_MS = 1000
const ICON_SIZE = 16
const TOGGLE_ICON_SIZE = 14
const STORAGE_KEY = 'wt-manager.gitRateChipsCollapsed'

interface GitRateCounts {
  inflightNetwork: number
  local: number
  goGit: number
  network: number
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

function ChevronsLeftIcon() {
  return (
    <svg
      width={TOGGLE_ICON_SIZE}
      height={TOGGLE_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 17 6 12l5-5M18 17l-5-5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronsRightIcon() {
  return (
    <svg
      width={TOGGLE_ICON_SIZE}
      height={TOGGLE_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6 17 5-5-5-5M13 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Network git chip icon (standard 24×24 cloud, same box as HardDrive). */
function NetworkCloudIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** go-git hotpath (in-process library reads). */
function GoGitIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l0-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Currently running network git (fetch/pull/push). */
function InflightIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={active ? styles.spin : undefined}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Compact debug chips: network inflight + last-minute CLI local / go-git / network. */
export function GitRateChips() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [counts, setCounts] = useState<GitRateCounts>({
    inflightNetwork: 0,
    local: 0,
    goGit: 0,
    network: 0,
  })

  useEffect(() => {
    writeCollapsed(collapsed)
  }, [collapsed])

  useEffect(() => {
    let cancelled = false

    const tick = () => {
      void getGitDebugSnapshot()
        .then((snap) => {
          if (cancelled) {
            return
          }
          setCounts({
            inflightNetwork: snap.inflightNetworkCount ?? 0,
            local: snap.lastMinuteLocalCount ?? 0,
            goGit: snap.lastMinuteGoGitCount ?? 0,
            network: snap.lastMinuteNetworkCount ?? 0,
          })
        })
        .catch(() => {
          // Keep last known values; this is debug-only chrome.
        })
    }

    tick()
    const timer = window.setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const networkChip = (
    <span
      className={`${styles.chip} ${styles.chipLoose}`}
      title="直近1分・ネットワークあり（fetch / pull / push 等）"
      aria-label={`ネットワーク git ${counts.network} 件`}
    >
      <span className={styles.icon}>
        <NetworkCloudIcon size={ICON_SIZE} />
      </span>
      <span className={styles.value}>{counts.network}</span>
    </span>
  )

  return (
    <div
      className={styles.chips}
      aria-label="git 実行状況"
      title={
        collapsed
          ? '直近1分・ネットワーク git'
          : '通信中 / 直近1分 CLIローカル / go-git / CLIネットワーク'
      }
    >
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'git 実行状況を展開' : 'git 実行状況を折りたたむ'}
        title={collapsed ? '展開' : '折りたたむ'}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {collapsed ? <ChevronsLeftIcon /> : <ChevronsRightIcon />}
      </button>
      {collapsed ? (
        networkChip
      ) : (
        <div className={styles.metrics}>
          <span
            className={`${styles.chip} ${styles.chipLoose}`}
            title="通信中（fetch / pull / push）"
            aria-label={`通信中 git ${counts.inflightNetwork} 件`}
          >
            <span className={styles.icon}>
              <InflightIcon size={ICON_SIZE} active={counts.inflightNetwork > 0} />
            </span>
            <span className={styles.value}>{counts.inflightNetwork}</span>
          </span>
          <span
            className={`${styles.chip} ${styles.afterInflight}`}
            title="直近1分・git.exe ローカル"
            aria-label={`ローカル git ${counts.local} 件`}
          >
            <span className={styles.icon}>
              <HardDriveIcon size={ICON_SIZE} />
            </span>
            <span className={styles.value}>{counts.local}</span>
          </span>
          <span
            className={styles.chip}
            title="直近1分・go-git"
            aria-label={`go-git ${counts.goGit} 件`}
          >
            <span className={styles.icon}>
              <GoGitIcon size={ICON_SIZE} />
            </span>
            <span className={styles.value}>{counts.goGit}</span>
          </span>
          {networkChip}
        </div>
      )}
    </div>
  )
}
