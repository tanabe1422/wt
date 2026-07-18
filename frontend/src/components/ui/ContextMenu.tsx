import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  computeContextMenuPosition,
  toContextMenuPosition,
} from '../../lib/contextMenuPosition'
import { Button } from './Button'
import styles from './ContextMenu.module.css'

export interface ContextMenuItem {
  type?: 'item'
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

export interface ContextMenuSeparator {
  type: 'separator'
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() => toContextMenuPosition(x, y))

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) {
      return
    }
    const { width, height } = menu.getBoundingClientRect()
    setPosition(computeContextMenuPosition(x, y, width, height))
  }, [x, y, items])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return
      }
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {items.map((entry, index) => {
        if (entry.type === 'separator') {
          return (
            <div
              key={`sep-${index}`}
              className={styles.separator}
              role="separator"
            />
          )
        }

        return (
          <Button
            key={`${entry.label}-${index}`}
            variant="menuItem"
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => {
              entry.onClick()
              onClose()
            }}
          >
            <span className={styles.itemContent}>
              {entry.icon ? <span className={styles.itemIcon}>{entry.icon}</span> : null}
              <span className={styles.itemLabel}>{entry.label}</span>
            </span>
          </Button>
        )
      })}
    </div>,
    document.body,
  )
}
