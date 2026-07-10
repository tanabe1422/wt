import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import { cx } from '../../utils/cx'
import { SidebarContext, useSidebar } from './sidebarContext'
import styles from './CollapsibleSidebar.module.css'

const STORAGE_KEY = 'wt-manager.sidebarCollapsed'
const STORAGE_KEY_WIDTH = 'wt-manager.sidebarWidth'
const DEFAULT_WIDTH = 280
const MIN_WIDTH = 200
const MAX_WIDTH = 560

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

function readWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WIDTH)
    if (!raw) return DEFAULT_WIDTH
    const value = Number(raw)
    if (!Number.isFinite(value)) return DEFAULT_WIDTH
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value))
  } catch {
    return DEFAULT_WIDTH
  }
}

function writeWidth(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY_WIDTH, String(width))
  } catch {
    // ignore
  }
}

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
}

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [width, setWidth] = useState(readWidth)

  useEffect(() => {
    writeCollapsed(collapsed)
  }, [collapsed])

  const expand = useCallback(() => setCollapsed(false), [])
  const collapse = useCallback(() => setCollapsed(true), [])
  const setSidebarWidth = useCallback(
    (nextWidth: number) => setWidth(clampWidth(nextWidth)),
    [],
  )

  const contextValue = useMemo(
    () => ({ collapsed, width, collapse, expand, setWidth: setSidebarWidth }),
    [collapsed, width, collapse, expand, setSidebarWidth],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

interface CollapsibleSidebarProps {
  children: ReactNode
}

export function CollapsibleSidebar({ children }: CollapsibleSidebarProps) {
  const { collapsed, width, setWidth } = useSidebar()
  const [resizing, setResizing] = useState(false)
  const widthRef = useRef(width)

  useEffect(() => {
    widthRef.current = width
  }, [width])

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return

      event.preventDefault()
      const startX = event.clientX
      const startWidth = widthRef.current

      setResizing(true)

      const onMove = (moveEvent: PointerEvent) => {
        const nextWidth = clampWidth(startWidth + moveEvent.clientX - startX)
        widthRef.current = nextWidth
        setWidth(nextWidth)
      }

      const onUp = () => {
        setResizing(false)
        writeWidth(widthRef.current)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [collapsed, setWidth],
  )

  const wrapperStyle = {
    '--sidebar-width': `${width}px`,
  } as CSSProperties

  return (
    <div
      className={cx(
        styles.wrapper,
        collapsed && styles.wrapperCollapsed,
        resizing && styles.wrapperResizing,
      )}
      style={wrapperStyle}
      data-collapsed={collapsed || undefined}
    >
      <div className={styles.content}>{children}</div>
      {!collapsed && (
        <div
          className={styles.resizeHandle}
          onPointerDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="サイドパネルの幅を調整"
        />
      )}
    </div>
  )
}
