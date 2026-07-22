// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'

import {
  getHistoryShowRemoteBranches,
  setHistoryShowRemoteBranches,
} from './historyShowRemoteStorage'

afterEach(() => {
  localStorage.clear()
})

describe('historyShowRemoteStorage', () => {
  it('defaults to false and persists preference', () => {
    expect(getHistoryShowRemoteBranches()).toBe(false)
    setHistoryShowRemoteBranches(true)
    expect(getHistoryShowRemoteBranches()).toBe(true)
    setHistoryShowRemoteBranches(false)
    expect(getHistoryShowRemoteBranches()).toBe(false)
  })
})
