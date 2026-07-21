import { describe, expect, it } from 'vitest'

import type { FileStatus } from '../types'
import {
  confirmActionFromPartition,
  confirmDialogLabel,
  confirmDialogMessage,
  confirmDialogTitle,
  partitionDiscardPaths,
} from './gitDestructiveConfirm'

function entry(
  path: string,
  index: string,
  workTree: string,
): FileStatus {
  return { path, index, workTree, staged: false, isDirectory: false }
}

describe('partitionDiscardPaths', () => {
  const unstaged = [
    entry('tracked.ts', ' ', 'M'),
    entry('new.ts', '?', '?'),
    entry('conflict.ts', 'U', 'U'),
  ]

  it('splits tracked discard and untracked delete', () => {
    expect(
      partitionDiscardPaths(['tracked.ts', 'new.ts', 'missing.ts'], unstaged),
    ).toEqual({
      discardPaths: ['tracked.ts'],
      deletePaths: ['new.ts'],
    })
  })

  it('skips conflict paths', () => {
    expect(partitionDiscardPaths(['conflict.ts', 'tracked.ts'], unstaged)).toEqual({
      discardPaths: ['tracked.ts'],
      deletePaths: [],
    })
  })
})

describe('confirmActionFromPartition', () => {
  it('returns null when empty', () => {
    expect(confirmActionFromPartition([], [])).toBeNull()
  })

  it('returns discard, delete, or mixed', () => {
    expect(confirmActionFromPartition(['a'], [])).toEqual({
      kind: 'discard',
      paths: ['a'],
    })
    expect(confirmActionFromPartition([], ['b'])).toEqual({
      kind: 'delete',
      paths: ['b'],
    })
    expect(confirmActionFromPartition(['a'], ['b'])).toEqual({
      kind: 'mixed',
      discardPaths: ['a'],
      deletePaths: ['b'],
    })
  })
})

describe('confirm dialog copy', () => {
  it('covers abort / discardAll / delete / mixed / discard', () => {
    expect(confirmDialogTitle({ kind: 'abort', operation: 'merge' })).toBe('マージを中止')
    expect(confirmDialogLabel({ kind: 'abort', operation: 'merge' })).toBe('中止')
    expect(confirmDialogMessage({ kind: 'abort', operation: 'merge' })).toContain('マージを中止')

    expect(confirmDialogTitle({ kind: 'abort', operation: 'rebase' })).toBe('リベースを中止')
    expect(confirmDialogMessage({ kind: 'abort', operation: 'rebase' })).toContain(
      'リベース開始前',
    )

    expect(confirmDialogTitle({ kind: 'abort', operation: 'cherry-pick' })).toBe(
      'cherry-pick を中止',
    )
    expect(confirmDialogMessage({ kind: 'abort', operation: 'cherry-pick' })).toContain(
      'cherry-pick を中止',
    )

    expect(confirmDialogTitle({ kind: 'discardAll', paths: ['a', 'b'] })).toBe('すべて破棄')
    expect(confirmDialogLabel({ kind: 'discardAll', paths: ['a', 'b'] })).toBe('すべて破棄')
    expect(confirmDialogMessage({ kind: 'discardAll', paths: ['a', 'b'] })).toContain(
      '未ステージの変更・削除',
    )
    expect(confirmDialogMessage({ kind: 'discardAll', paths: ['a', 'b'] })).toContain(
      '未追跡ファイルは残ります',
    )

    expect(confirmDialogTitle({ kind: 'delete', paths: ['a'] })).toBe(
      '未追跡ファイルを削除',
    )
    expect(confirmDialogLabel({ kind: 'delete', paths: ['a'] })).toBe('削除')
    expect(confirmDialogMessage({ kind: 'delete', paths: ['a'] })).toContain('a')
    expect(confirmDialogMessage({ kind: 'delete', paths: ['a', 'b'] })).toContain('2 件')

    expect(
      confirmDialogTitle({ kind: 'mixed', discardPaths: ['a'], deletePaths: ['b'] }),
    ).toBe('変更を破棄 / 削除')
    expect(
      confirmDialogMessage({ kind: 'mixed', discardPaths: ['a'], deletePaths: ['b'] }),
    ).toContain('1 件')

    expect(confirmDialogTitle({ kind: 'discard', paths: ['x'] })).toBe('変更を破棄')
    expect(confirmDialogLabel({ kind: 'discard', paths: ['x'] })).toBe('破棄')
    expect(confirmDialogMessage({ kind: 'discard', paths: ['x'] })).toContain('x')
    expect(confirmDialogMessage({ kind: 'discard', paths: ['x', 'y'] })).toContain('2 件')
  })

  it('handles null action', () => {
    expect(confirmDialogTitle(null)).toBe('変更を破棄')
    expect(confirmDialogMessage(null)).toBe('')
    expect(confirmDialogLabel(null)).toBe('破棄')
  })
})
