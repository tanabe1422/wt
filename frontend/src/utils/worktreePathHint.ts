export function worktreePathHint(defaultPath: string, branch: string): string | undefined {
  const leaf = branch.includes('/') ? branch.slice(branch.lastIndexOf('/') + 1) : branch
  const base = defaultPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? ''
  const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = base.match(new RegExp(`^${escaped}-(\\d+)$`))
  if (match) {
    return `同名のディレクトリがあるため -${match[1]} を付けています`
  }
  return undefined
}
