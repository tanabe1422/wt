import type { FileDiff } from '../types'

export const MAX_DIFF_CACHE_ENTRIES = 100
/** Diffs larger than this are shown but not retained in the LRU cache. */
export const MAX_CACHEABLE_DIFF_LINES = 5000

const cache = new Map<string, FileDiff>()

export function worktreeDiffKey(
  worktreePath: string,
  file: string,
  staged: boolean,
): string {
  return `wt|${worktreePath}|${file}|${staged ? '1' : '0'}`
}

export function commitDiffKey(worktreePath: string, sha: string, file: string): string {
  return `commit|${worktreePath}|${sha}|${file}`
}

export function rangeDiffKey(
  worktreePath: string,
  fromRef: string,
  toRef: string,
  file: string,
): string {
  return `range|${worktreePath}|${fromRef}|${toRef}|${file}`
}

export function countDiffLines(diff: FileDiff): number {
  let total = 0
  for (const hunk of diff.hunks) {
    total += hunk.lines.length
  }
  return total
}

export function getDiffCache(key: string): FileDiff | undefined {
  const value = cache.get(key)
  if (value === undefined) {
    return undefined
  }
  // Move to end so Map iteration order acts as LRU.
  cache.delete(key)
  cache.set(key, value)
  return value
}

/** Returns false when the diff is too large to cache. */
export function setDiffCache(key: string, diff: FileDiff): boolean {
  if (countDiffLines(diff) > MAX_CACHEABLE_DIFF_LINES) {
    cache.delete(key)
    return false
  }
  if (cache.has(key)) {
    cache.delete(key)
  }
  cache.set(key, diff)
  while (cache.size > MAX_DIFF_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) {
      break
    }
    cache.delete(oldest)
  }
  return true
}

export function invalidateDiffCache(key: string): void {
  cache.delete(key)
}

export function invalidateWorktreeDiffs(worktreePath: string): void {
  const prefix = `wt|${worktreePath}|`
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

export function invalidateAllDiffCache(): void {
  cache.clear()
}

/** @internal test helper */
export function _resetDiffCacheForTests(): void {
  cache.clear()
}

/** @internal test helper */
export function _diffCacheSizeForTests(): number {
  return cache.size
}

/** @internal test helper */
export function _diffCacheKeysForTests(): string[] {
  return [...cache.keys()]
}
