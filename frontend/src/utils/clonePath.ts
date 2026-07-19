/** Suggest a folder name from a git clone URL. */
export function suggestRepoNameFromUrl(url: string): string {
  let trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  trimmed = trimmed.replace(/[\\/]+$/, '')
  trimmed = trimmed.replace(/\.git$/i, '')

  // SSH: git@host:owner/repo
  const sshMatch = trimmed.match(/^[^@]+@[^:]+:(.+)$/)
  if (sshMatch) {
    trimmed = sshMatch[1]
  }

  const parts = trimmed.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/** Join parent directory and child name using the parent's path separator. */
export function joinDir(parent: string, name: string): string {
  const cleanParent = parent.replace(/[\\/]+$/, '')
  const cleanName = name.replace(/^[\\/]+/, '')
  if (!cleanParent) {
    return cleanName
  }
  if (!cleanName) {
    return cleanParent
  }
  const sep = cleanParent.includes('\\') ? '\\' : '/'
  return `${cleanParent}${sep}${cleanName}`
}
