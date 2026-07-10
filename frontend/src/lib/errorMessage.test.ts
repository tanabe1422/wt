import { describe, expect, it } from 'vitest'

import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it('extracts message from Error', () => {
    expect(errorMessage(new Error('git switch: already checked out'), 'fallback')).toBe(
      'git switch: already checked out',
    )
  })

  it('extracts message from Wails string rejection', () => {
    expect(
      errorMessage(
        'error: Your local changes to the following files would be overwritten by checkout',
        'fallback',
      ),
    ).toBe('error: Your local changes to the following files would be overwritten by checkout')
  })

  it('falls back for unknown values', () => {
    expect(errorMessage(null, 'fallback')).toBe('fallback')
  })
})
