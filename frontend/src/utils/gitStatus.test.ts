import { describe, expect, it } from 'vitest'

import type { CommitFileChange, FileStatus } from '../types'
import {
  changeStatusSortRank,
  hasStagedChange,
  hasUnstagedChange,
  isConflict,
  isUntracked,
  sortCommitFileChanges,
  sortFileStatuses,
} from './gitStatus'

function entry(
  path: string,
  index: string,
  workTree: string,
  staged = false,
): FileStatus {
  return {
    path,
    index,
    workTree,
    staged,
    isDirectory: false,
  }
}

function statusEntry(index: string, workTree: string, staged = false): FileStatus {
  return entry('file.txt', index, workTree, staged)
}

describe('isConflict', () => {
  it('detects unmerged index or workTree', () => {
    expect(isConflict(statusEntry('U', 'U'))).toBe(true)
    expect(isConflict(statusEntry('U', ' '))).toBe(true)
    expect(isConflict(statusEntry(' ', 'U'))).toBe(true)
  })

  it('detects both-added and both-deleted', () => {
    expect(isConflict(statusEntry('A', 'A'))).toBe(true)
    expect(isConflict(statusEntry('D', 'D'))).toBe(true)
  })

  it('returns false for normal changes', () => {
    expect(isConflict(statusEntry('M', ' '))).toBe(false)
    expect(isConflict(statusEntry(' ', 'M'))).toBe(false)
    expect(isConflict(statusEntry('?', '?'))).toBe(false)
  })
})

describe('isUntracked', () => {
  it('is true only for ??', () => {
    expect(isUntracked(statusEntry('?', '?'))).toBe(true)
    expect(isUntracked(statusEntry('A', ' '))).toBe(false)
    expect(isUntracked(statusEntry(' ', 'M'))).toBe(false)
  })
})

describe('hasStagedChange', () => {
  it('is true when index has a non-space non-untracked change', () => {
    expect(hasStagedChange(statusEntry('M', ' ', true))).toBe(true)
    expect(hasStagedChange(statusEntry('A', ' ', true))).toBe(true)
    expect(hasStagedChange(statusEntry('D', ' ', true))).toBe(true)
  })

  it('is false for conflicts, untracked, and clean index', () => {
    expect(hasStagedChange(statusEntry('U', 'U'))).toBe(false)
    expect(hasStagedChange(statusEntry('A', 'A'))).toBe(false)
    expect(hasStagedChange(statusEntry('?', '?'))).toBe(false)
    expect(hasStagedChange(statusEntry(' ', 'M'))).toBe(false)
  })
})

describe('hasUnstagedChange', () => {
  it('is true for workTree changes and untracked', () => {
    expect(hasUnstagedChange(statusEntry(' ', 'M'))).toBe(true)
    expect(hasUnstagedChange(statusEntry('M', 'M'))).toBe(true)
    expect(hasUnstagedChange(statusEntry('?', '?'))).toBe(true)
  })

  it('is true for conflicts even when staged-looking', () => {
    expect(hasUnstagedChange(statusEntry('U', 'U'))).toBe(true)
    expect(hasUnstagedChange(statusEntry('A', 'A'))).toBe(true)
  })

  it('is false when workTree is clean and not conflict/untracked', () => {
    expect(hasUnstagedChange(statusEntry('M', ' '))).toBe(false)
    expect(hasUnstagedChange(statusEntry('A', ' '))).toBe(false)
  })
})

describe('changeStatusSortRank', () => {
  it('orders conflict before modified before added before renamed before deleted', () => {
    expect(changeStatusSortRank('U')).toBeLessThan(changeStatusSortRank('M'))
    expect(changeStatusSortRank('M')).toBeLessThan(changeStatusSortRank('A'))
    expect(changeStatusSortRank('A')).toBe(changeStatusSortRank('?'))
    expect(changeStatusSortRank('A')).toBeLessThan(changeStatusSortRank('R'))
    expect(changeStatusSortRank('R')).toBeLessThan(changeStatusSortRank('D'))
  })
})

describe('sortFileStatuses', () => {
  it('groups by status then path for unstaged', () => {
    const files = [
      entry('z.txt', ' ', 'D'),
      entry('b.txt', '?', '?'),
      entry('a.txt', ' ', 'M'),
      entry('conflict.ts', 'U', 'U'),
      entry('c.txt', ' ', 'A'),
    ]
    expect(sortFileStatuses(files, 'unstaged').map((f) => f.path)).toEqual([
      'conflict.ts',
      'a.txt',
      'b.txt',
      'c.txt',
      'z.txt',
    ])
  })

  it('uses index status for staged mode', () => {
    const files = [
      entry('del.ts', 'D', ' ', true),
      entry('add.ts', 'A', ' ', true),
      entry('mod.ts', 'M', ' ', true),
    ]
    expect(sortFileStatuses(files, 'staged').map((f) => f.path)).toEqual([
      'mod.ts',
      'add.ts',
      'del.ts',
    ])
  })
})

describe('sortCommitFileChanges', () => {
  it('groups by status then path', () => {
    const files: CommitFileChange[] = [
      { path: 'z.ts', status: 'D' },
      { path: 'b.ts', status: 'A' },
      { path: 'a.ts', status: 'M' },
      { path: 'c.ts', status: 'A' },
      { path: 'r.ts', status: 'R', oldPath: 'old.ts' },
    ]
    expect(sortCommitFileChanges(files).map((f) => f.path)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
      'r.ts',
      'z.ts',
    ])
  })
})
