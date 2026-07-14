/** Join a worktree root with a repo-relative path (git-style `/` separators). */
export function joinWorktreePath(worktreePath: string, relativePath: string): string {
  const base = worktreePath.replace(/[/\\]+$/, '')
  const rel = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/')
  if (!rel) {
    return base
  }
  // Keep forward slashes; Go filepath.Abs accepts them on Windows.
  return `${base}/${rel}`
}

/** Directory containing a worktree-relative file (or the worktree root for top-level files). */
export function worktreeFileDir(worktreePath: string, relativePath: string): string {
  const full = joinWorktreePath(worktreePath, relativePath)
  const lastSlash = Math.max(full.lastIndexOf('/'), full.lastIndexOf('\\'))
  if (lastSlash <= 0) {
    return worktreePath.replace(/[/\\]+$/, '') || worktreePath
  }
  return full.slice(0, lastSlash)
}
