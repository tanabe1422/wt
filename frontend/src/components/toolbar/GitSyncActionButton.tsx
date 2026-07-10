import { ToolbarActionButton } from './ToolbarActionButton'
import { GitSyncIcon, gitSyncActionLabel, type GitSyncAction } from './GitSyncIcons'
import type { ButtonHTMLAttributes } from 'react'

interface GitSyncActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  action: GitSyncAction
  label?: string
  badgeCount?: number
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
  ...rest
}: GitSyncActionButtonProps) {
  const text = label ?? gitSyncActionLabel(action)

  return (
    <ToolbarActionButton
      label={text}
      icon={<GitSyncIcon action={action} size={20} />}
      badgeCount={badgeCount}
      badgeVariant={badgeVariantForAction(action)}
      {...rest}
    />
  )
}
