import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { invalidateWorktreeDiffs } from '../lib/diffCache'
import {
  amendCommit,
  commit,
  continueRebase,
  getAmendInfo,
  getRepoOperationState,
  push,
  pushSetUpstream,
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

  useEffect(() => {
    void refreshOperationState()
  }, [refreshOperationState, unstaged, staged])

  useEffect(() => {
    void refreshAmendInfo()
  }, [refreshAmendInfo, unstaged, staged])

  const conflictCount = unstaged.filter(isConflict).length
  const canContinueRebase =
    repoOperation === 'rebase' && conflictCount === 0 && staged.length > 0
  const commitBlockReason =
    repoOperation === 'rebase'
      ? 'リベース中はバナーの「続行」を使ってください'
      : null

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

  const handleContinueRebase = useCallback(async () => {
    if (!canContinueRebase) {
      return
    }
    setExternalToolError(null)
    let keepRefreshing = true
    await runBusy(async () => {
      try {
        await continueRebase(worktreePath)
        invalidateWorktreeDiffs(worktreePath)
      } catch (err) {
        const state = await getRepoOperationState(worktreePath)
        if (state.kind === 'rebase') {
          return
        }
        keepRefreshing = false
        setExternalToolError(
          err instanceof Error ? err.message : 'リベースの続行に失敗しました',
        )
      }
    })
    if (!keepRefreshing) {
      return
    }
    await Promise.all([
      reload(),
      refreshBadge(),
      refreshBranches(),
      reloadDiff(),
      refreshOperationState(),
      refreshAmendInfo(),
    ])
  }, [
    canContinueRebase,
    refreshAmendInfo,
    refreshBadge,
    refreshBranches,
    refreshOperationState,
    reload,
    reloadDiff,
    runBusy,
    setExternalToolError,
    worktreePath,
  ])

  return {
    repoOperation,
    merging: repoOperation === 'merge',
    rebasing: repoOperation === 'rebase',
    canContinueRebase,
    commitBlockReason,
    amendInfo,
    refreshOperationState,
    refreshMergeState: refreshOperationState,
    handleContinueRebase,
    handleCommit,
  }
}
