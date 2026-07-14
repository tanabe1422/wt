import { describe, expect, it } from 'vitest'

import { joinWorktreePath, worktreeFileDir } from './worktreePaths'

describe('joinWorktreePath', () => {
  it('joins worktree root and relative path', () => {
    expect(joinWorktreePath('C:/dev/repo', 'src/app.ts')).toBe('C:/dev/repo/src/app.ts')
  })

  it('strips trailing separators on the root', () => {
    expect(joinWorktreePath('C:/dev/repo/', 'README.md')).toBe('C:/dev/repo/README.md')
  })

  it('normalizes backslashes in the relative path', () => {
    expect(joinWorktreePath('C:/dev/repo', 'src\\app.ts')).toBe('C:/dev/repo/src/app.ts')
  })
})

describe('worktreeFileDir', () => {
  it('returns the parent directory of a nested file', () => {
    expect(worktreeFileDir('C:/dev/repo', 'src/hooks/useFoo.ts')).toBe('C:/dev/repo/src/hooks')
  })

  it('returns the worktree root for a top-level file', () => {
    expect(worktreeFileDir('C:/dev/repo', 'README.md')).toBe('C:/dev/repo')
  })
})
