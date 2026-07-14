import type { FileDiff } from '../types'
import {
  commitDiffKey,
  getDiffCache,
  rangeDiffKey,
  setDiffCache,
  worktreeDiffKey,
} from './diffCache'
import { getCommitFileDiff, getFileDiff, getRangeFileDiff } from './wails'

/** Lower number = higher priority. */
export const PREFETCH_PRIORITY_HOVER = 0
export const PREFETCH_PRIORITY_NEIGHBOR = 1
export const PREFETCH_PRIORITY_BULK = 2

export const PREFETCH_CONCURRENCY = 2
export const PREFETCH_NEIGHBOR_RADIUS = 2

type PrefetchJob = {
  key: string
  priority: number
  order: number
  session: number
  run: () => Promise<FileDiff>
}

const queue: PrefetchJob[] = []
const inFlight = new Map<string, Promise<FileDiff>>()
let running = 0
let orderCounter = 0
let sessionCounter = 0

function sortQueue(): void {
  queue.sort((a, b) => a.priority - b.priority || a.order - b.order)
}

function pump(): void {
  while (running < PREFETCH_CONCURRENCY && queue.length > 0) {
    const job = queue.shift()
    if (!job) {
      return
    }
    if (getDiffCache(job.key) || inFlight.has(job.key)) {
      continue
    }
    running += 1
    void fetchAndCacheDiff(job.key, job.run).finally(() => {
      running -= 1
      pump()
    })
  }
}

/**
 * Dedupes in-flight fetches for the same key (shared by focus hooks and prefetch).
 * `force` starts a new fetch and ignores cache / existing in-flight work.
 */
export function fetchAndCacheDiff(
  key: string,
  fetch: () => Promise<FileDiff>,
  opts?: { force?: boolean },
): Promise<FileDiff> {
  if (!opts?.force) {
    const cached = getDiffCache(key)
    if (cached) {
      return Promise.resolve(cached)
    }
    const existing = inFlight.get(key)
    if (existing) {
      return existing
    }
  }

  const promise = fetch()
    .then((diff) => {
      if (inFlight.get(key) === promise) {
        setDiffCache(key, diff)
      }
      return diff
    })
    .finally(() => {
      if (inFlight.get(key) === promise) {
        inFlight.delete(key)
      }
    })
  inFlight.set(key, promise)
  return promise
}

function enqueue(key: string, priority: number, session: number, run: () => Promise<FileDiff>): void {
  if (getDiffCache(key) || inFlight.has(key)) {
    return
  }
  const existing = queue.find((job) => job.key === key)
  if (existing) {
    if (priority < existing.priority) {
      existing.priority = priority
      existing.session = session
      sortQueue()
    }
    return
  }
  queue.push({
    key,
    priority,
    order: orderCounter++,
    session,
    run,
  })
  sortQueue()
  pump()
}

function cancelSession(session: number): void {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (queue[i]?.session === session) {
      queue.splice(i, 1)
    }
  }
}

export type WorktreePrefetchTarget = { path: string; staged: boolean }

export function prefetchWorktreeDiffs(
  worktreePath: string,
  targets: WorktreePrefetchTarget[],
): () => void {
  const session = ++sessionCounter
  for (const target of targets) {
    const key = worktreeDiffKey(worktreePath, target.path, target.staged)
    enqueue(key, PREFETCH_PRIORITY_BULK, session, () =>
      getFileDiff(worktreePath, target.path, target.staged),
    )
  }
  return () => cancelSession(session)
}

export function prefetchWorktreeHover(
  worktreePath: string,
  path: string,
  staged: boolean,
): void {
  const key = worktreeDiffKey(worktreePath, path, staged)
  enqueue(key, PREFETCH_PRIORITY_HOVER, sessionCounter, () =>
    getFileDiff(worktreePath, path, staged),
  )
}

export function prefetchWorktreeNeighbors(
  worktreePath: string,
  targets: WorktreePrefetchTarget[],
  focusPath: string | null,
  focusStaged: boolean | null,
  radius = PREFETCH_NEIGHBOR_RADIUS,
): void {
  if (!focusPath || focusStaged === null) {
    return
  }
  const focusIndex = targets.findIndex(
    (target) => target.path === focusPath && target.staged === focusStaged,
  )
  if (focusIndex < 0) {
    return
  }
  for (let offset = -radius; offset <= radius; offset += 1) {
    if (offset === 0) {
      continue
    }
    const target = targets[focusIndex + offset]
    if (!target) {
      continue
    }
    const key = worktreeDiffKey(worktreePath, target.path, target.staged)
    enqueue(key, PREFETCH_PRIORITY_NEIGHBOR, sessionCounter, () =>
      getFileDiff(worktreePath, target.path, target.staged),
    )
  }
}

export function prefetchCommitDiffs(
  worktreePath: string,
  sha: string,
  paths: string[],
): () => void {
  const session = ++sessionCounter
  for (const path of paths) {
    const key = commitDiffKey(worktreePath, sha, path)
    enqueue(key, PREFETCH_PRIORITY_BULK, session, () =>
      getCommitFileDiff(worktreePath, sha, path),
    )
  }
  return () => cancelSession(session)
}

export function prefetchCommitHover(worktreePath: string, sha: string, path: string): void {
  const key = commitDiffKey(worktreePath, sha, path)
  enqueue(key, PREFETCH_PRIORITY_HOVER, sessionCounter, () =>
    getCommitFileDiff(worktreePath, sha, path),
  )
}

export function prefetchCommitNeighbors(
  worktreePath: string,
  sha: string,
  paths: string[],
  selectedPath: string | null,
  radius = PREFETCH_NEIGHBOR_RADIUS,
): void {
  if (!selectedPath) {
    return
  }
  const focusIndex = paths.indexOf(selectedPath)
  if (focusIndex < 0) {
    return
  }
  for (let offset = -radius; offset <= radius; offset += 1) {
    if (offset === 0) {
      continue
    }
    const path = paths[focusIndex + offset]
    if (!path) {
      continue
    }
    const key = commitDiffKey(worktreePath, sha, path)
    enqueue(key, PREFETCH_PRIORITY_NEIGHBOR, sessionCounter, () =>
      getCommitFileDiff(worktreePath, sha, path),
    )
  }
}

export function prefetchRangeDiffs(
  worktreePath: string,
  fromRef: string,
  toRef: string,
  paths: string[],
): () => void {
  const session = ++sessionCounter
  for (const path of paths) {
    const key = rangeDiffKey(worktreePath, fromRef, toRef, path)
    enqueue(key, PREFETCH_PRIORITY_BULK, session, () =>
      getRangeFileDiff(worktreePath, fromRef, toRef, path),
    )
  }
  return () => cancelSession(session)
}

export function prefetchRangeHover(
  worktreePath: string,
  fromRef: string,
  toRef: string,
  path: string,
): void {
  const key = rangeDiffKey(worktreePath, fromRef, toRef, path)
  enqueue(key, PREFETCH_PRIORITY_HOVER, sessionCounter, () =>
    getRangeFileDiff(worktreePath, fromRef, toRef, path),
  )
}

export function prefetchRangeNeighbors(
  worktreePath: string,
  fromRef: string,
  toRef: string,
  paths: string[],
  selectedPath: string | null,
  radius = PREFETCH_NEIGHBOR_RADIUS,
): void {
  if (!selectedPath) {
    return
  }
  const focusIndex = paths.indexOf(selectedPath)
  if (focusIndex < 0) {
    return
  }
  for (let offset = -radius; offset <= radius; offset += 1) {
    if (offset === 0) {
      continue
    }
    const path = paths[focusIndex + offset]
    if (!path) {
      continue
    }
    const key = rangeDiffKey(worktreePath, fromRef, toRef, path)
    enqueue(key, PREFETCH_PRIORITY_NEIGHBOR, sessionCounter, () =>
      getRangeFileDiff(worktreePath, fromRef, toRef, path),
    )
  }
}

/** @internal test helper */
export function _resetDiffPrefetchForTests(): void {
  queue.length = 0
  inFlight.clear()
  running = 0
}

/** @internal test helper */
export function _diffPrefetchQueueSizeForTests(): number {
  return queue.length
}
