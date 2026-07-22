const STORAGE_KEY = 'wt-manager.historyShowRemoteBranches'

/** Returns whether remote branch labels are shown in history. Defaults to false. */
export function getHistoryShowRemoteBranches(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return false
    }
    return raw === 'true'
  } catch {
    return false
  }
}

/** Persists whether remote branch labels are shown in history. */
export function setHistoryShowRemoteBranches(show: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, show ? 'true' : 'false')
  } catch {
    // ignore quota / private mode failures
  }
}
