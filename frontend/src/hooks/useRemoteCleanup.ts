import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  defaultRemoteCleanupMode,
  defaultRemoteCleanupStatusFilter,
  getRemoteCleanupPrefs,
  setRemoteCleanupPrefs,
  type RemoteCleanupStatusFilter,
} from '../lib/remoteCleanupPrefsStorage'
import {
  defaultRemoteBaseRef,
  deleteRemoteBranches,
  getSettings,
  listRemoteMergeStatus,
  saveSettings,
} from '../lib/wails'
import type { MergeCheckMode, RemoteMergeEntry } from '../types'
import { localBranchFromRemote } from '../utils/branchTree'
import { isRemoteCleanupExcluded } from '../utils/remoteCleanupExcluded'

interface UseRemoteCleanupOptions {
  open: boolean
  repositoryPath: string
  worktreePath: string
  onDeleted?: () => void | Promise<void>
}

/** リモート整理ダイアログの取得・フィルタ・除外・削除ロジック。 */
export function useRemoteCleanup({
  open,
  repositoryPath,
  worktreePath,
  onDeleted,
}: UseRemoteCleanupOptions) {
  const prefsKey = repositoryPath || worktreePath
  const [baseRef, setBaseRef] = useState('')
  const [baseOptions, setBaseOptions] = useState<string[]>([])
  const [mode, setMode] = useState<MergeCheckMode>(defaultRemoteCleanupMode())
  const [statusFilter, setStatusFilter] = useState<RemoteCleanupStatusFilter>(
    defaultRemoteCleanupStatusFilter(),
  )
  const [nameFilter, setNameFilter] = useState('')
  const [entries, setEntries] = useState<RemoteMergeEntry[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [baseLoading, setBaseLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingExcluded, setSavingExcluded] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [excludedOpen, setExcludedOpen] = useState(false)

  const persistPrefs = useCallback(
    (patch: Parameters<typeof setRemoteCleanupPrefs>[1]) => {
      if (!prefsKey) {
        return
      }
      setRemoteCleanupPrefs(prefsKey, patch)
    },
    [prefsKey],
  )

  useEffect(() => {
    if (!open || !worktreePath) {
      return
    }

    let cancelled = false
    const saved = getRemoteCleanupPrefs(prefsKey)
    setError('')
    setSelected(new Set())
    setBaseRef('')
    setBaseOptions([])
    setEntries([])
    setBaseLoading(true)
    setNameFilter(saved.nameFilter ?? '')
    setStatusFilter(saved.statusFilter ?? defaultRemoteCleanupStatusFilter())
    setMode(saved.mode ?? defaultRemoteCleanupMode())
    setExcludedOpen(false)

    void (async () => {
      try {
        const [defaultBase, settings] = await Promise.all([
          defaultRemoteBaseRef(worktreePath),
          getSettings(),
        ])
        if (cancelled) {
          return
        }
        setBaseRef(saved.baseRef ?? defaultBase)
        setExcluded([...(settings.remoteCleanupExcluded ?? [])])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '基準ブランチの取得に失敗しました')
        }
      } finally {
        if (!cancelled) {
          setBaseLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, prefsKey, worktreePath])

  useEffect(() => {
    if (!open || !worktreePath || !baseRef) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    void (async () => {
      try {
        const result = await listRemoteMergeStatus(worktreePath, baseRef, mode)
        if (cancelled) {
          return
        }
        setEntries(result)
        setBaseOptions(
          [baseRef, ...result.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b)),
        )
        setSelected(new Set())
      } catch (err) {
        if (!cancelled) {
          setEntries([])
          setError(err instanceof Error ? err.message : 'マージ状態の取得に失敗しました')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, worktreePath, baseRef, mode])

  const visible = useMemo(() => {
    const q = nameFilter.trim().toLowerCase()
    return entries.filter((entry) => {
      if (isRemoteCleanupExcluded(entry.name, excluded)) {
        return false
      }
      if (statusFilter === 'merged' && !entry.merged) {
        return false
      }
      if (statusFilter === 'unmerged' && entry.merged) {
        return false
      }
      if (q && !entry.name.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [entries, excluded, nameFilter, statusFilter])

  const allVisibleSelected =
    visible.length > 0 && visible.every((entry) => selected.has(entry.name))

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

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const entry of visible) {
          next.delete(entry.name)
        }
      } else {
        for (const entry of visible) {
          next.add(entry.name)
        }
      }
      return next
    })
  }, [allVisibleSelected, visible])

  const selectedNames = useMemo(
    () => [...selected].sort((a, b) => a.localeCompare(b)),
    [selected],
  )

  const persistExcluded = useCallback(
    async (nextExcluded: string[]) => {
      setSavingExcluded(true)
      setError('')
      try {
        const settings = await getSettings()
        const saved = await saveSettings({
          ...settings,
          remoteCleanupExcluded: nextExcluded,
        })
        setExcluded([...(saved.remoteCleanupExcluded ?? nextExcluded)])
        setSelected((prev) => {
          const next = new Set<string>()
          for (const name of prev) {
            if (!isRemoteCleanupExcluded(name, nextExcluded)) {
              next.add(name)
            }
          }
          return next
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : '除外リストの保存に失敗しました')
      } finally {
        setSavingExcluded(false)
      }
    },
    [],
  )

  const handleAddExcluded = useCallback(async () => {
    if (selectedNames.length === 0) {
      return
    }
    const next = [...excluded]
    const seen = new Set(next)
    for (const remoteRef of selectedNames) {
      let localName: string
      try {
        localName = localBranchFromRemote(remoteRef)
      } catch {
        localName = remoteRef
      }
      if (!seen.has(localName)) {
        seen.add(localName)
        next.push(localName)
      }
    }
    next.sort((a, b) => a.localeCompare(b))
    await persistExcluded(next)
  }, [excluded, persistExcluded, selectedNames])

  const handleRemoveExcluded = useCallback(
    async (name: string) => {
      await persistExcluded(excluded.filter((entry) => entry !== name))
    },
    [excluded, persistExcluded],
  )

  const handleDelete = useCallback(async () => {
    if (selectedNames.length === 0 || !worktreePath) {
      return
    }
    const blocked = selectedNames.filter((name) => isRemoteCleanupExcluded(name, excluded))
    if (blocked.length > 0) {
      setConfirmOpen(false)
      setError(`除外リストのブランチは削除できません: ${blocked.join(', ')}`)
      return
    }
    setDeleting(true)
    setError('')
    try {
      await deleteRemoteBranches(worktreePath, selectedNames)
      setConfirmOpen(false)
      setSelected(new Set())
      const result = await listRemoteMergeStatus(worktreePath, baseRef, mode)
      setEntries(result)
      setBaseOptions(
        [baseRef, ...result.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b)),
      )
      await onDeleted?.()
    } catch (err) {
      setConfirmOpen(false)
      setError(err instanceof Error ? err.message : 'リモートブランチの削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }, [baseRef, excluded, mode, onDeleted, selectedNames, worktreePath])

  const updateBaseRef = useCallback(
    (next: string) => {
      setBaseRef(next)
      persistPrefs({ baseRef: next })
    },
    [persistPrefs],
  )

  const updateStatusFilter = useCallback(
    (next: RemoteCleanupStatusFilter) => {
      setStatusFilter(next)
      persistPrefs({ statusFilter: next })
    },
    [persistPrefs],
  )

  const updateMode = useCallback(
    (next: MergeCheckMode) => {
      setMode(next)
      persistPrefs({ mode: next })
    },
    [persistPrefs],
  )

  const updateNameFilter = useCallback(
    (next: string) => {
      setNameFilter(next)
      persistPrefs({ nameFilter: next })
    },
    [persistPrefs],
  )

  return {
    baseRef,
    baseOptions,
    mode,
    statusFilter,
    nameFilter,
    visible,
    selected,
    selectedNames,
    allVisibleSelected,
    excluded,
    error,
    confirmOpen,
    excludedOpen,
    baseLoading,
    loading,
    busy: deleting || savingExcluded,
    isLoading: baseLoading || loading,
    savingExcluded,
    setConfirmOpen,
    setExcludedOpen,
    updateBaseRef,
    updateStatusFilter,
    updateMode,
    updateNameFilter,
    toggleOne,
    toggleAllVisible,
    handleAddExcluded,
    handleRemoveExcluded,
    handleDelete,
  }
}
