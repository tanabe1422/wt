import { describe, expect, it } from 'vitest'

import {
  needsBadge,
  needsBranches,
  needsSidebarFull,
  needsStatus,
  refreshScopeFor,
  toolbarUsesBranchesOnly,
} from './gitRefreshPolicy'

describe('gitRefreshPolicy', () => {
  it('maps workspace ops to lightweight scopes (no sidebarFull)', () => {
    expect(refreshScopeFor('stage')).toBe('statusAndBadge')
    expect(refreshScopeFor('discardAll')).toBe('statusAndBadge')
    expect(refreshScopeFor('hunkOrLine')).toBe('statusAndBadge')
    expect(refreshScopeFor('commit')).toBe('statusBadgeAndBranches')
    expect(refreshScopeFor('difftool')).toBe('none')
    expect(needsSidebarFull(refreshScopeFor('stage'))).toBe(false)
  })

  it('maps branch switch to status + badge + branches', () => {
    const scope = refreshScopeFor('switchBranch')
    expect(needsStatus(scope)).toBe(true)
    expect(needsBadge(scope)).toBe(true)
    expect(needsBranches(scope)).toBe(true)
    expect(needsSidebarFull(scope)).toBe(false)
  })

  it('requires full sidebar only for structure-changing ops', () => {
    expect(needsSidebarFull(refreshScopeFor('renameOrDeleteBranch'))).toBe(true)
    expect(needsSidebarFull(refreshScopeFor('worktreeAddOrRemove'))).toBe(true)
    expect(needsSidebarFull(refreshScopeFor('createBranch'))).toBe(true)
    expect(needsSidebarFull(refreshScopeFor('manualReload'))).toBe(true)
    expect(needsSidebarFull(refreshScopeFor('stashApplyOrPop'))).toBe(false)
  })

  it('treats fetch/push as branches-only on the toolbar', () => {
    expect(toolbarUsesBranchesOnly('fetch')).toBe(true)
    expect(toolbarUsesBranchesOnly('push')).toBe(true)
    expect(toolbarUsesBranchesOnly('pull')).toBe(false)
    expect(toolbarUsesBranchesOnly('saveStash')).toBe(false)
  })
})
