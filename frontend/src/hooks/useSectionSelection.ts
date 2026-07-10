import { useCallback, useState, type MouseEvent } from 'react'

import type { FileStatus } from '../types'

export type SectionMode = 'staged' | 'unstaged'

export interface SectionSelection {
  paths: Set<string>
  anchor: string | null
  focus: string | null
}

const emptySelection = (): SectionSelection => ({
  paths: new Set(),
  anchor: null,
  focus: null,
})

function anchorIndex(files: FileStatus[], anchor: string | null): number {
  if (anchor === null) {
    return -1
  }
  return files.findIndex((entry) => entry.path === anchor)
}

export function useSectionSelection() {
  const [stagedSelection, setStagedSelection] = useState<SectionSelection>(emptySelection)
  const [unstagedSelection, setUnstagedSelection] = useState<SectionSelection>(emptySelection)

  const getSelection = useCallback(
    (mode: SectionMode): SectionSelection =>
      mode === 'staged' ? stagedSelection : unstagedSelection,
    [stagedSelection, unstagedSelection],
  )

  const setSelection = useCallback((mode: SectionMode, selection: SectionSelection) => {
    if (mode === 'staged') {
      setStagedSelection(selection)
    } else {
      setUnstagedSelection(selection)
    }
  }, [])

  const clearSection = useCallback((mode: SectionMode) => {
    setSelection(mode, emptySelection())
  }, [setSelection])

  const clearAll = useCallback(() => {
    setStagedSelection(emptySelection())
    setUnstagedSelection(emptySelection())
  }, [])

  const clearOtherSection = useCallback(
    (mode: SectionMode) => {
      clearSection(mode === 'staged' ? 'unstaged' : 'staged')
    },
    [clearSection],
  )

  const setFocus = useCallback(
    (mode: SectionMode, path: string) => {
      setSelection(mode, {
        paths: new Set([path]),
        anchor: path,
        focus: path,
      })
      clearOtherSection(mode)
    },
    [clearOtherSection, setSelection],
  )

  const handleClick = useCallback(
    (
      path: string,
      index: number,
      mode: SectionMode,
      files: FileStatus[],
      event: MouseEvent,
    ) => {
      const current = getSelection(mode)
      const mod = event.ctrlKey || event.metaKey

      if (event.shiftKey && current.anchor !== null) {
        const anchorIdx = anchorIndex(files, current.anchor)
        if (anchorIdx >= 0) {
          const start = Math.min(anchorIdx, index)
          const end = Math.max(anchorIdx, index)
          const paths = new Set(files.slice(start, end + 1).map((entry) => entry.path))
          setSelection(mode, {
            paths,
            anchor: current.anchor,
            focus: path,
          })
          clearOtherSection(mode)
          return
        }
      }

      if (mod) {
        const paths = new Set(current.paths)
        if (paths.has(path)) {
          paths.delete(path)
        } else {
          paths.add(path)
        }
        setSelection(mode, {
          paths,
          anchor: path,
          focus: path,
        })
        clearOtherSection(mode)
        return
      }

      setSelection(mode, {
        paths: new Set([path]),
        anchor: path,
        focus: path,
      })
      clearOtherSection(mode)
    },
    [clearOtherSection, getSelection, setSelection],
  )

  return {
    stagedSelection,
    unstagedSelection,
    getSelection,
    handleClick,
    clearSection,
    clearAll,
    setFocus,
  }
}
