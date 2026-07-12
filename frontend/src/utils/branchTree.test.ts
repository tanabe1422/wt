import { describe, expect, it } from 'vitest'

import { buildBranchTree, filterBranchTree } from './branchTree'
import type { BranchEntry } from '../types'

function entry(name: string, isRemote = false): BranchEntry {
  return {
    name,
    isCurrent: false,
    isRemote,
    aheadCount: 0,
    behindCount: 0,
    hasUpstream: false,
  }
}

describe('filterBranchTree', () => {
  it('returns all nodes when query is empty', () => {
    const tree = buildBranchTree([entry('feature/foo'), entry('main')])
    expect(filterBranchTree(tree, '')).toEqual(tree)
    expect(filterBranchTree(tree, '   ')).toEqual(tree)
  })

  it('keeps matching leaves and ancestor folders', () => {
    const tree = buildBranchTree([
      entry('feature/foo'),
      entry('feature/bar'),
      entry('main'),
    ])
    const filtered = filterBranchTree(tree, 'foo')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe('feature')
    expect(filtered[0]?.children).toHaveLength(1)
    expect(filtered[0]?.children[0]?.fullName).toBe('feature/foo')
  })

  it('matches folder segment names', () => {
    const tree = buildBranchTree([entry('feature/foo'), entry('main')])
    const filtered = filterBranchTree(tree, 'feature')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe('feature')
    expect(filtered[0]?.children).toHaveLength(1)
  })
})
