import { useCallback, useState } from 'react'

import {
  abortMerge,
  deleteUntracked,
  discardAllChanges,
  discardFiles,
} from '../lib/wails'
import type { FileStatus } from '../types'
import {
  type ConfirmAction,
  confirmActionFromPartition,
  confirmDialogLabel,
  confirmDialogMessage,
  confirmDialogTitle,
  partitionDiscardPaths,
} from '../utils/gitDestructiveConfirm'

interface UseGitDestructiveConfirmOptions {
  worktreePath: string
  unstaged: FileStatus[]
  stagedCount: number
  unstagedCount: number
  runBusy: (action: () => Promise<void>) => Promise<void>
  clearAll: () => void
  clearUnstaged: () => void
  afterDestructive: () => Promise<void>
}

export function useGitDestructiveConfirm({
  worktreePath,
  unstaged,
  stagedCount,
  unstagedCount,
  runBusy,
  clearAll,
  clearUnstaged,
  afterDestructive,
}: UseGitDestructiveConfirmOptions) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const requestDiscardPaths = useCallback(
    (paths: string[]) => {
      const { discardPaths, deletePaths } = partitionDiscardPaths(paths, unstaged)
      const action = confirmActionFromPartition(discardPaths, deletePaths)
      if (action) {
        setConfirmAction(action)
      }
    },
    [unstaged],
  )

  const requestDiscardAll = useCallback(() => {
    if (stagedCount === 0 && unstagedCount === 0) {
      return
    }
    setConfirmAction({ kind: 'discardAll' })
  }, [stagedCount, unstagedCount])

  const requestAbortMerge = useCallback(() => {
    setConfirmAction({ kind: 'abort' })
  }, [])

  const requestDeletePaths = useCallback((paths: string[]) => {
    setConfirmAction({ kind: 'delete', paths })
  }, [])

  const requestDiscardTrackedPaths = useCallback((paths: string[]) => {
    setConfirmAction({ kind: 'discard', paths })
  }, [])

  const cancelConfirm = useCallback(() => {
    setConfirmAction(null)
  }, [])

  const handleConfirmDestructive = useCallback(async () => {
    const action = confirmAction
    setConfirmAction(null)
    if (!action) {
      return
    }
    await runBusy(async () => {
      if (action.kind === 'abort') {
        await abortMerge(worktreePath)
      } else if (action.kind === 'discardAll') {
        await discardAllChanges(worktreePath)
        clearAll()
      } else if (action.kind === 'discard') {
        await discardFiles(worktreePath, action.paths)
        clearUnstaged()
      } else if (action.kind === 'delete') {
        await deleteUntracked(worktreePath, action.paths)
        clearUnstaged()
      } else {
        if (action.discardPaths.length > 0) {
          await discardFiles(worktreePath, action.discardPaths)
        }
        if (action.deletePaths.length > 0) {
          await deleteUntracked(worktreePath, action.deletePaths)
        }
        clearUnstaged()
      }
      await afterDestructive()
    })
  }, [
    afterDestructive,
    clearAll,
    clearUnstaged,
    confirmAction,
    runBusy,
    worktreePath,
  ])

  return {
    confirmAction,
    confirmTitle: confirmDialogTitle(confirmAction),
    confirmMessage: confirmDialogMessage(confirmAction),
    confirmLabel: confirmDialogLabel(confirmAction),
    requestDiscardPaths,
    requestDiscardAll,
    requestAbortMerge,
    requestDeletePaths,
    requestDiscardTrackedPaths,
    cancelConfirm,
    handleConfirmDestructive,
  }
}
