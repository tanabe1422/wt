import { describe, expect, it } from 'vitest'

import { hasStagedChange, hasUnstagedChange } from '../lib/wails'
import type { FileStatus } from '../types'

/**
 * Documents the fix for the amend/operation request loop:
 * staged/unstaged must keep referential identity when `entries` is unchanged
 * (useMemo in useGitStatus). Without that, effect deps in useGitWorkspaceActions
 * re-fire every parent re-render.
 */
function memoizedStatusSlices() {
  let prevEntries: FileStatus[] | undefined
  let staged: FileStatus[] = []
  let unstaged: FileStatus[] = []
  return (next: FileStatus[]) => {
    if (next !== prevEntries) {
      prevEntries = next
      staged = next.filter(hasStagedChange)
      unstaged = next.filter(hasUnstagedChange)
    }
    return { staged, unstaged }
  }
}

describe('status slice identity (amend loop guard)', () => {
  const entries: FileStatus[] = [
    { path: 'a.ts', index: 'M', workTree: ' ', staged: true, isDirectory: false },
    { path: 'b.ts', index: ' ', workTree: 'M', staged: false, isDirectory: false },
  ]

  it('reuses staged/unstaged when entries reference is unchanged', () => {
    const project = memoizedStatusSlices()
    const first = project(entries)
    const second = project(entries)
    expect(second.staged).toBe(first.staged)
    expect(second.unstaged).toBe(first.unstaged)
  })

  it('rebuilds when entries reference changes', () => {
    const project = memoizedStatusSlices()
    const first = project(entries)
    const next = [...entries]
    const second = project(next)
    expect(second.staged).not.toBe(first.staged)
    expect(second.unstaged).not.toBe(first.unstaged)
    expect(second.staged).toEqual(first.staged)
  })
})
