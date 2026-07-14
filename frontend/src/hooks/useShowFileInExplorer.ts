import { useCallback, useState } from 'react'

import { showInExplorer } from '../lib/wails'
import { worktreeFileDir } from '../utils/worktreePaths'
import { useErrorDialog } from './useErrorDialog'

export function useShowFileInExplorer(worktreePath: string) {
  const [error, setError] = useState<string | null>(null)
  const errorDialog = useErrorDialog(error)

  const showFileDir = useCallback(
    (relativePath: string) => {
      void (async () => {
        try {
          await showInExplorer(worktreeFileDir(worktreePath, relativePath))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'エクスプローラーを開けませんでした')
        }
      })()
    },
    [worktreePath],
  )

  const showWorktree = useCallback(() => {
    if (!worktreePath) {
      return
    }
    void (async () => {
      try {
        await showInExplorer(worktreePath)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エクスプローラーを開けませんでした')
      }
    })()
  }, [worktreePath])

  return {
    showFileDir,
    showWorktree,
    errorDialog: {
      open: errorDialog.open,
      message: errorDialog.message,
      dismiss: () => {
        errorDialog.dismiss()
        setError(null)
      },
    },
  }
}
