/** Escape regex metacharacters except those we use for globs. */
function escapeRegexLiteral(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

/** Simple `*` / `?` glob match against a single path string. */
function matchSimpleGlob(text: string, pattern: string): boolean {
  const parts = pattern.split('*').map((part) =>
    part
      .split('?')
      .map((segment) => escapeRegexLiteral(segment))
      .join('.'),
  )
  return new RegExp(`^${parts.join('.*')}$`).test(text)
}

/**
 * Matches a repo-relative file path against a history path search query.
 * Mirrors backend pathspec rules for highlight purposes.
 */
export function pathMatchesSearchQuery(filePath: string, query: string): boolean {
  const q = query.trim()
  if (!q) {
    return false
  }
  const normalized = filePath.replace(/\\/g, '/')
  if (q.startsWith('./')) {
    return normalized === q.slice(2)
  }
  if (q.includes('/')) {
    if (q.includes('*') || q.includes('?')) {
      return matchSimpleGlob(normalized, q) || matchSimpleGlob(normalized, `*/${q}`)
    }
    return (
      normalized === q ||
      normalized.startsWith(q.endsWith('/') ? q : `${q}/`) ||
      normalized.startsWith(q)
    )
  }

  // Backend uses :(glob)**/*<query>* — also honor raw globs like *.tsx on the basename.
  const base = normalized.includes('/')
    ? (normalized.slice(normalized.lastIndexOf('/') + 1) ?? normalized)
    : normalized
  if (q.includes('*') || q.includes('?')) {
    return (
      matchSimpleGlob(base, q) ||
      matchSimpleGlob(base, `*${q}*`) ||
      matchSimpleGlob(normalized, `*${q}*`)
    )
  }
  return normalized.includes(q) || base.includes(q)
}

export function commitFileMatchesPathQuery(
  file: { path: string; oldPath?: string },
  query: string,
): boolean {
  return (
    pathMatchesSearchQuery(file.path, query) ||
    (file.oldPath != null && pathMatchesSearchQuery(file.oldPath, query))
  )
}
