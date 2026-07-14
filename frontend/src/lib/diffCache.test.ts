import { afterEach, describe, expect, it } from 'vitest'

import type { DiffLine, FileDiff } from '../types'
import {
  MAX_CACHEABLE_DIFF_LINES,
  MAX_DIFF_CACHE_ENTRIES,
  _diffCacheKeysForTests,
  _diffCacheSizeForTests,
  _resetDiffCacheForTests,
  commitDiffKey,
  countDiffLines,
  getDiffCache,
  invalidateAllDiffCache,
  invalidateDiffCache,
  invalidateWorktreeDiffs,
  rangeDiffKey,
  setDiffCache,
  worktreeDiffKey,
} from './diffCache'

function sampleDiff(path: string, lineCount = 1): FileDiff {
  const lines: DiffLine[] = Array.from({ length: lineCount }, (_, index) => ({
    kind: 'ctx' as const,
    content: `line-${index}`,
  }))
  return {
    path,
    hunks: [{ header: '@@ -1,1 +1,1 @@', lines }],
  }
}

describe('diffCache', () => {
  afterEach(() => {
    _resetDiffCacheForTests()
  })

  it('builds stable keys', () => {
    expect(worktreeDiffKey('/repo', 'a.ts', true)).toBe('wt|/repo|a.ts|1')
    expect(worktreeDiffKey('/repo', 'a.ts', false)).toBe('wt|/repo|a.ts|0')
    expect(commitDiffKey('/repo', 'abc', 'a.ts')).toBe('commit|/repo|abc|a.ts')
    expect(rangeDiffKey('/repo', 'main', 'feature', 'a.ts')).toBe(
      'range|/repo|main|feature|a.ts',
    )
  })

  it('stores and retrieves entries', () => {
    const key = worktreeDiffKey('/repo', 'a.ts', false)
    expect(setDiffCache(key, sampleDiff('a.ts'))).toBe(true)
    expect(getDiffCache(key)?.path).toBe('a.ts')
    expect(_diffCacheSizeForTests()).toBe(1)
  })

  it('evicts least recently used entries over the limit', () => {
    for (let i = 0; i < MAX_DIFF_CACHE_ENTRIES + 5; i += 1) {
      setDiffCache(worktreeDiffKey('/repo', `f${i}.ts`, false), sampleDiff(`f${i}.ts`))
    }
    expect(_diffCacheSizeForTests()).toBe(MAX_DIFF_CACHE_ENTRIES)
    expect(getDiffCache(worktreeDiffKey('/repo', 'f0.ts', false))).toBeUndefined()
    expect(
      getDiffCache(
        worktreeDiffKey('/repo', `f${MAX_DIFF_CACHE_ENTRIES + 4}.ts`, false),
      )?.path,
    ).toBe(`f${MAX_DIFF_CACHE_ENTRIES + 4}.ts`)
  })

  it('treats get as a recency touch for LRU', () => {
    setDiffCache(worktreeDiffKey('/repo', 'old.ts', false), sampleDiff('old.ts'))
    setDiffCache(worktreeDiffKey('/repo', 'mid.ts', false), sampleDiff('mid.ts'))
    expect(getDiffCache(worktreeDiffKey('/repo', 'old.ts', false))?.path).toBe('old.ts')

    for (let i = 0; i < MAX_DIFF_CACHE_ENTRIES - 1; i += 1) {
      setDiffCache(worktreeDiffKey('/repo', `n${i}.ts`, false), sampleDiff(`n${i}.ts`))
    }

    expect(getDiffCache(worktreeDiffKey('/repo', 'old.ts', false))?.path).toBe('old.ts')
    expect(getDiffCache(worktreeDiffKey('/repo', 'mid.ts', false))).toBeUndefined()
  })

  it('skips caching diffs over the line limit', () => {
    const key = worktreeDiffKey('/repo', 'huge.ts', false)
    const huge = sampleDiff('huge.ts', MAX_CACHEABLE_DIFF_LINES + 1)
    expect(countDiffLines(huge)).toBe(MAX_CACHEABLE_DIFF_LINES + 1)
    expect(setDiffCache(key, huge)).toBe(false)
    expect(getDiffCache(key)).toBeUndefined()
    expect(_diffCacheSizeForTests()).toBe(0)
  })

  it('invalidates a single key', () => {
    const key = worktreeDiffKey('/repo', 'a.ts', true)
    setDiffCache(key, sampleDiff('a.ts'))
    invalidateDiffCache(key)
    expect(getDiffCache(key)).toBeUndefined()
  })

  it('invalidates all worktree keys for a path', () => {
    setDiffCache(worktreeDiffKey('/repo-a', 'a.ts', false), sampleDiff('a.ts'))
    setDiffCache(worktreeDiffKey('/repo-a', 'b.ts', true), sampleDiff('b.ts'))
    setDiffCache(worktreeDiffKey('/repo-b', 'a.ts', false), sampleDiff('a.ts'))
    setDiffCache(commitDiffKey('/repo-a', 'sha', 'a.ts'), sampleDiff('a.ts'))

    invalidateWorktreeDiffs('/repo-a')

    expect(_diffCacheKeysForTests()).toEqual([
      worktreeDiffKey('/repo-b', 'a.ts', false),
      commitDiffKey('/repo-a', 'sha', 'a.ts'),
    ])
  })

  it('clears the entire cache', () => {
    setDiffCache(worktreeDiffKey('/repo', 'a.ts', false), sampleDiff('a.ts'))
    invalidateAllDiffCache()
    expect(_diffCacheSizeForTests()).toBe(0)
  })
})
