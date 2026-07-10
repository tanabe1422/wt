import { describe, expect, it } from 'vitest'

import type { CommitLogEntry } from '../types'
import { commitSubject, formatCommitDateYmd, shortSha, toGraphCommits } from './commitGraph'

const sample: CommitLogEntry[] = [
  {
    sha: 'abc123def456',
    commit: {
      author: { name: 'Alice', date: '2026-07-07T12:00:00+09:00' },
      message: 'fix: bug\n\ndetails',
    },
    parents: [{ sha: 'parent1' }],
  },
]

describe('commitGraph utils', () => {
  it('maps commit log entries for git-graph-svg', () => {
    expect(toGraphCommits(sample)).toEqual([
      {
        id: 'abc123def456',
        message: 'fix: bug\n\ndetails',
        author: 'Alice',
        date: '2026-07-07T12:00:00+09:00',
        parents: ['parent1'],
      },
    ])
  })

  it('formats sha and subject', () => {
    expect(shortSha('abc123def456')).toBe('abc123d')
    expect(commitSubject('feat: add\n\nbody')).toBe('feat: add')
    expect(commitSubject('\n')).toBe('(no message)')
  })

  it('formats date as yyyy/MM/dd', () => {
    expect(formatCommitDateYmd('2026-07-08T12:00:00+09:00')).toBe('2026/07/08')
  })
})
