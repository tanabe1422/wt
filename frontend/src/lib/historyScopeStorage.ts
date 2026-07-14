import type { HistoryScope } from '../types'

const STORAGE_KEY = 'wt-manager.historyScopeByWorktree'

function isHistoryScope(value: unknown): value is HistoryScope {
  return value === 'all' || value === 'branch'
}

function readMap(): Record<string, HistoryScope> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const result: Record<string, HistoryScope> = {}
    for (const [path, scope] of Object.entries(parsed)) {
      if (isHistoryScope(scope)) {
        result[path] = scope
      }
    }
    return result
  } catch {
    return {}
  }
}

/** Returns the persisted history scope for a worktree, defaulting to `'all'`. */
export function getHistoryScope(worktreePath: string): HistoryScope {
  if (!worktreePath) {
    return 'all'
  }
  return readMap()[worktreePath] ?? 'all'
}

/** Persists the history scope for a worktree. */
export function setHistoryScope(worktreePath: string, scope: HistoryScope): void {
  if (!worktreePath) {
    return
  }
  try {
    const map = readMap()
    map[worktreePath] = scope
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode failures
  }
}
