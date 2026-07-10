import { useCallback, useState } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuEntry[]
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  const openMenu = useCallback((x: number, y: number, items: ContextMenuEntry[]) => {
    setMenu({ x, y, items })
  }, [])

  return { menu, openMenu, closeMenu }
}
