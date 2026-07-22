import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'

import { errorMessage } from '../lib/errorMessage'
import {
  addWorktree,
  defaultWorktreePath,
  openInApp,
  openTerminal,
  removeWorktree,
  showInExplorer,
} from '../lib/wails'
import type { OpenApp, WorktreeEntry } from '../types'
import { localBranchFromRemote } from '../utils/branchTree'
import { worktreePathHint } from '../utils/worktreePathHint'
import type { BusyChangeHandler } from './useBusy'

interface WorktreeCheckoutTarget {
  branch: string
  isRemote: boolean
}

interface UseWorktreeDialogsOptions {
  activeRepository: string
  worktrees: WorktreeEntry[]
  selectedWorktree: string | null
  openApps?: OpenApp[]
  onSelectWorktree: (path: string) => void
  onSelectBranch: (fullName: string) => void
  onReload: () => void | Promise<void>
  onBranchChanged?: () => void
  onBusyChange?: BusyChangeHandler
}

export function useWorktreeDialogs({
  activeRepository,
  worktrees,
  selectedWorktree,
  openApps = [],
  onSelectWorktree,
  onSelectBranch,
  onReload,
  onBranchChanged,
  onBusyChange,
}: UseWorktreeDialogsOptions) {
  const [removeWorktreeTarget, setRemoveWorktreeTarget] = useState<WorktreeEntry | null>(null)
  const [forceRemoveWorktree, setForceRemoveWorktree] = useState(false)
  const [worktreeMenu, setWorktreeMenu] = useState<{
    x: number
    y: number
    worktree: WorktreeEntry
  } | null>(null)
  const [worktreeTarget, setWorktreeTarget] = useState<WorktreeCheckoutTarget | null>(null)
  const [worktreeDefaultPath, setWorktreeDefaultPath] = useState('')
  const [worktreeHint, setWorktreeHint] = useState<string | undefined>()
  const [worktreeError, setWorktreeError] = useState<string | null>(null)
  const [worktreeBusy, setWorktreeBusy] = useState(false)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const beginBusy = useCallback(
    (message: string) => {
      setWorktreeBusy(true)
      onBusyChange?.(true, message)
    },
    [onBusyChange],
  )

  const endBusy = useCallback(() => {
    setWorktreeBusy(false)
    onBusyChange?.(false)
  }, [onBusyChange])

  const openWorktreeCheckout = useCallback(
    async (branch: string, isRemote: boolean) => {
      if (!activeRepository || worktreeBusy) {
        return
      }
      setWorktreeError(null)
      try {
        const pathBranch = isRemote ? localBranchFromRemote(branch) : branch
        const path = await defaultWorktreePath(activeRepository, pathBranch)
        setWorktreeDefaultPath(path)
        setWorktreeHint(worktreePathHint(path, pathBranch))
        setWorktreeTarget({ branch, isRemote })
      } catch (err) {
        setWorktreeError(errorMessage(err, 'デフォルトパスの取得に失敗しました'))
      }
    },
    [activeRepository, worktreeBusy],
  )

  const handleWorktreeContextMenu = useCallback(
    (worktree: WorktreeEntry, event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setWorktreeMenu({ x: event.clientX, y: event.clientY, worktree })
    },
    [],
  )

  const handleConfirmRemoveWorktree = useCallback(() => {
    if (!removeWorktreeTarget || !activeRepository || worktreeBusy) {
      return
    }
    const target = removeWorktreeTarget
    const force = forceRemoveWorktree
    const wasSelected = selectedWorktree === target.path
    const fallbackPath =
      worktrees.find((entry) => entry.isMain && entry.path !== target.path)?.path ??
      worktrees.find((entry) => entry.path !== target.path)?.path ??
      null
    setRemoveWorktreeTarget(null)
    setForceRemoveWorktree(false)
    // Switch away before delete so this app is less likely to hold the folder open.
    if (wasSelected && fallbackPath) {
      onSelectWorktree(fallbackPath)
    }
    beginBusy('ワークツリーを削除しています…')
    setWorktreeError(null)

    void (async () => {
      try {
        await removeWorktree(activeRepository, target.path, force)
        await onReload()
        onBranchChanged?.()
      } catch (err) {
        setWorktreeError(errorMessage(err, 'ワークツリーの削除に失敗しました'))
      } finally {
        endBusy()
      }
    })()
  }, [
    activeRepository,
    beginBusy,
    endBusy,
    forceRemoveWorktree,
    onBranchChanged,
    onReload,
    onSelectWorktree,
    removeWorktreeTarget,
    selectedWorktree,
    worktreeBusy,
    worktrees,
  ])

  const handleConfirmWorktree = useCallback(
    (path: string) => {
      if (!worktreeTarget || !activeRepository || worktreeBusy) {
        return
      }
      const trimmed = path.trim()
      if (!trimmed) {
        setWorktreeError('パスが空です')
        return
      }

      const { branch, isRemote } = worktreeTarget
      setWorktreeTarget(null)
      beginBusy('ワークツリーを作成しています…')
      setWorktreeError(null)

      void (async () => {
        try {
          const createdPath = await addWorktree(activeRepository, trimmed, branch, isRemote)
          await onReload()
          onSelectWorktree(createdPath)
          const localName = isRemote ? localBranchFromRemote(branch) : branch
          onSelectBranch(localName)
          onBranchChanged?.()
        } catch (err) {
          setWorktreeError(errorMessage(err, 'ワークツリーの作成に失敗しました'))
        } finally {
          endBusy()
        }
      })()
    },
    [
      activeRepository,
      beginBusy,
      endBusy,
      onBranchChanged,
      onReload,
      onSelectBranch,
      onSelectWorktree,
      worktreeBusy,
      worktreeTarget,
    ],
  )

  const openExplorer = useCallback((path: string) => {
    void (async () => {
      try {
        await showInExplorer(path)
      } catch (err) {
        setWorktreeError(errorMessage(err, 'エクスプローラを開けませんでした'))
      }
    })()
  }, [])

  const openWorktreeTerminal = useCallback((path: string) => {
    void (async () => {
      try {
        await openTerminal(path)
      } catch (err) {
        setWorktreeError(errorMessage(err, 'ターミナルを開けませんでした'))
      }
    })()
  }, [])

  const openWorktreeInApp = useCallback((appID: string, path: string) => {
    void (async () => {
      try {
        await openInApp(appID, path)
      } catch (err) {
        setWorktreeError(errorMessage(err, 'アプリを起動できませんでした'))
      }
    })()
  }, [])

  const requestRemoveWorktree = useCallback((worktree: WorktreeEntry) => {
    setRemoveWorktreeTarget(worktree)
    setForceRemoveWorktree(false)
  }, [])

  return {
    worktreeBusy,
    worktreeError,
    setWorktreeError,
    worktreeMenu,
    setWorktreeMenu,
    worktreeTarget,
    worktreeDefaultPath,
    worktreeHint,
    removeWorktreeTarget,
    forceRemoveWorktree,
    setForceRemoveWorktree,
    setRemoveWorktreeTarget,
    setWorktreeTarget,
    openApps,
    openWorktreeCheckout,
    handleWorktreeContextMenu,
    handleConfirmRemoveWorktree,
    handleConfirmWorktree,
    openExplorer,
    openWorktreeTerminal,
    openWorktreeInApp,
    requestRemoveWorktree,
  }
}
