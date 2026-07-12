import { describe, expect, it } from 'vitest'

import { worktreePathHint } from './worktreePathHint'

describe('worktreePathHint', () => {
  it('returns undefined when path leaf matches branch leaf', () => {
    expect(worktreePathHint('C:/dev/feature-foo', 'feature/foo')).toBeUndefined()
    expect(worktreePathHint('C:/dev/foo', 'foo')).toBeUndefined()
  })

  it('returns hint when a numeric suffix was added', () => {
    expect(worktreePathHint('C:/dev/foo-2', 'feature/foo')).toBe(
      '同名のディレクトリがあるため -2 を付けています',
    )
    expect(worktreePathHint('C:/dev/bar-3', 'bar')).toBe(
      '同名のディレクトリがあるため -3 を付けています',
    )
  })

  it('ignores non-numeric suffixes', () => {
    expect(worktreePathHint('C:/dev/foo-extra', 'feature/foo')).toBeUndefined()
  })
})
