import { describe, expect, it } from 'vitest'

import {
  applyDiffLineSelection,
  isSelectableDiffKind,
  rangeSelectAddDel,
  toggleLineSelection,
} from './diffLineSelection'

describe('isSelectableDiffKind', () => {
  it('allows add and del only', () => {
    expect(isSelectableDiffKind('add')).toBe(true)
    expect(isSelectableDiffKind('del')).toBe(true)
    expect(isSelectableDiffKind('ctx')).toBe(false)
  })
})

describe('toggleLineSelection', () => {
  it('adds and removes indices', () => {
    const once = toggleLineSelection(new Set(), 2)
    expect([...once]).toEqual([2])
    const twice = toggleLineSelection(once, 2)
    expect([...twice]).toEqual([])
  })
})

describe('rangeSelectAddDel', () => {
  it('selects add/del in range and skips context', () => {
    const kinds = ['ctx', 'del', 'add', 'ctx', 'add']
    const selected = rangeSelectAddDel(kinds, 0, 4)
    expect([...selected].sort((a, b) => a - b)).toEqual([1, 2, 4])
  })

  it('works with reversed from/to', () => {
    const kinds = ['add', 'ctx', 'del']
    const selected = rangeSelectAddDel(kinds, 2, 0)
    expect([...selected].sort((a, b) => a - b)).toEqual([0, 2])
  })
})

describe('applyDiffLineSelection', () => {
  const kinds = ['ctx', 'del', 'add', 'ctx', 'add']

  it('plain click selects a single line', () => {
    const next = applyDiffLineSelection({
      kinds,
      hunkIndex: 0,
      lineIndex: 2,
      current: { hunkIndex: 0, lines: new Set([1, 4]), anchor: 1 },
      shiftKey: false,
      ctrlOrMeta: false,
    })
    expect([...(next?.lines ?? [])]).toEqual([2])
  })

  it('plain click on sole selected line clears selection', () => {
    const next = applyDiffLineSelection({
      kinds,
      hunkIndex: 0,
      lineIndex: 2,
      current: { hunkIndex: 0, lines: new Set([2]), anchor: 2 },
      shiftKey: false,
      ctrlOrMeta: false,
    })
    expect(next).toBeNull()
  })

  it('ctrl toggles for non-contiguous selection', () => {
    const first = applyDiffLineSelection({
      kinds,
      hunkIndex: 0,
      lineIndex: 1,
      current: null,
      shiftKey: false,
      ctrlOrMeta: true,
    })
    const second = applyDiffLineSelection({
      kinds,
      hunkIndex: 0,
      lineIndex: 4,
      current: first,
      shiftKey: false,
      ctrlOrMeta: true,
    })
    expect([...(second?.lines ?? [])].sort((a, b) => a - b)).toEqual([1, 4])
  })

  it('shift selects a contiguous add/del range', () => {
    const next = applyDiffLineSelection({
      kinds,
      hunkIndex: 0,
      lineIndex: 4,
      current: { hunkIndex: 0, lines: new Set([1]), anchor: 1 },
      shiftKey: true,
      ctrlOrMeta: false,
    })
    expect([...(next?.lines ?? [])].sort((a, b) => a - b)).toEqual([1, 2, 4])
  })
})
