import { useCallback } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import { localBranchFromRemote } from '../utils/branchTree'
import { useContextMenu } from './useContextMenu'

interface UseBranchContextMenuOptions {
  isRemote: boolean
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
  onSwitchLocal: (branch: string) => void
  onCheckoutRemote: (remoteRef: string) => void
  onNewWorktree?: (branch: string) => void
  onMerge?: (branch: string) => void
  onSquashMerge?: (branch: string) => void
  onDelete?: (branch: string) => void
}

function isBranchCheckedOut(
  branchName: string,
  isRemote: boolean,
  checkedOutBranch: string | null,
): boolean {
  if (!checkedOutBranch) {
    return false
  }
  if (isRemote) {
    try {
      return localBranchFromRemote(branchName) === checkedOutBranch
    } catch {
      return false
    }
  }
  return branchName === checkedOutBranch
}

function branchHasWorktree(
  branchName: string,
  isRemote: boolean,
  worktreeBranches: Set<string>,
): boolean {
  if (isRemote) {
    try {
      return worktreeBranches.has(localBranchFromRemote(branchName))
    } catch {
      return false
    }
  }
  return worktreeBranches.has(branchName)
}

export function useBranchContextMenu({
  isRemote,
  checkedOutBranch,
  worktreeBranches,
  onSwitchLocal,
  onCheckoutRemote,
  onNewWorktree,
  onMerge,
  onSquashMerge,
  onDelete,
}: UseBranchContextMenuOptions) {
  const { menu, openMenu, closeMenu } = useContextMenu()

  const openBranchMenu = useCallback(
    (branchName: string, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const checkedOut = isBranchCheckedOut(branchName, isRemote, checkedOutBranch)
      const hasWorktree = branchHasWorktree(branchName, isRemote, worktreeBranches)
      const items: ContextMenuEntry[] = [
        {
          label: isRemote ? 'チェックアウト' : '切り替え',
          disabled: checkedOut,
          onClick: () => {
            if (isRemote) {
              onCheckoutRemote(branchName)
            } else {
              onSwitchLocal(branchName)
            }
          },
        },
        {
          label: '新しいワークツリーでチェックアウト',
          disabled: hasWorktree || !onNewWorktree,
          onClick: () => onNewWorktree?.(branchName),
        },
      ]

      if (!isRemote) {
        items.push(
          { type: 'separator' },
          {
            label: 'マージ',
            disabled: checkedOut || !onMerge,
            onClick: () => onMerge?.(branchName),
          },
          {
            label: 'スカッシュマージ',
            disabled: checkedOut || !onSquashMerge,
            onClick: () => onSquashMerge?.(branchName),
          },
          { type: 'separator' },
          {
            label: 'ブランチを削除',
            disabled: checkedOut || !onDelete,
            onClick: () => onDelete?.(branchName),
          },
        )
      }

      openMenu(event.clientX, event.clientY, items)
    },
    [
      checkedOutBranch,
      isRemote,
      onCheckoutRemote,
      onDelete,
      onMerge,
      onNewWorktree,
      onSquashMerge,
      onSwitchLocal,
      openMenu,
      worktreeBranches,
    ],
  )

  return { menu, openBranchMenu, closeMenu }
}
