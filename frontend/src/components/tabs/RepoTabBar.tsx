import { useCallback, useEffect, useRef, useState } from 'react'

import { ContextMenu } from '../ui/ContextMenu'
import { IconButton } from '../ui/IconButton'
import { GitRateChips } from './GitRateChips'
import styles from './RepoTabBar.module.css'

interface RepoTabBarProps {
  repositories: string[]
  activeRepository: string
  onActivate: (path: string) => void
  onClose: (path: string) => void
  onAddLocal: () => void
  onOpenClone: () => void
  onPrefetch?: (path: string) => void
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function RepoTabBar({
  repositories,
  activeRepository,
  onActivate,
  onClose,
  onAddLocal,
  onOpenClone,
  onPrefetch,
}: RepoTabBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef(new Map<string, HTMLDivElement>())
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const menuOpen = menuPos !== null

  const closeMenu = useCallback(() => {
    setMenuPos(null)
  }, [])

  const openMenu = useCallback(() => {
    const el = addButtonRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    setMenuPos({ x: rect.left, y: rect.bottom + 4 })
  }, [])

  const toggleMenu = useCallback(() => {
    if (menuOpen) {
      closeMenu()
      return
    }
    openMenu()
  }, [closeMenu, menuOpen, openMenu])

  useEffect(() => {
    if (!activeRepository) {
      return
    }

    const bar = barRef.current
    const tab = tabRefs.current.get(activeRepository)
    if (!bar || !tab) {
      return
    }

    requestAnimationFrame(() => {
      const currentBar = barRef.current
      const currentTab = tabRefs.current.get(activeRepository)
      if (!currentBar || !currentTab) {
        return
      }

      const barRect = currentBar.getBoundingClientRect()
      const tabRect = currentTab.getBoundingClientRect()
      const leftClipped = tabRect.left < barRect.left - 0.5
      const notAtLeftEdge = tabRect.left > barRect.left + 0.5

      if (leftClipped || notAtLeftEdge) {
        currentBar.scrollLeft = currentTab.offsetLeft
      }
    })
  }, [activeRepository, repositories])

  useEffect(() => {
    const el = barRef.current
    if (!el) {
      return
    }

    function handleWheel(event: WheelEvent) {
      const bar = barRef.current
      if (!bar || bar.scrollWidth <= bar.clientWidth) {
        return
      }
      event.preventDefault()
      bar.scrollLeft += event.deltaY
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [repositories.length])

  return (
    <>
      <div className={styles.wrapper}>
        <div ref={barRef} className={styles.bar} role="tablist">
          {repositories.map((path) => {
            const isActive = path === activeRepository
            return (
              <div
                key={path}
                ref={(element) => {
                  if (element) {
                    tabRefs.current.set(path, element)
                  } else {
                    tabRefs.current.delete(path)
                  }
                }}
                role="tab"
                aria-selected={isActive}
                title={path}
                className={`${styles.tab}${isActive ? ` ${styles.active}` : ''}`}
                onClick={() => onActivate(path)}
                onMouseEnter={() => {
                  if (!isActive) {
                    onPrefetch?.(path)
                  }
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) {
                    event.preventDefault()
                    onClose(path)
                  }
                }}
              >
                <span className={styles.label}>{baseName(path)}</span>
                <IconButton
                  size="sm"
                  className={styles.close}
                  aria-label="閉じる"
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose(path)
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            )
          })}
        </div>
        <GitRateChips />
        <button
          ref={addButtonRef}
          type="button"
          className={styles.addButton}
          aria-label="リポジトリを追加"
          title="リポジトリを追加"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <PlusIcon />
        </button>
      </div>
      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={[
            {
              label: 'ローカルリポジトリを選択',
              onClick: onAddLocal,
            },
            {
              label: 'リモートからクローン',
              onClick: onOpenClone,
            },
          ]}
          onClose={closeMenu}
        />
      )}
    </>
  )
}
