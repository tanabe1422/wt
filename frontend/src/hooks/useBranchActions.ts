import { useCallback, useEffect, useState } from 'react'

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
import type { BusyChangeHandler } from './useBusy'

interface UseBranchActionsOptions {
  worktreePath: string | null
  /** 切替・マージ等: 軽量リフレッシュ（B + W1 + workspace content） */
  onSuccess: () => void | Promise<void>
  /** リネーム・削除・作成: サイドバー構造のフル更新 */
  onStructureChanged?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
}

export function useBranchActions({
  worktreePath,
  onSuccess,
  onStructureChanged,
  onBusyChange,
}: UseBranchActionsOptions) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const beginBusy = useCallback(
    (message: string) => {
      setBusy(true)
      onBusyChange?.(true, message)
    },
    [onBusyChange],
  )

  const endBusy = useCallback(() => {
    setBusy(false)
    onBusyChange?.(false)
  }, [onBusyChange])

  const runAction = useCallback(
    async (
      action: () => Promise<void>,
      fallbackMessage: string,
      busyMessage: string,
      after: () => void | Promise<void> = onSuccess,
    ): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      beginBusy(busyMessage)
      setError(null)
      try {
        await action()
      } catch (err) {
        setError(errorMessage(err, fallbackMessage))
        return false
      } finally {
        // Git 完了時点でオーバーレイ解除。リフレッシュは裏で続行。
        endBusy()
      }
      void Promise.resolve(after()).catch(() => {
        // リフレッシュ失敗は非致命（次回操作や手動再読込で回復）
      })
      return true
    },
    [beginBusy, busy, endBusy, onSuccess, worktreePath],
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
        'ブランチを切り替えています…',
      ),
    [runAction, worktreePath],
  )

  const checkoutRemote = useCallback(
    (remoteRef: string) =>
      runAction(
        () => checkoutRemoteBranch(worktreePath!, remoteRef),
        'ブランチのチェックアウトに失敗しました',
        'ブランチをチェックアウトしています…',
      ),
    [runAction, worktreePath],
  )

  const runMergeAction = useCallback(
    async (
      action: () => Promise<void>,
      fallbackMessage: string,
      busyMessage: string,
    ): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      beginBusy(busyMessage)
      setError(null)
      let failed = false
      try {
        await action()
      } catch (err) {
        // Conflicts leave the worktree dirty without MERGE_HEAD (squash) or with it (merge).
        failed = true
        setError(errorMessage(err, fallbackMessage))
      } finally {
        endBusy()
      }
      void Promise.resolve(onSuccess()).catch(() => {})
      return !failed
    },
    [beginBusy, busy, endBusy, onSuccess, worktreePath],
  )

  const merge = useCallback(
    (source: string, allowFastForward: boolean) =>
      runMergeAction(
        () => mergeBranch(worktreePath!, source, allowFastForward),
        'マージに失敗しました',
        'マージしています…',
      ),
    [runMergeAction, worktreePath],
  )

  const squashMerge = useCallback(
    (source: string) =>
      runMergeAction(
        () => squashMergeBranch(worktreePath!, source),
        'スカッシュマージに失敗しました',
        'スカッシュマージしています…',
      ),
    [runMergeAction, worktreePath],
  )

  const rebase = useCallback(
    async (upstream: string): Promise<boolean> => {
      if (!worktreePath || busy) {
        return false
      }

      beginBusy('リベースしています…')
      setError(null)
      let ok = false
      try {
        await rebaseBranch(worktreePath, upstream)
        ok = true
      } catch (err) {
        try {
          const state = await getRepoOperationState(worktreePath)
          if (state.kind === 'rebase') {
            ok = true
          } else {
            setError(errorMessage(err, 'リベースに失敗しました'))
          }
        } catch {
          setError(errorMessage(err, 'リベースに失敗しました'))
        }
      } finally {
        endBusy()
      }
      if (ok) {
        void Promise.resolve(onSuccess()).catch(() => {})
      }
      return ok
    },
    [beginBusy, busy, endBusy, onSuccess, worktreePath],
  )

  const removeBranch = useCallback(
    (branch: string, force: boolean) =>
      runAction(
        () => deleteBranch(worktreePath!, branch, force),
        'ブランチの削除に失敗しました',
        'ブランチを削除しています…',
        afterStructure,
      ),
    [afterStructure, runAction, worktreePath],
  )

  const rename = useCallback(
    (oldName: string, newName: string) =>
      runAction(
        () => renameBranch(worktreePath!, oldName, newName),
        'ブランチのリネームに失敗しました',
        'ブランチをリネームしています…',
        afterStructure,
      ),
    [afterStructure, runAction, worktreePath],
  )

  const create = useCallback(
    (name: string) =>
      runAction(
        () => createBranch(worktreePath!, name),
        'ブランチの作成に失敗しました',
        'ブランチを作成しています…',
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
