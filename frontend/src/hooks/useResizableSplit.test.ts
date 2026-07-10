import { describe, expect, it } from 'vitest'

import { clampSplitRatio } from './useResizableSplit'

const MIN_RATIO = 0.25
const MAX_RATIO = 0.75

describe('useResizableSplit', () => {
  it('clamps drag deltas', () => {
    expect(clampSplitRatio(0.1, MIN_RATIO, MAX_RATIO)).toBe(0.25)
    expect(clampSplitRatio(0.9, MIN_RATIO, MAX_RATIO)).toBe(0.75)
    expect(clampSplitRatio(0.5, MIN_RATIO, MAX_RATIO)).toBe(0.5)
  })
})
