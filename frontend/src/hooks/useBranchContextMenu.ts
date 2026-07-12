import { useCallback } from 'react'
import type { MouseEvent } from 'react'

import type { ContextMenuEntry } from '../components/ui/ContextMenu'
import { localBranchFromRemote } from '../utils/branchTree'
import { useContextMenu } from './useContextMenu'

interface UseBranchContextMenuOptions {
  isRemote: boolean
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
  compareFromRef?: string | null
  onSwitchLocal: (branch: string) => void
  onCheckoutRemote: (remoteRef: string) => void
  onNewWorktree?: (branch: string) => void
  onCompareWithCurrent?: (branch: string) => void
  onMerge?: (branch: string) => void
  onSquashMerge?: (branch: string) => void
  onRename?: (branch: string) => void
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
  compareFromRef,
  onSwitchLocal,
  onCheckoutRemote,
  onNewWorktree,
  onCompareWithCurrent,
  onMerge,
  onSquashMerge,
  onRename,
  onDelete,
}: UseBranchContextMenuOptions) {
  const { menu, openMenu, closeMenu } = useContextMenu()

  const openBranchMenu = useCallback(
    (branchName: string, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const checkedOut = isBranchCheckedOut(branchName, isRemote, checkedOutBranch)
      const hasWorktree = branchHasWorktree(branchName, isRemote, worktreeBranches)
      // Local current branch only: comparing a tip with itself is empty.
      // Remote tracking refs may differ from the local tip, so keep enabled.
      const compareDisabled =
        !onCompareWithCurrent ||
        !compareFromRef ||
        compareFromRef === '' ||
        (!isRemote && checkedOutBranch !== null && branchName === checkedOutBranch)

      const items: ContextMenuEntry[] = [
        {
          label: isRemote
            ? 'チェックアウト'
            : hasWorktree
              ? 'ワークツリーに切り替え'
              : '切り替え',
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
        {
          label: '現在のブランチとの Diff を表示',
          disabled: compareDisabled,
          onClick: () => onCompareWithCurrent?.(branchName),
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
            label: 'ブランチ名を変更',
            disabled: !onRename,
            onClick: () => onRename?.(branchName),
          },
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
      compareFromRef,
      isRemote,
      onCheckoutRemote,
      onCompareWithCurrent,
      onDelete,
      onMerge,
      onNewWorktree,
      onRename,
      onSquashMerge,
      onSwitchLocal,
      openMenu,
      worktreeBranches,
    ],
  )

  return { menu, openBranchMenu, closeMenu }
}
