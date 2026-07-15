import { useCallback, useState } from 'react'

import { errorMessage } from '../lib/errorMessage'
import {
  checkoutRemoteBranch,
  createBranch,
  deleteBranch,
  getRepoOperationState,
  mergeBranch,
  rebaseBranch,
  renameBranch,
  squashMergeBranch,
  switchBranch,
} from '../lib/wails'

interface UseBranchActionsOptions {
  worktreePath: string | null
  /** 切替・マージ等: 軽量リフレッシュ（B + W1 + workspace content） */
  onSuccess: () => void | Promise<void>
  /** リネーム・削除・作成: サイドバー構造のフル更新 */
  onStructureChanged?: () => void | Promise<void>
}

export function useBranchActions({
  worktreePath,
  onSuccess,
  onStructureChanged,
}: UseBranchActionsOptions) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAction = useCallback(
    async (
      action: () => Promise<void>,
      fallbackMessage: string,
      after: () => void | Promise<void> = onSuccess,
    ): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      setBusy(true)
      setError(null)
      try {
        await action()
        await after()
        return true
      } catch (err) {
        setError(errorMessage(err, fallbackMessage))
        return false
      } finally {
        setBusy(false)
      }
    },
    [busy, onSuccess, worktreePath],
  )

  const afterStructure = useCallback(
    () => (onStructureChanged ? onStructureChanged() : onSuccess()),
    [onStructureChanged, onSuccess],
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

  const runMergeAction = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      setBusy(true)
      setError(null)
      try {
        await action()
        await onSuccess()
        return true
      } catch (err) {
        // Conflicts leave the worktree dirty without MERGE_HEAD (squash) or with it (merge).
        await onSuccess()
        setError(errorMessage(err, fallbackMessage))
        return false
      } finally {
        setBusy(false)
      }
    },
    [busy, onSuccess, worktreePath],
  )

  const merge = useCallback(
    (source: string) =>
      runMergeAction(
        () => mergeBranch(worktreePath!, source),
        'マージに失敗しました',
      ),
    [runMergeAction, worktreePath],
  )

  const squashMerge = useCallback(
    (source: string) =>
      runMergeAction(
        () => squashMergeBranch(worktreePath!, source),
        'スカッシュマージに失敗しました',
      ),
    [runMergeAction, worktreePath],
  )

  const rebase = useCallback(
    async (upstream: string): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      setBusy(true)
      setError(null)
      try {
        await rebaseBranch(worktreePath, upstream)
        await onSuccess()
        return true
      } catch (err) {
        try {
          const state = await getRepoOperationState(worktreePath)
          if (state.kind === 'rebase') {
            await onSuccess()
            return true
          }
        } catch {
          // fall through to error
        }
        setError(errorMessage(err, 'リベースに失敗しました'))
        return false
      } finally {
        setBusy(false)
      }
    },
    [busy, onSuccess, worktreePath],
  )

  const removeBranch = useCallback(
    (branch: string, force: boolean) =>
      runAction(
        () => deleteBranch(worktreePath!, branch, force),
        'ブランチの削除に失敗しました',
        afterStructure,
      ),
    [afterStructure, runAction, worktreePath],
  )

  const rename = useCallback(
    (oldName: string, newName: string) =>
      runAction(
        () => renameBranch(worktreePath!, oldName, newName),
        'ブランチのリネームに失敗しました',
        afterStructure,
      ),
    [afterStructure, runAction, worktreePath],
  )

  const create = useCallback(
    (name: string) =>
      runAction(
        () => createBranch(worktreePath!, name),
        'ブランチの作成に失敗しました',
        afterStructure,
      ),
    [afterStructure, runAction, worktreePath],
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
    rebase,
    removeBranch,
    rename,
    create,
  }
}
