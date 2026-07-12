import { useCallback, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../../utils/cx'
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu'
import { CountBadge, type CountBadgeVariant } from '../ui/CountBadge'
import styles from './SplitToolbarActionButton.module.css'

interface SplitToolbarActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  icon: ReactNode
  menuItems: ContextMenuEntry[]
  menuAriaLabel?: string
  badgeCount?: number
  badgeVariant?: CountBadgeVariant
  showBadgeIcon?: boolean
}

function ChevronDownIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      className={styles.chevronIcon}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SplitToolbarActionButton({
  label,
  icon,
  menuItems,
  menuAriaLabel,
  badgeCount = 0,
  badgeVariant,
  showBadgeIcon = false,
  className,
  type = 'button',
  disabled,
  onClick,
  ...rest
}: SplitToolbarActionButtonProps) {
  const chevronRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const menuOpen = menuPos !== null

  const closeMenu = useCallback(() => {
    setMenuPos(null)
  }, [])

  const openMenu = useCallback(() => {
    const el = chevronRef.current
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

  return (
    <>
      <div className={cx(styles.group, menuOpen && styles.open, className)}>
        <button
          type={type}
          className={styles.main}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          {...rest}
        >
          {badgeVariant && badgeCount > 0 && (
            <CountBadge
              count={badgeCount}
              variant={badgeVariant}
              showIcon={showBadgeIcon}
              className={styles.badge}
            />
          )}
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </button>
        <button
          ref={chevronRef}
          type="button"
          className={styles.chevron}
          aria-label={menuAriaLabel ?? `${label}のオプション`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            toggleMenu()
          }}
        >
          <ChevronDownIcon />
        </button>
      </div>
      {menuPos && (
        <ContextMenu x={menuPos.x} y={menuPos.y} items={menuItems} onClose={closeMenu} />
      )}
    </>
  )
}
