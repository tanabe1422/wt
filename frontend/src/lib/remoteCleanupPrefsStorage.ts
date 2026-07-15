import type { MergeCheckMode } from '../types'

export type RemoteCleanupStatusFilter = 'merged' | 'unmerged' | 'all'

export type RemoteCleanupPrefs = {
  baseRef?: string
  mode?: MergeCheckMode
  statusFilter?: RemoteCleanupStatusFilter
  nameFilter?: string
}

const STORAGE_KEY = 'wt-manager.remoteCleanupPrefsByRepo'

const DEFAULT_MODE: MergeCheckMode = 'ancestry'
const DEFAULT_STATUS_FILTER: RemoteCleanupStatusFilter = 'merged'

function isMergeCheckMode(value: unknown): value is MergeCheckMode {
  return value === 'ancestry' || value === 'content'
}

function isStatusFilter(value: unknown): value is RemoteCleanupStatusFilter {
  return value === 'merged' || value === 'unmerged' || value === 'all'
}

function readMap(): Record<string, RemoteCleanupPrefs> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const result: Record<string, RemoteCleanupPrefs> = {}
    for (const [repoPath, prefs] of Object.entries(parsed)) {
      if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
        continue
      }
      const entry = prefs as Record<string, unknown>
      const normalized: RemoteCleanupPrefs = {}
      if (typeof entry.baseRef === 'string' && entry.baseRef.trim() !== '') {
        normalized.baseRef = entry.baseRef
      }
      if (isMergeCheckMode(entry.mode)) {
        normalized.mode = entry.mode
      }
      if (isStatusFilter(entry.statusFilter)) {
        normalized.statusFilter = entry.statusFilter
      }
      if (typeof entry.nameFilter === 'string') {
        normalized.nameFilter = entry.nameFilter
      }
      result[repoPath] = normalized
    }
    return result
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, RemoteCleanupPrefs>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode failures
  }
}

/** Returns persisted remote-cleanup UI prefs for a repository. */
export function getRemoteCleanupPrefs(repositoryPath: string): RemoteCleanupPrefs {
  if (!repositoryPath) {
    return {}
  }
  return readMap()[repositoryPath] ?? {}
}

/** Merges and persists remote-cleanup UI prefs for a repository. */
export function setRemoteCleanupPrefs(
  repositoryPath: string,
  patch: Partial<RemoteCleanupPrefs>,
): void {
  if (!repositoryPath) {
    return
  }
  const map = readMap()
  map[repositoryPath] = { ...map[repositoryPath], ...patch }
  writeMap(map)
}

export function defaultRemoteCleanupMode(): MergeCheckMode {
  return DEFAULT_MODE
}

export function defaultRemoteCleanupStatusFilter(): RemoteCleanupStatusFilter {
  return DEFAULT_STATUS_FILTER
}
