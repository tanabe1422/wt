// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileStatus } from '../types'

vi.mock('../lib/wails', () => ({
  abortCherryPick: vi.fn(),
  abortMerge: vi.fn(),
  abortRebase: vi.fn(),
  deleteUntracked: vi.fn(),
  discardFiles: vi.fn(),
}))

import {
  abortMerge,
  deleteUntracked,
  discardFiles,
} from '../lib/wails'
import { useGitDestructiveConfirm } from './useGitDestructiveConfirm'

afterEach(() => {
  cleanup()
})

function entry(path: string, index: string, workTree: string): FileStatus {
  return { path, index, workTree, staged: false, isDirectory: false }
}

describe('useGitDestructiveConfirm discardAll', () => {
  const worktreePath = 'C:/dev/sample-repo'
  const unstaged: FileStatus[] = [
    entry('dirty.ts', ' ', 'M'),
    entry('deleted.ts', ' ', 'D'),
    entry('new.ts', '?', '?'),
    entry('conflict.ts', 'U', 'U'),
  ]

  beforeEach(() => {
    vi.mocked(discardFiles).mockReset().mockResolvedValue(undefined)
    vi.mocked(deleteUntracked).mockReset().mockResolvedValue(undefined)
    vi.mocked(abortMerge).mockReset().mockResolvedValue(undefined)
  })

  it('confirms then discards only tracked unstaged paths (keeps untracked)', async () => {
    const clearUnstaged = vi.fn()
    const order: string[] = []
    const afterDestructive = vi.fn(async () => {
      order.push('afterDestructive')
    })
    const runBusy = vi.fn(async (action: () => Promise<void>) => {
      order.push('busy-start')
      await action()
      order.push('busy-end')
    })

    const { result } = renderHook(() =>
      useGitDestructiveConfirm({
        worktreePath,
        unstaged,
        runBusy,
        clearUnstaged,
        afterDestructive,
      }),
    )

    act(() => {
      result.current.requestDiscardAll()
    })

    expect(result.current.confirmAction).toEqual({
      kind: 'discardAll',
      paths: ['dirty.ts', 'deleted.ts'],
    })
    expect(result.current.confirmTitle).toBe('すべて破棄')
    expect(result.current.confirmMessage).toContain('未追跡ファイルは残ります')

    await act(async () => {
      await result.current.handleConfirmDestructive()
    })

    await waitFor(() => {
      expect(discardFiles).toHaveBeenCalledWith(worktreePath, ['dirty.ts', 'deleted.ts'])
    })
    expect(deleteUntracked).not.toHaveBeenCalled()
    expect(clearUnstaged).toHaveBeenCalledTimes(1)
    expect(afterDestructive).toHaveBeenCalledTimes(1)
    // ファイル欄再取得を含む afterDestructive は busy 解除前に完了する
    expect(order).toEqual(['busy-start', 'afterDestructive', 'busy-end'])
    expect(result.current.confirmAction).toBeNull()
  })

  it('does nothing when unstaged has only untracked / conflict entries', () => {
    const { result } = renderHook(() =>
      useGitDestructiveConfirm({
        worktreePath,
        unstaged: [entry('new.ts', '?', '?'), entry('conflict.ts', 'U', 'U')],
        runBusy: vi.fn(),
        clearUnstaged: vi.fn(),
        afterDestructive: vi.fn(),
      }),
    )

    act(() => {
      result.current.requestDiscardAll()
    })

    expect(result.current.confirmAction).toBeNull()
    expect(discardFiles).not.toHaveBeenCalled()
  })
})
