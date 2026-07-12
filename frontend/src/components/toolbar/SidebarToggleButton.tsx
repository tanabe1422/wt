import { Button } from '../ui/Button'
import { useSidebar } from '../layout/sidebarContext'
import styles from './GitSyncToolbar.module.css'

const ICON_SIZE = 14

function ChevronsLeftIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
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
      width={ICON_SIZE}
      height={ICON_SIZE}
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

export function SidebarToggleButton() {
  const { collapsed, collapse, expand } = useSidebar()

  if (collapsed) {
    return (
      <Button
        className={styles.sidebarToggle}
        variant="plain"
        onClick={expand}
        aria-label="サイドパネルを開く"
        title="サイドパネルを開く"
      >
        <ChevronsRightIcon />
      </Button>
    )
  }

  return (
    <Button
      className={styles.sidebarToggle}
      variant="plain"
      onClick={collapse}
      aria-label="サイドパネルを閉じる"
      title="サイドパネルを閉じる"
    >
      <ChevronsLeftIcon />
    </Button>
  )
}
