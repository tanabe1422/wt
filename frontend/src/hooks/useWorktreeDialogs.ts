import { useCallback, useState } from 'react'
import type { MouseEvent } from 'react'

import { errorMessage } from '../lib/errorMessage'
import {
  addWorktree,
  defaultWorktreePath,
  openTerminal,
  removeWorktree,
  showInExplorer,
} from '../lib/wails'
import type { WorktreeEntry } from '../types'
import { localBranchFromRemote } from '../utils/branchTree'
import { worktreePathHint } from '../utils/worktreePathHint'

interface WorktreeCheckoutTarget {
  branch: string
  isRemote: boolean
}

interface UseWorktreeDialogsOptions {
  activeRepository: string
  worktrees: WorktreeEntry[]
  selectedWorktree: string | null
  onSelectWorktree: (path: string) => void
  onSelectBranch: (fullName: string) => void
  onReload: () => void | Promise<void>
  onBranchChanged?: () => void
}

export function useWorktreeDialogs({
  activeRepository,
  worktrees,
  selectedWorktree,
  onSelectWorktree,
  onSelectBranch,
  onReload,
  onBranchChanged,
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
      if (worktree.isMain) {
        return
      }
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
    setWorktreeBusy(true)
    setWorktreeError(null)

    void (async () => {
      try {
        await removeWorktree(activeRepository, target.path, force)
        if (wasSelected && fallbackPath) {
          onSelectWorktree(fallbackPath)
        }
        await onReload()
        onBranchChanged?.()
      } catch (err) {
        setWorktreeError(errorMessage(err, 'ワークツリーの削除に失敗しました'))
      } finally {
        setWorktreeBusy(false)
      }
    })()
  }, [
    activeRepository,
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
      setWorktreeBusy(true)
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
          setWorktreeBusy(false)
        }
      })()
    },
    [
      activeRepository,
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
    openWorktreeCheckout,
    handleWorktreeContextMenu,
    handleConfirmRemoveWorktree,
    handleConfirmWorktree,
    openExplorer,
    openWorktreeTerminal,
    requestRemoveWorktree,
  }
}
