import { useCallback } from 'react'

import { invalidateWorktreeDiffs } from '../lib/diffCache'
import {
  discardHunk,
  discardLines,
  stageHunk,
  stageLines,
  unstageHunk,
  unstageLines,
} from '../lib/wails'

interface UseHunkLineActionsOptions {
  worktreePath: string
  focusFile: { path: string; staged: boolean } | null
  reload: () => Promise<void>
  reloadDiff: () => Promise<void>
  refreshBadge: () => Promise<void>
  runBusy: (action: () => Promise<void>) => Promise<void>
}

/** Diff の hunk / line 単位 Stage・Unstage・Discard。 */
export function useHunkLineActions({
  worktreePath,
  focusFile,
  reload,
  reloadDiff,
  refreshBadge,
  runBusy,
}: UseHunkLineActionsOptions) {
  /** Git 操作は busy、リフレッシュは busy 解除後（体感ブロック短縮） */
  const afterStatusBadgeDiff = useCallback(async () => {
    await Promise.all([reload(), refreshBadge(), reloadDiff()])
  }, [reload, refreshBadge, reloadDiff])

  const runFocusFileMutation = useCallback(
    async (
      lineIndices: number[] | null,
      mutate: (path: string) => Promise<void>,
    ) => {
      if (!focusFile?.path) {
        return
      }
      if (lineIndices && lineIndices.length === 0) {
        return
      }
      await runBusy(async () => {
        await mutate(focusFile.path)
        invalidateWorktreeDiffs(worktreePath)
      })
      await afterStatusBadgeDiff()
    },
    [afterStatusBadgeDiff, focusFile, runBusy, worktreePath],
  )

  const handleStageHunk = useCallback(
    async (hunkIndex: number) => {
      await runFocusFileMutation(null, (path) => stageHunk(worktreePath, path, hunkIndex))
    },
    [runFocusFileMutation, worktreePath],
  )

  const handleUnstageHunk = useCallback(
    async (hunkIndex: number) => {
      await runFocusFileMutation(null, (path) => unstageHunk(worktreePath, path, hunkIndex))
    },
    [runFocusFileMutation, worktreePath],
  )

  const handleDiscardHunk = useCallback(
    async (hunkIndex: number) => {
      if (!focusFile) {
        return
      }
      const staged = focusFile.staged
      await runFocusFileMutation(null, (path) =>
        discardHunk(worktreePath, path, hunkIndex, staged),
      )
    },
    [focusFile, runFocusFileMutation, worktreePath],
  )

  const handleStageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      await runFocusFileMutation(lineIndices, (path) =>
        stageLines(worktreePath, path, hunkIndex, lineIndices),
      )
    },
    [runFocusFileMutation, worktreePath],
  )

  const handleUnstageLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      await runFocusFileMutation(lineIndices, (path) =>
        unstageLines(worktreePath, path, hunkIndex, lineIndices),
      )
    },
    [runFocusFileMutation, worktreePath],
  )

  const handleDiscardLines = useCallback(
    async (hunkIndex: number, lineIndices: number[]) => {
      if (!focusFile) {
        return
      }
      const staged = focusFile.staged
      await runFocusFileMutation(lineIndices, (path) =>
        discardLines(worktreePath, path, hunkIndex, lineIndices, staged),
      )
    },
    [focusFile, runFocusFileMutation, worktreePath],
  )

  return {
    handleStageHunk,
    handleUnstageHunk,
    handleDiscardHunk,
    handleStageLines,
    handleUnstageLines,
    handleDiscardLines,
  }
}
