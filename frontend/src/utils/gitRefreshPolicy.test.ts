import { describe, expect, it } from 'vitest'

import {
  needsBadge,
  needsBranches,
  needsSidebarFull,
  needsStatus,
  refreshActionsFor,
  refreshActionsForOp,
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
    expect(needsSidebarFull(refreshScopeFor('manualReload'))).toBe(false)
    expect(refreshScopeFor('manualReload')).toBe('statusAndBadge')
    expect(needsSidebarFull(refreshScopeFor('stashApplyOrPop'))).toBe(false)
  })

  it('treats fetch/push as branches-only on the toolbar', () => {
    expect(toolbarUsesBranchesOnly('fetch')).toBe(true)
    expect(toolbarUsesBranchesOnly('push')).toBe(true)
    expect(toolbarUsesBranchesOnly('pull')).toBe(false)
    expect(toolbarUsesBranchesOnly('saveStash')).toBe(false)
  })

  it('expands fetch/push to branches-only actions (former SyncRefreshScope sidebar)', () => {
    expect(refreshActionsForOp('fetch')).toEqual({
      reloadSidebar: false,
      reloadBranches: true,
      reloadWorktreesMeta: false,
      refreshBadge: false,
      bumpWorkspaceContent: false,
    })
    expect(refreshActionsForOp('push')).toEqual(refreshActionsForOp('fetch'))
  })

  it('expands pull/saveStash to former light actions', () => {
    const light = {
      reloadSidebar: false,
      reloadBranches: true,
      reloadWorktreesMeta: true,
      refreshBadge: true,
      bumpWorkspaceContent: true,
    }
    expect(refreshActionsForOp('pull')).toEqual(light)
    expect(refreshActionsForOp('saveStash')).toEqual(light)
    expect(refreshActionsFor('statusBadgeAndBranches')).toEqual(light)
  })

  it('expands createBranch to former workspace actions', () => {
    expect(refreshActionsForOp('createBranch')).toEqual({
      reloadSidebar: true,
      reloadBranches: false,
      reloadWorktreesMeta: false,
      refreshBadge: false,
      bumpWorkspaceContent: true,
    })
    expect(refreshActionsFor('sidebarFull')).toEqual(refreshActionsForOp('createBranch'))
  })

  it('expands statusAndBadge without branches', () => {
    expect(refreshActionsFor('statusAndBadge')).toEqual({
      reloadSidebar: false,
      reloadBranches: false,
      reloadWorktreesMeta: false,
      refreshBadge: true,
      bumpWorkspaceContent: true,
    })
  })
})
