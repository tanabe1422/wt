import { useCallback, useEffect, useState } from 'react'

import { type GitSyncAction } from '../components/toolbar/GitSyncIcons'
import {
  createBranch,
  fetchRemote,
  fetchRemotePrune,
  fetchRemotePriority,
  getRepoOperationState,
  pull,
  pullRebase,
  push,
  pushSetUpstream,
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

const syncOverlayMessages: Record<GitSyncAction, string> = {
  fetch: 'フェッチしています…',
  pull: 'プルしています…',
  push: 'プッシュしています…',
}

async function runSyncAction(action: GitSyncAction, worktreePath: string): Promise<void> {
  if (action === 'pull') {
    await pull(worktreePath)
    return
  }
  await push(worktreePath)
}

interface UseGitSyncActionsOptions {
  worktreePath: string
  hasUpstream: boolean
  onActionComplete?: (op?: GitOp) => void | Promise<void>
  onReload?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
  onFetchPhaseChange?: (phase: FetchPhase | null) => void
}

/** ツールバーの fetch / pull / push / branch / stash など同期系アクション。 */
export function useGitSyncActions({
  worktreePath,
  hasUpstream,
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
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false)
  const [upstreamPushOpen, setUpstreamPushOpen] = useState(false)
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

  const runFetch = useCallback(
    async (prune: boolean) => {
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
    [finishAction, hasUpstream, onActionComplete, onFetchPhaseChange, setOverlay, worktreePath],
  )

  const runPush = useCallback(async () => {
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プッシュしています…')
    try {
      await push(worktreePath)
    } catch (err) {
      setActionTitle(actionTitles.push)
      setActionError(err instanceof Error ? err.message : 'プッシュに失敗しました')
    } finally {
      await finishAction('push')
    }
  }, [finishAction, setOverlay, worktreePath])

  const run = useCallback(
    async (action: GitSyncAction) => {
      if (action === 'fetch') {
        await runFetch(false)
        return
      }
      if (action === 'push') {
        if (!hasUpstream) {
          setUpstreamPushOpen(true)
          return
        }
        setPushConfirmOpen(true)
        return
      }
      setActionError(null)
      setActing(true)
      setOverlay(true, syncOverlayMessages[action])
      try {
        await runSyncAction(action, worktreePath)
      } catch (err) {
        setActionTitle(actionTitles[action])
        setActionError(err instanceof Error ? err.message : '操作に失敗しました')
      } finally {
        // pull は作業ツリーが変わるが、全 WT status は不要（statusBadgeAndBranches）。
        await finishAction(action === 'pull' ? 'pull' : 'fetch')
      }
    },
    [finishAction, hasUpstream, runFetch, setOverlay, worktreePath],
  )

  const handlePushConfirm = useCallback(() => {
    setPushConfirmOpen(false)
    void runPush()
  }, [runPush])

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

  const handlePullRebase = useCallback(async () => {
    setActionError(null)
    setActing(true)
    setOverlay(true, 'プルしています…')
    try {
      await pullRebase(worktreePath)
    } catch (err) {
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
    } finally {
      await finishAction('pull')
    }
  }, [finishAction, setOverlay, worktreePath])

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

  return {
    acting,
    reloading,
    createOpen,
    setCreateOpen,
    stashOpen,
    setStashOpen,
    pushConfirmOpen,
    setPushConfirmOpen,
    upstreamPushOpen,
    setUpstreamPushOpen,
    actionTitle,
    actionErrorDialog,
    run,
    handleFetchPrune,
    handlePullRebase,
    handleCreateBranch,
    handleSaveStash,
    handleOpenExplorer,
    handlePushConfirm,
    handlePushSetUpstream,
    handleReload,
  }
}
