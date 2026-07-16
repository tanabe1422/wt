import { ToolbarActionButton } from './ToolbarActionButton'
import styles from './MainViewToolbarTabs.module.css'

export type MainView = 'files' | 'history'

interface MainViewIconProps {
  view: MainView
  size?: number
}

export function MainViewIcon({ view, size = 20 }: MainViewIconProps) {
  if (view === 'history') {
    return <HistoryIcon size={size} />
  }
  return <FilesIcon size={size} />
}

function FilesIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4h4M9 13h6M9 17h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HistoryIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const viewLabels: Record<MainView, string> = {
  files: 'ファイル',
  history: '履歴',
}

interface MainViewToolbarTabsProps {
  view: MainView
  onChange: (view: MainView) => void
  /** 現行 WT に未コミット変更があるとき、ファイルタブに丸バッジを出す */
  hasFileChanges?: boolean
}

export function MainViewToolbarTabs({
  view,
  onChange,
  hasFileChanges = false,
}: MainViewToolbarTabsProps) {
  const views: MainView[] = ['files', 'history']

  return (
    <div className={styles.group} role="tablist" aria-label="メイン表示">
      {views.map((item) => (
        <ToolbarActionButton
          key={item}
          role="tab"
          aria-selected={view === item}
          label={viewLabels[item]}
          icon={<MainViewIcon view={item} />}
          active={view === item}
          showDot={item === 'files' && hasFileChanges}
          onClick={() => onChange(item)}
        />
      ))}
    </div>
  )
}
