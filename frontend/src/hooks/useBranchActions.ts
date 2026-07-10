import { useCallback, useState } from 'react'

import { errorMessage } from '../lib/errorMessage'
import {
  checkoutRemoteBranch,
  createBranch,
  deleteBranch,
  mergeBranch,
  squashMergeBranch,
  switchBranch,
} from '../lib/wails'

interface UseBranchActionsOptions {
  worktreePath: string | null
  onSuccess: () => void | Promise<void>
}

export function useBranchActions({ worktreePath, onSuccess }: UseBranchActionsOptions) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAction = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      if (!worktreePath || busy) {
        return
      }

      setBusy(true)
      setError(null)
      try {
        await action()
        await onSuccess()
      } catch (err) {
        setError(errorMessage(err, fallbackMessage))
      } finally {
        setBusy(false)
      }
    },
    [busy, onSuccess, worktreePath],
  )

  const switchLocalBranch = useCallback(
    (branch: string) =>
      runAction(
        () => switchBranch(worktreePath!, branch),
        'ブランチの切り替えに失敗しました',
      ),
    [runAction, worktreePath],
  )

  const checkoutRemote = useCallback(
    (remoteRef: string) =>
      runAction(
        () => checkoutRemoteBranch(worktreePath!, remoteRef),
        'ブランチのチェックアウトに失敗しました',
      ),
    [runAction, worktreePath],
  )

  const merge = useCallback(
    (source: string) =>
      runAction(
        () => mergeBranch(worktreePath!, source),
        'マージに失敗しました',
      ),
    [runAction, worktreePath],
  )

  const squashMerge = useCallback(
    (source: string) =>
      runAction(
        () => squashMergeBranch(worktreePath!, source),
        'スカッシュマージに失敗しました',
      ),
    [runAction, worktreePath],
  )

  const removeBranch = useCallback(
    (branch: string, force: boolean) =>
      runAction(
        () => deleteBranch(worktreePath!, branch, force),
        'ブランチの削除に失敗しました',
      ),
    [runAction, worktreePath],
  )

  const create = useCallback(
    (name: string) =>
      runAction(
        () => createBranch(worktreePath!, name),
        'ブランチの作成に失敗しました',
      ),
    [runAction, worktreePath],
  )

  const dismissError = useCallback(() => setError(null), [])

  return {
    busy,
    error,
    dismissError,
    switchLocalBranch,
    checkoutRemote,
    merge,
    squashMerge,
    removeBranch,
    create,
  }
}
