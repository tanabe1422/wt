import { describe, expect, it } from 'vitest'

import type { FileStatus } from '../types'
import {
  hasStagedChange,
  hasUnstagedChange,
  isConflict,
  isUntracked,
} from './gitStatus'

function entry(index: string, workTree: string, staged = false): FileStatus {
  return {
    path: 'file.txt',
    index,
    workTree,
    staged,
    isDirectory: false,
  }
}

describe('isConflict', () => {
  it('detects unmerged index or workTree', () => {
    expect(isConflict(entry('U', 'U'))).toBe(true)
    expect(isConflict(entry('U', ' '))).toBe(true)
    expect(isConflict(entry(' ', 'U'))).toBe(true)
  })

  it('detects both-added and both-deleted', () => {
    expect(isConflict(entry('A', 'A'))).toBe(true)
    expect(isConflict(entry('D', 'D'))).toBe(true)
  })

  it('returns false for normal changes', () => {
    expect(isConflict(entry('M', ' '))).toBe(false)
    expect(isConflict(entry(' ', 'M'))).toBe(false)
    expect(isConflict(entry('?', '?'))).toBe(false)
  })
})

describe('isUntracked', () => {
  it('is true only for ??', () => {
    expect(isUntracked(entry('?', '?'))).toBe(true)
    expect(isUntracked(entry('A', ' '))).toBe(false)
    expect(isUntracked(entry(' ', 'M'))).toBe(false)
  })
})

describe('hasStagedChange', () => {
  it('is true when index has a non-space non-untracked change', () => {
    expect(hasStagedChange(entry('M', ' ', true))).toBe(true)
    expect(hasStagedChange(entry('A', ' ', true))).toBe(true)
    expect(hasStagedChange(entry('D', ' ', true))).toBe(true)
  })

  it('is false for conflicts, untracked, and clean index', () => {
    expect(hasStagedChange(entry('U', 'U'))).toBe(false)
    expect(hasStagedChange(entry('A', 'A'))).toBe(false)
    expect(hasStagedChange(entry('?', '?'))).toBe(false)
    expect(hasStagedChange(entry(' ', 'M'))).toBe(false)
  })
})

describe('hasUnstagedChange', () => {
  it('is true for workTree changes and untracked', () => {
    expect(hasUnstagedChange(entry(' ', 'M'))).toBe(true)
    expect(hasUnstagedChange(entry('M', 'M'))).toBe(true)
    expect(hasUnstagedChange(entry('?', '?'))).toBe(true)
  })

  it('is true for conflicts even when staged-looking', () => {
    expect(hasUnstagedChange(entry('U', 'U'))).toBe(true)
    expect(hasUnstagedChange(entry('A', 'A'))).toBe(true)
  })

  it('is false when workTree is clean and not conflict/untracked', () => {
    expect(hasUnstagedChange(entry('M', ' '))).toBe(false)
    expect(hasUnstagedChange(entry('A', ' '))).toBe(false)
  })
})
