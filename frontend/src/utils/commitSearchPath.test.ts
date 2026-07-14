import { describe, expect, it } from 'vitest'

import { commitFileMatchesPathQuery, pathMatchesSearchQuery } from './commitSearchPath'

describe('pathMatchesSearchQuery', () => {
  it('matches filename substring across directories', () => {
    expect(pathMatchesSearchQuery('frontend/src/hoge.tsx', 'hoge.tsx')).toBe(true)
    expect(pathMatchesSearchQuery('src/panel.tsx', 'panel')).toBe(true)
    expect(pathMatchesSearchQuery('src/other.ts', 'hoge.tsx')).toBe(false)
  })

  it('matches root-relative ./ paths exactly', () => {
    expect(pathMatchesSearchQuery('README.md', './README.md')).toBe(true)
    expect(pathMatchesSearchQuery('docs/README.md', './README.md')).toBe(false)
  })

  it('matches path prefixes', () => {
    expect(pathMatchesSearchQuery('docs/guide.md', 'docs/')).toBe(true)
    expect(pathMatchesSearchQuery('docs/guide.md', 'docs')).toBe(true)
    expect(pathMatchesSearchQuery('src/docs.md', 'docs/')).toBe(false)
  })

  it('matches *.tsx style globs on the basename', () => {
    expect(pathMatchesSearchQuery('frontend/src/App.tsx', '*.tsx')).toBe(true)
    expect(pathMatchesSearchQuery('src/panel.tsx', '*.tsx')).toBe(true)
    expect(pathMatchesSearchQuery('src/panel.ts', '*.tsx')).toBe(false)
    expect(pathMatchesSearchQuery('App.tsx', '*.tsx')).toBe(true)
  })

  it('returns false for empty query', () => {
    expect(pathMatchesSearchQuery('README.md', '  ')).toBe(false)
  })
})

describe('commitFileMatchesPathQuery', () => {
  it('matches oldPath for renames', () => {
    expect(
      commitFileMatchesPathQuery(
        { path: 'docs/api.md', oldPath: 'docs/old-api.md' },
        'old-api',
      ),
    ).toBe(true)
  })
})
