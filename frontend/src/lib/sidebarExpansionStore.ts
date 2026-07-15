/** サイドバーの展開状態（リポジトリ横断でリマウントしても維持する） */
const expandedByKey = new Map<string, boolean>()

export function getSidebarExpanded(key: string): boolean | undefined {
  return expandedByKey.get(key)
}

export function setSidebarExpanded(key: string, expanded: boolean): void {
  expandedByKey.set(key, expanded)
}

export function sidebarExpansionKey(repoPath: string, ...parts: string[]): string {
  return [repoPath, ...parts].join('\0')
}

/** @internal test helper */
export function _resetSidebarExpansionStoreForTests(): void {
  expandedByKey.clear()
}
