import { useCallback, useEffect, useState, type MouseEvent } from 'react'

import { useErrorDialog } from './useErrorDialog'
import { applyStash, dropStash, listStashes, popStash } from '../lib/wails'
import type { StashEntry } from '../types'
import type { BusyChangeHandler } from './useBusy'

type StashConfirmKind = 'pop' | 'drop'

interface StashConfirm {
  kind: StashConfirmKind
  stash: StashEntry
}

interface UseStashActionsOptions {
  worktreePath: string | null
  reloadToken?: number | string
  onSuccess?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
}

export function useStashActions({
  worktreePath,
  reloadToken = 0,
  onSuccess,
  onBusyChange,
}: UseStashActionsOptions) {
  const [stashes, setStashes] = useState<StashEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<StashConfirm | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; stash: StashEntry } | null>(null)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const reload = useCallback(async () => {
    if (!worktreePath) {
      setStashes([])
      return
    }
    setLoading(true)
    try {
      const next = await listStashes(worktreePath)
      setStashes(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'stash 一覧の取得に失敗しました')
      setStashes([])
    } finally {
      setLoading(false)
    }
  }, [worktreePath])

  useEffect(() => {
    void reload()
  }, [reload, reloadToken])

  const run = useCallback(
    async (fn: () => Promise<void>, notifyWorkspace = true) => {
      if (!worktreePath || busy) {
        return
      }
      setBusy(true)
      onBusyChange?.(true, 'stash を処理しています…')
      setError(null)
      try {
        await fn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'stash 操作に失敗しました')
      } finally {
        // apply/pop は衝突でも作業ツリーが変わるため、失敗時も一覧と status を取り直す
        try {
          await reload()
          if (notifyWorkspace) {
            await onSuccess?.()
          }
        } catch {
          // reload / onSuccess の失敗で元エラーを上書きしない
        }
        setBusy(false)
        onBusyChange?.(false)
      }
    },
    [busy, onBusyChange, onSuccess, reload, worktreePath],
  )

  const apply = useCallback(
    (stash: StashEntry) => {
      void run(async () => {
        if (!worktreePath) {
          return
        }
        await applyStash(worktreePath, stash.index)
      })
    },
    [run, worktreePath],
  )

  const requestPop = useCallback((stash: StashEntry) => {
    setConfirm({ kind: 'pop', stash })
  }, [])

  const requestDrop = useCallback((stash: StashEntry) => {
    setConfirm({ kind: 'drop', stash })
  }, [])

  const confirmAction = useCallback(() => {
    if (!confirm || !worktreePath) {
      return
    }
    const { kind, stash } = confirm
    setConfirm(null)
    void run(async () => {
      if (kind === 'pop') {
        await popStash(worktreePath, stash.index)
      } else {
        await dropStash(worktreePath, stash.index)
      }
    }, kind !== 'drop')
  }, [confirm, run, worktreePath])

  const openMenu = useCallback((stash: StashEntry, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY, stash })
  }, [])

  const closeMenu = useCallback(() => {
    setMenu(null)
  }, [])

  const errorDialog = useErrorDialog(error)

  return {
    stashes,
    loading,
    busy,
    error,
    confirm,
    menu,
    reload,
    apply,
    requestPop,
    requestDrop,
    confirmAction,
    cancelConfirm: () => setConfirm(null),
    openMenu,
    closeMenu,
    dismissError: () => {
      errorDialog.dismiss()
      setError(null)
    },
    errorDialog,
  }
}
