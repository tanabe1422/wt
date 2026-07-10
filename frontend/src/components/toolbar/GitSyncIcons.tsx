export type GitSyncAction = 'pull' | 'push' | 'fetch'

interface GitSyncIconProps {
  action: GitSyncAction
  size?: number
}

const actionLabels: Record<GitSyncAction, string> = {
  pull: 'プル',
  push: 'プッシュ',
  fetch: 'フェッチ',
}

export function gitSyncActionLabel(action: GitSyncAction): string {
  return actionLabels[action]
}

export function GitSyncIcon({ action, size = 18 }: GitSyncIconProps) {
  switch (action) {
    case 'pull':
      return <PullIcon size={size} />
    case 'push':
      return <PushIcon size={size} />
    case 'fetch':
      return <FetchIcon size={size} />
  }
}

/** プル: 下向き矢印（リモート → ローカルへ取り込む） */
function PullIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 11 12 15l3.5-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** プッシュ: 上向き矢印（ローカル → リモートへ送る） */
function PushIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 20V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 12 12 8l3.5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** フェッチ: 回転矢印（リモートの最新情報を確認・取得） */
function FetchIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12a7 7 0 0 1 11.6-5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.6 4.8 17 8l-3.2-.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 12a7 7 0 0 1-11.6 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.4 19.2 7 16l3.2.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
