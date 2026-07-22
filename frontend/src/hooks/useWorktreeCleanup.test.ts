import { describe, expect, it } from 'vitest'

import type { WorktreeEntry } from '../types'
import { DETACHED_HEAD_SHA } from '../components/sidebar/fixtures/sidebarFixtures'
import { buildWorktreeCleanupRows } from './useWorktreeCleanup'

function worktree(partial: Partial<WorktreeEntry> & Pick<WorktreeEntry, 'path'>): WorktreeEntry {
  return {
    branch: '',
    isMain: false,
    isBare: false,
    isLocked: false,
    isBroken: false,
    changedFileCount: 0,
    ...partial,
  }
}

describe('buildWorktreeCleanupRows', () => {
  it('locks only main worktrees', () => {
    const rows = buildWorktreeCleanupRows([
      worktree({
        path: 'C:/dev/sample-repo',
        branch: 'main',
        isMain: true,
        changedFileCount: 2,
      }),
      worktree({
        path: 'C:/dev/sample-repo-wt-feature',
        branch: 'feature/a',
        changedFileCount: 5,
      }),
    ])

    expect(rows).toEqual([
      {
        path: 'C:/dev/sample-repo',
        name: 'sample-repo',
        branchLabel: 'main',
        changedFileCount: 2,
        locked: true,
        isMain: true,
        isBroken: false,
      },
      {
        path: 'C:/dev/sample-repo-wt-feature',
        name: 'sample-repo-wt-feature',
        branchLabel: 'feature/a',
        changedFileCount: 5,
        locked: false,
        isMain: false,
        isBroken: false,
      },
    ])
  })

  it('marks broken worktrees in cleanup rows', () => {
    const rows = buildWorktreeCleanupRows([
      worktree({
        path: 'C:/dev/sample-repo',
        branch: 'main',
        isMain: true,
      }),
      worktree({
        path: 'C:/dev/sample-repo-wt-broken',
        branch: '',
        isBroken: true,
      }),
    ])

    expect(rows[1]).toMatchObject({
      name: 'sample-repo-wt-broken',
      branchLabel: '破損',
      isBroken: true,
      locked: false,
    })
  })

  it('uses detached label when branch is empty', () => {
    const rows = buildWorktreeCleanupRows([
      worktree({
        path: 'C:/dev/sample-repo-wt-detached',
        branch: '',
        head: DETACHED_HEAD_SHA,
        changedFileCount: 1,
      }),
    ])

    expect(rows[0]?.branchLabel).toBe(`detached · ${DETACHED_HEAD_SHA.slice(0, 7)}`)
    expect(rows[0]?.locked).toBe(false)
  })

  it('exposes basename as display name for both slash styles', () => {
    const rows = buildWorktreeCleanupRows([
      worktree({ path: 'C:\\dev\\sample-repo-wt-win', branch: 'feat' }),
      worktree({ path: '/tmp/linux-wt', branch: 'feat' }),
    ])

    expect(rows.map((row) => row.name)).toEqual(['sample-repo-wt-win', 'linux-wt'])
  })
})
