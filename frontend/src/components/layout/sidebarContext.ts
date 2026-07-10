import { createContext, useContext } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  width: number
  collapse: () => void
  expand: () => void
  setWidth: (width: number) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const value = useContext(SidebarContext)
  if (!value) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return value
}
