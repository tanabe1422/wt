import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../lib/errorMessage'
import { dropStash, listStashes } from '../lib/wails'
import type { StashEntry } from '../types'
import type { BusyChangeHandler } from './useBusy'

interface UseStashCleanupOptions {
  open: boolean
  worktreePath: string
  onDeleted?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
}

export function useStashCleanup({
  open,
  worktreePath,
  onDeleted,
  onBusyChange,
}: UseStashCleanupOptions) {
  const [stashes, setStashes] = useState<StashEntry[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const reload = useCallback(async () => {
    if (!worktreePath) {
      setStashes([])
      setFocusedIndex(null)
      setSelected(new Set())
      return
    }
    setLoading(true)
    setError('')
    try {
      const entries = await listStashes(worktreePath)
      setStashes(entries)
      setSelected((prev) => {
        const allowed = new Set(entries.map((entry) => entry.index))
        const next = new Set<number>()
        for (const index of prev) {
          if (allowed.has(index)) {
            next.add(index)
          }
        }
        return next
      })
      setFocusedIndex((prev) => {
        if (prev !== null && entries.some((entry) => entry.index === prev)) {
          return prev
        }
        return entries[0]?.index ?? null
      })
    } catch (err) {
      setStashes([])
      setFocusedIndex(null)
      setSelected(new Set())
      setError(errorMessage(err, 'スタッシュ一覧の取得に失敗しました'))
    } finally {
      setLoading(false)
    }
  }, [worktreePath])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelected(new Set())
    setFocusedIndex(null)
    setConfirmOpen(false)
    setError('')
    void reload()
  }, [open, worktreePath, reload])

  const selectedIndexes = useMemo(() => {
    return stashes.map((entry) => entry.index).filter((index) => selected.has(index))
  }, [selected, stashes])

  const selectedLabels = useMemo(() => {
    return stashes
      .filter((entry) => selected.has(entry.index))
      .map((entry) => `${entry.ref}  ${entry.message || '（メッセージなし）'}`)
  }, [selected, stashes])

  const allSelected = stashes.length > 0 && selectedIndexes.length === stashes.length

  const toggleOne = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const everySelected =
        stashes.length > 0 && stashes.every((entry) => prev.has(entry.index))
      if (everySelected) {
        return new Set()
      }
      return new Set(stashes.map((entry) => entry.index))
    })
  }, [stashes])

  const focusRow = useCallback((index: number) => {
    setFocusedIndex(index)
  }, [])

  const handleDelete = useCallback(async () => {
    if (selectedIndexes.length === 0 || !worktreePath) {
      return
    }
    setConfirmOpen(false)
    setBusy(true)
    onBusyChange?.(true, 'スタッシュを削除しています…')
    setError('')
    try {
      const descending = [...selectedIndexes].sort((a, b) => b - a)
      for (const index of descending) {
        await dropStash(worktreePath, index)
      }
      setSelected(new Set())
      await reload()
      await onDeleted?.()
    } catch (err) {
      setError(errorMessage(err, 'スタッシュの削除に失敗しました'))
      // 途中まで drop 済みの可能性があるため、失敗時も一覧を再読込する
      await reload()
      await onDeleted?.()
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }, [onBusyChange, onDeleted, reload, selectedIndexes, worktreePath])

  return {
    stashes,
    selected,
    selectedIndexes,
    selectedLabels,
    focusedIndex,
    allSelected,
    loading,
    busy,
    error,
    confirmOpen,
    setConfirmOpen,
    toggleOne,
    toggleAll,
    focusRow,
    handleDelete,
  }
}
