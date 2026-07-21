import { openAppIcon } from '../components/icons/openAppIcons'
import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import type { OpenApp } from '../types'

/** Build 「〜で開く」 items for registered open-apps (no separators). */
export function buildOpenAppMenuItems(
  openApps: OpenApp[],
  iconDataUrls: Record<string, string>,
  onOpen: (appID: string) => void,
): ContextMenuEntry[] {
  const launchable = openApps.filter((app) => app.path.trim() !== '')
  return launchable.map((app) => {
    const name = app.name.trim() || app.path.trim() || 'アプリ'
    return {
      icon: openAppIcon(app.icon, iconDataUrls[app.path.trim()] ?? null),
      label: `${name}で開く`,
      onClick: () => {
        onOpen(app.id)
      },
    }
  })
}

/** Concatenate non-empty menu groups with separators between them. */
export function withMenuSeparators(...groups: ContextMenuEntry[][]): ContextMenuEntry[] {
  const items: ContextMenuEntry[] = []
  for (const group of groups) {
    if (group.length === 0) {
      continue
    }
    if (items.length > 0) {
      items.push({ type: 'separator' })
    }
    items.push(...group)
  }
  return items
}
