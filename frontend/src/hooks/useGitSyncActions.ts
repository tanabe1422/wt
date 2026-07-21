import { useCallback, useEffect, useState } from 'react'

import { type GitSyncAction } from '../components/toolbar/GitSyncIcons'
import type { PullOptions } from '../components/toolbar/PullOptionsDialog'
import type { PushOptions } from '../components/toolbar/PushOptionsDialog'
import {
  createBranch,
  fetchRemote,
  fetchRemotePrune,
  fetchRemotePriority,
  getRepoOperationState,
  pull,
  pullForce,
  pullRebase,
  push,
  pushForce,
  pushSetUpstream,
  resetWorkingTree,
  saveStash,
  showInExplorer,
} from '../lib/wails'
import type { GitOp, ToolbarGitOp } from '../utils/gitRefreshPolicy'
import type { BusyChangeHandler } from './useBusy'
import { useErrorDialog } from './useErrorDialog'

/** フェッチの 2 段階: 優先（現行 upstream）→ 裏（全 ref）。 */
export type FetchPhase = 'priority' | 'background'

const actionTitles: Record<GitSyncAction, string> = {
  fetch: 'フェッチに失敗しました',
  pull: 'プルに失敗しました',
  push: 'プッシュに失敗しました',
}

interface UseGitSyncActionsOptions {
  worktreePath: string
  hasUpstream: boolean
  /** 未コミット変更があるときだけリセットを有効化 */
  hasUncommittedChanges?: boolean
  onActionComplete?: (op?: GitOp) => void | Promise<void>
  onReload?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
  onFetchPhaseChange?: (phase: FetchPhase | null) => void
}

/** ツールバーの fetch / pull / push / branch / stash など同期系アクション。 */
export function useGitSyncActions({
  worktreePath,
  hasUpstream,
  hasUncommittedChanges = false,
  onActionComplete,
  onReload,
  onBusyChange,
  onFetchPhaseChange,
}: UseGitSyncActionsOptions) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionTitle, setActionTitle] = useState('操作に失敗しました')
  const [acting, setActing] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [stashOpen, setStashOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushForceConfirmOpen, setPushForceConfirmOpen] = useState(false)
  const [pendingPushOptions, setPendingPushOptions] = useState<PushOptions | null>(null)
  const [upstreamPushOpen, setUpstreamPushOpen] = useState(false)
  const [pullOpen, setPullOpen] = useState(false)
  const [pullForceConfirmOpen, setPullForceConfirmOpen] = useState(false)
  const [pendingPullOptions, setPendingPullOptions] = useState<PullOptions | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const actionErrorDialog = useErrorDialog(actionError)

  const setOverlay = useCallback(
    (active: boolean, message?: string) => {
      onBusyChange?.(active, message)
    },
    [onBusyChange],
  )

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const handleReload = useCallback(async () => {
    if (!onReload || reloading) {
      return
    }
    setReloading(true)
    try {
      await onReload()
    } finally {
      setReloading(false)
    }
  }, [onReload, reloading])

  /** 全画面スピナーは git 操作中だけ。完了後の ahead/behind 再読込は acting を掴まない。 */
  const finishAction = useCallback(
    async (op: ToolbarGitOp) => {
      setOverlay(false)
      setActing(false)
      await onActionComplete?.(op)
    },
    [onActionComplete, setOverlay],
  )

  const dialogOpen =
    createOpen ||
    stashOpen ||
    pushOpen ||
    pushForceConfirmOpen ||
    upstreamPushOpen ||
    pullOpen ||
    pullForceConfirmOpen ||
    resetConfirmOpen

  const runFetch = useCallback(
    async (prune: boolean) => {
      if (acting || dialogOpen) {
        return
      }
      setActionError(null)
      setActing(true)

      const failTitle = prune ? 'フェッチ（prune）に失敗しました' : actionTitles.fetch

      try {
        if (!hasUpstream) {
          setOverlay(true, 'フェッチしています…')
          if (prune) {
            await fetchRemotePrune(worktreePath)
          } else {
            await fetchRemote(worktreePath)
          }
          await finishAction('fetch')
          return
        }

        onFetchPhaseChange?.('priority')
        await fetchRemotePriority(worktreePath)
        setActing(false)
        await onActionComplete?.('fetch')

        onFetchPhaseChange?.('background')
        try {
          if (prune) {
            await fetchRemotePrune(worktreePath)
          } else {
            await fetchRemote(worktreePath)
          }
          await onActionComplete?.('fetch')
        } catch (bgErr) {
          setActionTitle(failTitle)
          setActionError(bgErr instanceof Error ? bgErr.message : failTitle)
        } finally {
          onFetchPhaseChange?.(null)
        }
      } catch (err) {
        setActionTitle(failTitle)
        setActionError(err instanceof Error ? err.message : failTitle)
        setOverlay(false)
        setActing(false)
        onFetchPhaseChange?.(null)
      }
    },
    [
      acting,
      dialogOpen,
      finishAction,
      hasUpstream,
      onActionComplete,
      onFetchPhaseChange,
      setOverlay,
      worktreePath,
    ],
  )

  const executePush = useCallback(
    async (options: PushOptions) => {
      setActionError(null)
      setActing(true)
      const overlayMessage = options.force ? '強制プッシュしています…' : 'プッシュしています…'
      setOverlay(true, overlayMessage)
      try {
        if (options.force) {
          await pushForce(worktreePath)
        } else {
          await push(worktreePath)
        }
      } catch (err) {
        const title = options.force ? '強制プッシュに失敗しました' : actionTitles.push
        setActionTitle(title)
        setActionError(err instanceof Error ? err.message : title)
      } finally {
        await finishAction('push')
      }
    },
    [finishAction, setOverlay, worktreePath],
  )

  const executePull = useCallback(
    async (options: PullOptions) => {
      setActionError(null)
      setActing(true)
      const overlayMessage = options.force ? '強制プルしています…' : 'プルしています…'
      setOverlay(true, overlayMessage)
      try {
        if (options.force) {
          await pullForce(worktreePath)
        } else if (options.rebase) {
          await pullRebase(worktreePath)
        } else {
          await pull(worktreePath)
        }
      } catch (err) {
        if (options.rebase && !options.force) {
          try {
            const state = await getRepoOperationState(worktreePath)
            if (state.kind !== 'rebase') {
              setActionTitle('プル（rebase）に失敗しました')
              setActionError(err instanceof Error ? err.message : 'プル（rebase）に失敗しました')
            }
          } catch {
            setActionTitle('プル（rebase）に失敗しました')
            setActionError(err instanceof Error ? err.message : 'プル（rebase）に失敗しました')
          }
        } else {
          const title = options.force ? '強制プルに失敗しました' : actionTitles.pull
          setActionTitle(title)
          setActionError(err instanceof Error ? err.message : title)
        }
      } finally {
        await finishAction('pull')
      }
    },
    [finishAction, setOverlay, worktreePath],
  )

  const run = useCallback(
    async (action: GitSyncAction) => {
      if (acting || dialogOpen) {
        return
      }
      if (action === 'fetch') {
        await runFetch(false)
        return
      }
      if (action === 'push') {
        if (!hasUpstream) {
          setUpstreamPushOpen(true)
          return
        }
        setPushOpen(true)
        return
      }
      if (action === 'pull') {
        setPullOpen(true)
        return
      }
    },
    [acting, dialogOpen, hasUpstream, runFetch],
  )

  const handlePullOptionsConfirm = useCallback((options: PullOptions) => {
    setPullOpen(false)
    if (options.force) {
      setPendingPullOptions(options)
      setPullForceConfirmOpen(true)
      return
    }
    void executePull(options)
  }, [executePull])

  const handlePullForceConfirm = useCallback(() => {
    setPullForceConfirmOpen(false)
    const options = pendingPullOptions ?? { rebase: false, force: true }
    setPendingPullOptions(null)
    void executePull(options)
  }, [executePull, pendingPullOptions])

  const handlePullForceConfirmCancel = useCallback(() => {
    setPullForceConfirmOpen(false)
    setPendingPullOptions(null)
    setPullOpen(true)
  }, [])

  const handlePushOptionsConfirm = useCallback(
    (options: PushOptions) => {
      setPushOpen(false)
      if (options.force) {
        setPendingPushOptions(options)
        setPushForceConfirmOpen(true)
        return
      }
      void executePush(options)
    },
    [executePush],
  )

  const handlePushForceConfirm = useCallback(() => {
    setPushForceConfirmOpen(false)
    const options = pendingPushOptions ?? { force: true }
    setPendingPushOptions(null)
    void executePush(options)
  }, [executePush, pendingPushOptions])

  const handlePushForceConfirmCancel = useCallback(() => {
    setPushForceConfirmOpen(false)
    setPendingPushOptions(null)
    setPushOpen(true)
  }, [])

  const handlePushSetUpstream = useCallback(async () => {
    setUpstreamPushOpen(false)
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プッシュしています…')
    try {
      await pushSetUpstream(worktreePath, 'origin')
    } catch (err) {
      setActionTitle(actionTitles.push)
      setActionError(err instanceof Error ? err.message : 'プッシュに失敗しました')
    } finally {
      await finishAction('push')
    }
  }, [finishAction, setOverlay, worktreePath])

  const handleFetchPrune = useCallback(async () => {
    await runFetch(true)
  }, [runFetch])

  const handleCreateBranch = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) {
        return
      }
      setCreateOpen(false)
      setActionError(null)
      setActing(true)
      setOverlay(true, 'ブランチを作成しています…')
      try {
        await createBranch(worktreePath, trimmed)
      } catch (err) {
        setActionTitle('ブランチの作成に失敗しました')
        setActionError(err instanceof Error ? err.message : 'ブランチの作成に失敗しました')
      } finally {
        await finishAction('createBranch')
      }
    },
    [finishAction, setOverlay, worktreePath],
  )

  const handleSaveStash = useCallback(
    async (message: string) => {
      setStashOpen(false)
      setActionError(null)
      setActing(true)
      setOverlay(true, 'スタッシュしています…')
      try {
        await saveStash(worktreePath, message, true)
      } catch (err) {
        setActionTitle('スタッシュに失敗しました')
        setActionError(err instanceof Error ? err.message : 'スタッシュに失敗しました')
      } finally {
        await finishAction('saveStash')
      }
    },
    [finishAction, setOverlay, worktreePath],
  )

  const handleOpenExplorer = useCallback(async () => {
    if (!worktreePath) {
      return
    }
    try {
      await showInExplorer(worktreePath)
    } catch (err) {
      setActionTitle('エクスプローラーを開けませんでした')
      setActionError(err instanceof Error ? err.message : 'エクスプローラーを開けませんでした')
    }
  }, [worktreePath])

  const handleResetWorkingTreeRequest = useCallback(() => {
    if (acting || dialogOpen || !hasUncommittedChanges) {
      return
    }
    setResetConfirmOpen(true)
  }, [acting, dialogOpen, hasUncommittedChanges])

  const handleResetWorkingTreeConfirm = useCallback(async () => {
    setResetConfirmOpen(false)
    setActionError(null)
    setActing(true)
    setOverlay(true, 'リセットしています…')
    try {
      await resetWorkingTree(worktreePath)
    } catch (err) {
      setActionTitle('リセットに失敗しました')
      setActionError(err instanceof Error ? err.message : 'リセットに失敗しました')
    } finally {
      await finishAction('resetWorkingTree')
    }
  }, [finishAction, setOverlay, worktreePath])

  const handleResetWorkingTreeCancel = useCallback(() => {
    setResetConfirmOpen(false)
  }, [])

  return {
    acting,
    dialogOpen,
    reloading,
    createOpen,
    setCreateOpen,
    stashOpen,
    setStashOpen,
    pushOpen,
    setPushOpen,
    pushForceConfirmOpen,
    upstreamPushOpen,
    setUpstreamPushOpen,
    pullOpen,
    setPullOpen,
    pullForceConfirmOpen,
    resetConfirmOpen,
    actionTitle,
    actionErrorDialog,
    run,
    handleFetchPrune,
    handlePullOptionsConfirm,
    handlePullForceConfirm,
    handlePullForceConfirmCancel,
    handleCreateBranch,
    handleSaveStash,
    handleOpenExplorer,
    handleResetWorkingTreeRequest,
    handleResetWorkingTreeConfirm,
    handleResetWorkingTreeCancel,
    handlePushOptionsConfirm,
    handlePushForceConfirm,
    handlePushForceConfirmCancel,
    handlePushSetUpstream,
    handleReload,
  }
}
