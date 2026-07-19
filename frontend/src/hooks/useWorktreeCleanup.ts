import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../lib/errorMessage'
import { removeWorktree } from '../lib/wails'
import type { WorktreeEntry } from '../types'
import { formatDetachedLabel, isDetachedWorktree } from '../utils/detachedHead'

export interface WorktreeCleanupRow {
  path: string
  name: string
  branchLabel: string
  changedFileCount: number
  locked: boolean
  isMain: boolean
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function branchLabelFor(worktree: WorktreeEntry): string {
  if (isDetachedWorktree(worktree)) {
    return formatDetachedLabel(worktree.head)
  }
  return worktree.branch || '—'
}

export function buildWorktreeCleanupRows(worktrees: WorktreeEntry[]): WorktreeCleanupRow[] {
  return worktrees.map((entry) => ({
    path: entry.path,
    name: baseName(entry.path),
    branchLabel: branchLabelFor(entry),
    changedFileCount: entry.changedFileCount,
    locked: entry.isMain,
    isMain: entry.isMain,
  }))
}

interface UseWorktreeCleanupOptions {
  open: boolean
  repoPath: string | null
  worktrees: WorktreeEntry[]
  selectedWorktree: string | null
  onSelectWorktree?: (path: string) => void
  onDeleted?: () => void | Promise<void>
}

export function useWorktreeCleanup({
  open,
  repoPath,
  worktrees,
  selectedWorktree,
  onSelectWorktree,
  onDeleted,
}: UseWorktreeCleanupOptions) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceDelete, setForceDelete] = useState(false)

  const rows = useMemo(() => buildWorktreeCleanupRows(worktrees), [worktrees])

  const deletablePaths = useMemo(
    () => rows.filter((row) => !row.locked).map((row) => row.path),
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
    // repoPath: clear selection when the dialog stays open across repo switches
  }, [open, repoPath])

  useEffect(() => {
    if (!open) {
      return
    }
    const allowed = new Set(deletablePaths)
    setSelected((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const path of prev) {
        if (allowed.has(path)) {
          next.add(path)
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [deletablePaths, open])

  const selectedPaths = useMemo(() => {
    return deletablePaths.filter((path) => selected.has(path))
  }, [deletablePaths, selected])

  const allDeletableSelected =
    deletablePaths.length > 0 && selectedPaths.length === deletablePaths.length

  const toggleOne = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const toggleAllDeletable = useCallback(() => {
    setSelected((prev) => {
      const allSelected =
        deletablePaths.length > 0 && deletablePaths.every((path) => prev.has(path))
      if (allSelected) {
        return new Set()
      }
      return new Set(deletablePaths)
    })
  }, [deletablePaths])

  const handleDelete = useCallback(async () => {
    if (!repoPath || selectedPaths.length === 0 || busy) {
      return
    }

    const removing = new Set(selectedPaths)
    setBusy(true)
    setError('')
    try {
      for (const path of selectedPaths) {
        await removeWorktree(repoPath, path, forceDelete)
      }
      setConfirmOpen(false)
      setSelected(new Set())
      if (selectedWorktree && removing.has(selectedWorktree)) {
        const fallbackPath =
          worktrees.find((entry) => entry.isMain && !removing.has(entry.path))?.path ??
          worktrees.find((entry) => !removing.has(entry.path))?.path ??
          null
        if (fallbackPath) {
          onSelectWorktree?.(fallbackPath)
        }
      }
      await onDeleted?.()
    } catch (err) {
      setError(errorMessage(err, 'ワークツリーの削除に失敗しました'))
      setConfirmOpen(false)
    } finally {
      setBusy(false)
    }
  }, [
    busy,
    forceDelete,
    onDeleted,
    onSelectWorktree,
    repoPath,
    selectedPaths,
    selectedWorktree,
    worktrees,
  ])

  return {
    rows,
    selected,
    selectedPaths,
    allDeletableSelected,
    deletableCount: deletablePaths.length,
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
