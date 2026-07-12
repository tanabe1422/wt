import type { ButtonHTMLAttributes } from 'react'

import type { ContextMenuEntry } from '../ui/ContextMenu'
import { SplitToolbarActionButton } from './SplitToolbarActionButton'
import { ToolbarActionButton } from './ToolbarActionButton'
import { GitSyncIcon, gitSyncActionLabel, type GitSyncAction } from './GitSyncIcons'

interface GitSyncActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  action: GitSyncAction
  label?: string
  badgeCount?: number
  /** When set, renders a split button with a chevron menu (used for fetch options). */
  menuItems?: ContextMenuEntry[]
}

function badgeVariantForAction(action: GitSyncAction): 'ahead' | 'behind' | undefined {
  if (action === 'push') {
    return 'ahead'
  }
  if (action === 'pull') {
    return 'behind'
  }
  return undefined
}

export function GitSyncActionButton({
  action,
  label,
  badgeCount = 0,
  menuItems,
  ...rest
}: GitSyncActionButtonProps) {
  const text = label ?? gitSyncActionLabel(action)
  const icon = <GitSyncIcon action={action} size={20} />
  const badgeVariant = badgeVariantForAction(action)

  if (menuItems && menuItems.length > 0) {
    return (
      <SplitToolbarActionButton
        label={text}
        icon={icon}
        menuItems={menuItems}
        badgeCount={badgeCount}
        badgeVariant={badgeVariant}
        {...rest}
      />
    )
  }

  return (
    <ToolbarActionButton
      label={text}
      icon={icon}
      badgeCount={badgeCount}
      badgeVariant={badgeVariant}
      {...rest}
    />
  )
}
