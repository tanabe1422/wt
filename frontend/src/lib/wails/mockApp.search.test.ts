import { describe, expect, it } from 'vitest'

import type { CommitLogEntry } from '../../types'
import { filterMockCommits } from './mockCommits'

const catalog: CommitLogEntry[] = [
  {
    sha: 'c1000005',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T12:00:00+09:00' },
      message: 'merge feature/bar',
    },
    parents: [{ sha: 'c1000004' }, { sha: 'c1000003' }],
  },
  {
    sha: 'c1000004',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T11:00:00+09:00' },
      message: 'main: update docs',
    },
    parents: [{ sha: 'c1000002' }],
  },
  {
    sha: 'c1000003',
    commit: {
      author: { name: 'Bob', email: 'bob@example.com', date: '2026-07-07T10:30:00+09:00' },
      message: 'feature/bar: add panel',
    },
    parents: [{ sha: 'c1000002' }],
  },
  {
    sha: 'c1000002',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T10:00:00+09:00' },
      message: 'feat: scaffold history view',
    },
    parents: [{ sha: 'c1000001' }],
  },
  {
    sha: 'c1000001',
    commit: {
      author: { name: 'Alice', email: 'alice@example.com', date: '2026-07-07T09:00:00+09:00' },
      message: 'chore: initial commit',
    },
    parents: [],
  },
]

describe('filterMockCommits', () => {
  it('returns all commits when query is empty', () => {
    expect(filterMockCommits(catalog, 'message', '  ')).toHaveLength(5)
  })

  it('filters by message (case-insensitive)', () => {
    const result = filterMockCommits(catalog, 'message', 'Scaffold')
    expect(result.map((c) => c.sha)).toEqual(['c1000002'])
  })

  it('filters by author name', () => {
    const result = filterMockCommits(catalog, 'author', 'Bob')
    expect(result.map((c) => c.sha)).toEqual(['c1000003'])
  })

  it('filters by path filename substring', () => {
    const result = filterMockCommits(catalog, 'path', 'panel.tsx')
    expect(result.map((c) => c.sha).sort()).toEqual(['c1000003', 'c1000005'])
  })

  it('filters by root-relative path with ./ prefix', () => {
    const result = filterMockCommits(catalog, 'path', './README.md')
    expect(result.map((c) => c.sha).sort()).toEqual(['c1000001', 'c1000005'])
  })

  it('filters by path prefix', () => {
    const result = filterMockCommits(catalog, 'path', 'docs/')
    expect(result.map((c) => c.sha)).toEqual(['c1000004'])
  })

  it('filters by sha prefix and returns at most one', () => {
    const result = filterMockCommits(catalog, 'sha', 'c1000002')
    expect(result.map((c) => c.sha)).toEqual(['c1000002'])
  })
})
