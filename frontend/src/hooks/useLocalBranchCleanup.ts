import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../lib/errorMessage'
import { deleteBranch } from '../lib/wails'
import type { BranchEntry } from '../types'
import { getBranchMarkFlags } from '../utils/branchMarks'
import type { BusyChangeHandler } from './useBusy'

export interface LocalCleanupRow {
  name: string
  hasUpstream: boolean
  aheadCount: number
  locked: boolean
  isCheckedOutOnSelected: boolean
  hasWorktree: boolean
}

interface UseLocalBranchCleanupOptions {
  open: boolean
  worktreePath: string | null
  branches: BranchEntry[]
  checkedOutBranch: string | null
  worktreeBranches: Set<string>
  onDeleted?: () => void | Promise<void>
  onBusyChange?: BusyChangeHandler
}

export function useLocalBranchCleanup({
  open,
  worktreePath,
  branches,
  checkedOutBranch,
  worktreeBranches,
  onDeleted,
  onBusyChange,
}: UseLocalBranchCleanupOptions) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const rows = useMemo((): LocalCleanupRow[] => {
    return branches
      .filter((entry) => !entry.isRemote)
      .map((entry) => {
        const marks = getBranchMarkFlags(entry.name, checkedOutBranch, worktreeBranches)
        return {
          name: entry.name,
          hasUpstream: entry.hasUpstream,
          aheadCount: entry.aheadCount,
          locked: marks.hasWorktree || marks.isCheckedOutOnSelected,
          isCheckedOutOnSelected: marks.isCheckedOutOnSelected,
          hasWorktree: marks.hasWorktree,
        }
      })
  }, [branches, checkedOutBranch, worktreeBranches])

  const deletableNames = useMemo(
    () => rows.filter((row) => !row.locked).map((row) => row.name),
    [rows],
  )

  useEffect(() => {
    if (!open) {
      return
    }
    setSelected(new Set())
    setError('')
    setConfirmOpen(false)
    setForceDelete(false)
    // worktreePath: clear selection when the dialog stays open across repo switches
  }, [open, worktreePath])

  useEffect(() => {
    if (!open) {
      return
    }
    const allowed = new Set(deletableNames)
    setSelected((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const name of prev) {
        if (allowed.has(name)) {
          next.add(name)
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [deletableNames, open])

  const selectedNames = useMemo(() => {
    return deletableNames.filter((name) => selected.has(name))
  }, [deletableNames, selected])

  const allDeletableSelected =
    deletableNames.length > 0 && selectedNames.length === deletableNames.length

  const toggleOne = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const toggleAllDeletable = useCallback(() => {
    setSelected((prev) => {
      const allSelected =
        deletableNames.length > 0 && deletableNames.every((name) => prev.has(name))
      if (allSelected) {
        return new Set()
      }
      return new Set(deletableNames)
    })
  }, [deletableNames])

  const handleDelete = useCallback(async () => {
    if (!worktreePath || selectedNames.length === 0 || busy) {
      return
    }

    setConfirmOpen(false)
    setBusy(true)
    onBusyChange?.(true, 'ブランチを削除しています…')
    setError('')
    try {
      for (const name of selectedNames) {
        await deleteBranch(worktreePath, name, forceDelete)
      }
      setSelected(new Set())
      await onDeleted?.()
    } catch (err) {
      setError(errorMessage(err, 'ブランチの削除に失敗しました'))
      await onDeleted?.()
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }, [busy, forceDelete, onBusyChange, onDeleted, selectedNames, worktreePath])

  return {
    rows,
    selected,
    selectedNames,
    allDeletableSelected,
    deletableCount: deletableNames.length,
    busy,
    error,
    confirmOpen,
    forceDelete,
    setConfirmOpen,
    setForceDelete,
    toggleOne,
    toggleAllDeletable,
    handleDelete,
  }
}
