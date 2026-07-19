import { describe, expect, it } from 'vitest'

import { joinDir, suggestRepoNameFromUrl } from './clonePath'

describe('suggestRepoNameFromUrl', () => {
  it('parses https URLs', () => {
    expect(suggestRepoNameFromUrl('https://github.com/acme/wt-manager.git')).toBe('wt-manager')
    expect(suggestRepoNameFromUrl('https://github.com/acme/wt-manager/')).toBe('wt-manager')
  })

  it('parses SSH URLs', () => {
    expect(suggestRepoNameFromUrl('git@github.com:acme/wt-manager.git')).toBe('wt-manager')
  })

  it('returns empty for blank input', () => {
    expect(suggestRepoNameFromUrl('  ')).toBe('')
  })
})

describe('joinDir', () => {
  it('joins with Windows separators', () => {
    expect(joinDir('C:\\Users\\dev', 'repo')).toBe('C:\\Users\\dev\\repo')
  })

  it('joins with POSIX separators', () => {
    expect(joinDir('/home/dev', 'repo')).toBe('/home/dev/repo')
  })
})
