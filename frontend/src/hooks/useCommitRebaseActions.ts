import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { invalidateWorktreeDiffs } from '../lib/diffCache'
import { errorMessage } from '../lib/errorMessage'
import {
  amendCommit,
  commit,
  continueCherryPick,
  continueRebase,
  getAmendInfo,
  getRepoOperationState,
  push,
  pushSetUpstream,
  skipCherryPick,
} from '../lib/wails'
import type { AmendInfo, FileStatus, RepoOperationKind } from '../types'
import { amendInfoEqual } from '../utils/amendInfo'
import { isConflict } from '../utils/gitStatus'

interface UseCommitRebaseActionsOptions {
  worktreePath: string
  hasUpstream: boolean
  staged: FileStatus[]
  unstaged: FileStatus[]
  clearAll: () => void
  reload: () => Promise<void>
  reloadDiff: () => Promise<void>
  refreshBadge: () => Promise<void>
  refreshBranches: () => Promise<void>
  runBusy: (action: () => Promise<void>) => Promise<void>
  setExternalToolError: Dispatch<SetStateAction<string | null>>
}

/** Commit / Amend / Rebase 続行と repoOperation・amendInfo 状態。 */
export function useCommitRebaseActions({
  worktreePath,
  hasUpstream,
  staged,
  unstaged,
  clearAll,
  reload,
  reloadDiff,
  refreshBadge,
  refreshBranches,
  runBusy,
  setExternalToolError,
}: UseCommitRebaseActionsOptions) {
  const [repoOperation, setRepoOperation] = useState<RepoOperationKind>('none')
  const [amendInfo, setAmendInfo] = useState<AmendInfo | null>(null)

  const refreshOperationState = useCallback(async () => {
    if (!worktreePath) {
      setRepoOperation('none')
      return
    }
    try {
      const state = await getRepoOperationState(worktreePath)
      setRepoOperation(state.kind)
    } catch {
      setRepoOperation('none')
    }
  }, [worktreePath])

  const refreshAmendInfo = useCallback(async () => {
    if (!worktreePath) {
      setAmendInfo(null)
      return
    }
    try {
      const next = await getAmendInfo(worktreePath)
      setAmendInfo((current) => (amendInfoEqual(current, next) ? current : next))
    } catch {
      const fallback: AmendInfo = {
        canAmend: false,
        reason: '状態の確認に失敗しました',
        headMessage: '',
      }
      setAmendInfo((current) => (amendInfoEqual(current, fallback) ? current : fallback))
    }
  }, [worktreePath])

  const conflictCount = unstaged.filter(isConflict).length
  const statusLenKey = `${staged.length}:${unstaged.length}:${conflictCount}`

  useEffect(() => {
    void refreshOperationState()
  }, [refreshOperationState, statusLenKey])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAmendInfo()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [refreshAmendInfo, statusLenKey])

  const canContinueOperation =
    (repoOperation === 'rebase' || repoOperation === 'cherry-pick') &&
    conflictCount === 0 &&
    staged.length > 0
  const canSkipCherryPick =
    repoOperation === 'cherry-pick' &&
    conflictCount === 0 &&
    staged.length === 0 &&
    unstaged.length === 0
  const commitBlockReason =
    repoOperation === 'rebase'
      ? 'リベース中はバナーの「続行」を使ってください'
      : repoOperation === 'cherry-pick'
        ? 'cherry-pick 中はバナーの「続行」を使ってください'
        : null

  const refreshAfterOperation = useCallback(async () => {
    await Promise.all([
      reload(),
      refreshBadge(),
      refreshBranches(),
      reloadDiff(),
      refreshOperationState(),
      refreshAmendInfo(),
    ])
  }, [
    refreshAmendInfo,
    refreshBadge,
    refreshBranches,
    refreshOperationState,
    reload,
    reloadDiff,
  ])

  const handleCommit = useCallback(
    async (message: string, options: { amend: boolean; pushAfterCommit: boolean }) => {
      await runBusy(async () => {
        if (options.amend) {
          await amendCommit(worktreePath, message)
        } else {
          await commit(worktreePath, message)
        }
        if (options.pushAfterCommit) {
          try {
            if (hasUpstream) {
              await push(worktreePath)
            } else {
              await pushSetUpstream(worktreePath, 'origin')
            }
          } catch (err) {
            const detail = err instanceof Error ? err.message : 'プッシュに失敗しました'
            throw new Error(`push:${detail}`)
          }
        }
      })
      clearAll()
      await Promise.all([
        reload(),
        refreshBadge(),
        refreshBranches(),
        refreshAmendInfo(),
        refreshOperationState(),
      ])
    },
    [
      clearAll,
      hasUpstream,
      refreshAmendInfo,
      refreshBadge,
      refreshBranches,
      refreshOperationState,
      runBusy,
      worktreePath,
      reload,
    ],
  )

  const handleContinueOperation = useCallback(async () => {
    if (!canContinueOperation) {
      return
    }
    const continuingCherryPick = repoOperation === 'cherry-pick'
    setExternalToolError(null)
    let keepRefreshing = true
    await runBusy(async () => {
      try {
        if (continuingCherryPick) {
          await continueCherryPick(worktreePath)
        } else {
          await continueRebase(worktreePath)
        }
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        const state = await getRepoOperationState(worktreePath)
        if (state.kind === 'rebase' || state.kind === 'cherry-pick') {
          if (
            continuingCherryPick &&
            state.kind === 'cherry-pick' &&
            staged.length === 0 &&
            unstaged.length === 0
          ) {
            setExternalToolError(
              'このコミットの変更は既に取り込まれています。バナーの「スキップ」で終了できます。',
            )
          }
          return
        }
        keepRefreshing = false
        setExternalToolError(
          errorMessage(
            err,
            continuingCherryPick
              ? 'cherry-pick の続行に失敗しました'
              : 'リベースの続行に失敗しました',
          ),
        )
      }
    })
    if (!keepRefreshing) {
      return
    }
    await refreshAfterOperation()
  }, [
    canContinueOperation,
    refreshAfterOperation,
    repoOperation,
    runBusy,
    setExternalToolError,
    staged.length,
    unstaged.length,
    worktreePath,
  ])

  const handleSkipCherryPick = useCallback(async () => {
    if (!canSkipCherryPick) {
      return
    }
    setExternalToolError(null)
    let keepRefreshing = true
    await runBusy(async () => {
      try {
        await skipCherryPick(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        keepRefreshing = false
        setExternalToolError(errorMessage(err, 'cherry-pick のスキップに失敗しました'))
      }
    })
    if (!keepRefreshing) {
      return
    }
    await refreshAfterOperation()
  }, [canSkipCherryPick, refreshAfterOperation, runBusy, setExternalToolError, worktreePath])

  return {
    repoOperation,
    merging: repoOperation === 'merge',
    rebasing: repoOperation === 'rebase',
    canContinueRebase: canContinueOperation,
    canContinueOperation,
    canSkipCherryPick,
    commitBlockReason,
    amendInfo,
    refreshOperationState,
    refreshMergeState: refreshOperationState,
    handleContinueRebase: handleContinueOperation,
    handleContinueOperation,
    handleSkipCherryPick,
    handleCommit,
  }
}
