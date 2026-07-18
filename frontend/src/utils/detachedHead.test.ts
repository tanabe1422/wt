import { describe, expect, it } from 'vitest'

import {
  formatDetachedBannerText,
  formatDetachedHeadRowLabel,
  formatDetachedLabel,
  formatShortSha,
  isDetachedWorktree,
  resolveCurrentBranch,
} from './detachedHead'

describe('detachedHead', () => {
  it('detects detached when branch is empty', () => {
    expect(isDetachedWorktree({ branch: '' })).toBe(true)
    expect(isDetachedWorktree({ branch: 'main' })).toBe(false)
  })

  it('resolves current branch without selectedBranch fallback when detached', () => {
    expect(resolveCurrentBranch({ branch: '' }, 'feature/hoge')).toBe('HEAD')
    expect(resolveCurrentBranch({ branch: 'main' }, 'feature/hoge')).toBe('main')
    expect(resolveCurrentBranch(undefined, 'feature/hoge')).toBe('feature/hoge')
    expect(resolveCurrentBranch(null, null)).toBe('')
  })

  it('formats short SHA as first 7 chars', () => {
    expect(formatShortSha('a1b2c3d4e5f67890')).toBe('a1b2c3d')
    expect(formatShortSha('abc')).toBeNull()
    expect(formatShortSha('')).toBeNull()
    expect(formatShortSha(null)).toBeNull()
  })

  it('formats worktree / row / banner labels', () => {
    const head = 'a1b2c3d4e5f67890'
    expect(formatDetachedLabel(head)).toBe('detached · a1b2c3d')
    expect(formatDetachedLabel(undefined)).toBe('detached')
    expect(formatDetachedHeadRowLabel(head)).toBe('detached HEAD · a1b2c3d')
    expect(formatDetachedHeadRowLabel(null)).toBe('detached HEAD')
    expect(formatDetachedBannerText(head)).toBe('detached HEAD（a1b2c3d）')
    expect(formatDetachedBannerText(null)).toBe('detached HEAD')
  })
})
