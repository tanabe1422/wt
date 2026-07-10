import { describe, expect, it } from 'vitest'

import {
  applyPairedColumnResize,
  resizeModeForHandle,
  type CommitHistoryColumnId,
} from './useResizableColumns'

const baseWidths: Record<CommitHistoryColumnId, number> = {
  graph: 80,
  message: 280,
  label: 120,
  date: 88,
  author: 120,
  sha: 72,
}

describe('useResizableColumns', () => {
  it('uses paired resize between fixed columns', () => {
    expect(resizeModeForHandle('label')).toEqual({
      kind: 'pair',
      left: 'label',
      right: 'date',
    })
    expect(resizeModeForHandle('date')).toEqual({
      kind: 'pair',
      left: 'date',
      right: 'author',
    })
    expect(resizeModeForHandle('author')).toEqual({
      kind: 'pair',
      left: 'author',
      right: 'sha',
    })
  })

  it('shifts width between paired columns', () => {
    const next = applyPairedColumnResize(baseWidths, 'date', 'author', 20)
    expect(next).toEqual({
      ...baseWidths,
      date: 108,
      author: 100,
    })
  })

  it('keeps flex boundary behavior for message and label', () => {
    expect(resizeModeForHandle('message')).toEqual({
      kind: 'flex',
      column: 'label',
      deltaSign: -1,
    })
  })
})
