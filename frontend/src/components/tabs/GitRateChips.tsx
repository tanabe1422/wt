import { useEffect, useState } from 'react'

import { getGitDebugSnapshot } from '../../lib/wails'
import { HardDriveIcon } from '../sidebar/BranchIcons'
import styles from './GitRateChips.module.css'

const POLL_MS = 1000
const ICON_SIZE = 16

interface GitRateCounts {
  inflightNetwork: number
  local: number
  goGit: number
  network: number
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
  const [counts, setCounts] = useState<GitRateCounts>({
    inflightNetwork: 0,
    local: 0,
    goGit: 0,
    network: 0,
  })

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

  return (
    <div
      className={styles.chips}
      aria-label="git 実行状況"
      title="通信中 / 直近1分 CLIローカル / go-git / CLIネットワーク"
    >
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
      <span
        className={`${styles.chip} ${styles.chipLoose}`}
        title="直近1分・ネットワークあり"
        aria-label={`ネットワーク git ${counts.network} 件`}
      >
        <span className={styles.icon}>
          <NetworkCloudIcon size={ICON_SIZE} />
        </span>
        <span className={styles.value}>{counts.network}</span>
      </span>
    </div>
  )
}
