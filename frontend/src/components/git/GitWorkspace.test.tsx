// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileDiff, FileStatus } from '../../types'

vi.mock('../../hooks/useGitStatus', () => ({
  useGitStatus: vi.fn(),
}))

vi.mock('../../hooks/useGitDiff', () => ({
  useGitDiff: vi.fn(),
}))

vi.mock('../../hooks/useGitWorkspaceActions', () => ({
  useGitWorkspaceActions: vi.fn(),
}))

vi.mock('../../hooks/useGitDestructiveConfirm', () => ({
  useGitDestructiveConfirm: vi.fn(),
}))

vi.mock('../../lib/diffPrefetch', () => ({
  prefetchWorktreeDiffs: vi.fn(() => () => {}),
  prefetchWorktreeHover: vi.fn(),
  prefetchWorktreeNeighbors: vi.fn(),
}))

vi.mock('../../lib/diffCache', () => ({
  invalidateWorktreeDiffs: vi.fn(),
}))

import { useGitDestructiveConfirm } from '../../hooks/useGitDestructiveConfirm'
import { useGitDiff } from '../../hooks/useGitDiff'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useGitWorkspaceActions } from '../../hooks/useGitWorkspaceActions'
import { GitWorkspace } from './GitWorkspace'

afterEach(() => {
  cleanup()
})

const staged: FileStatus[] = [
  {
    path: 'staged.ts',
    index: 'M',
    workTree: ' ',
    staged: true,
    isDirectory: false,
  },
]

const unstaged: FileStatus[] = [
  {
    path: 'dirty.ts',
    index: ' ',
    workTree: 'M',
    staged: false,
    isDirectory: false,
  },
]

const dirtyDiff: FileDiff = {
  path: 'dirty.ts',
  hunks: [
    {
      header: '@@ -1 +1 @@',
      lines: [{ kind: 'add', content: 'dirty line', newNo: 1 }],
    },
  ],
}

const stagedDiff: FileDiff = {
  path: 'staged.ts',
  hunks: [
    {
      header: '@@ -1 +1 @@',
      lines: [{ kind: 'add', content: 'staged line', newNo: 1 }],
    },
  ],
}

const actionsStub = {
  repoOperation: 'none' as const,
  merging: false,
  rebasing: false,
  canContinueRebase: false,
  commitBlockReason: null,
  amendInfo: { canAmend: false, reason: '', headMessage: '' },
  externalToolError: null,
  refreshOperationState: vi.fn(),
  refreshMergeState: vi.fn(),
  handleContinueRebase: vi.fn(),
  handleStage: vi.fn(),
  handleUnstage: vi.fn(),
  handleStageSelected: vi.fn(),
  handleUnstageSelected: vi.fn(),
  handleStageAll: vi.fn(),
  handleUnstageAll: vi.fn(),
  handleCommit: vi.fn(),
  handleStageHunk: vi.fn(),
  handleUnstageHunk: vi.fn(),
  handleDiscardHunk: vi.fn(),
  handleStageLines: vi.fn(),
  handleUnstageLines: vi.fn(),
  handleDiscardLines: vi.fn(),
  handleFileContextMenu: vi.fn(),
}

const destructiveStub = {
  confirmAction: null,
  confirmTitle: '',
  confirmMessage: '',
  confirmLabel: '',
  requestDiscardPaths: vi.fn(),
  requestDiscardAll: vi.fn(),
  requestAbortMerge: vi.fn(),
  requestAbortOperation: vi.fn(),
  requestDeletePaths: vi.fn(),
  requestDiscardTrackedPaths: vi.fn(),
  cancelConfirm: vi.fn(),
  handleConfirmDestructive: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useGitStatus).mockReturnValue({
    entries: [...staged, ...unstaged],
    staged,
    unstaged,
    loading: false,
    error: null,
    reload: vi.fn(),
    stage: vi.fn(),
    unstage: vi.fn(),
  })
  vi.mocked(useGitDiff).mockImplementation((_wt, path, isStaged) => {
    if (path === 'dirty.ts' && !isStaged) {
      return { diff: dirtyDiff, loading: false, error: null, reload: vi.fn() }
    }
    if (path === 'staged.ts' && isStaged) {
      return { diff: stagedDiff, loading: false, error: null, reload: vi.fn() }
    }
    return { diff: null, loading: false, error: null, reload: vi.fn() }
  })
  vi.mocked(useGitWorkspaceActions).mockReturnValue(actionsStub)
  vi.mocked(useGitDestructiveConfirm).mockReturnValue(destructiveStub)
})

function renderWorkspace() {
  return render(
    <GitWorkspace
      worktreePath="/repo"
      hasUpstream
      pushAfterCommit={false}
      onPushAfterCommitChange={vi.fn()}
    />,
  )
}

describe('GitWorkspace', () => {
  it('shows placeholder when worktreePath is empty', () => {
    render(
      <GitWorkspace
        worktreePath=""
        hasUpstream={false}
        pushAfterCommit={false}
        onPushAfterCommitChange={vi.fn()}
      />,
    )
    expect(screen.getByText('ワークツリーを選択してください')).toBeInTheDocument()
  })

  it('opens unstaged file diff on click', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    expect(screen.getByText('ファイルを選択すると diff が表示されます')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dirty\.ts/ }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dirty.ts' })).toBeInTheDocument()
      expect(screen.getByText('dirty·line')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Hunkをステージに移動' })).toBeInTheDocument()
    })
  })

  it('opens staged file diff and clears the other section selection', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await user.click(screen.getByRole('button', { name: /dirty\.ts/ }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dirty.ts' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /staged\.ts/ }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'staged.ts' })).toBeInTheDocument()
      expect(screen.getByText('staged·line')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Hunkをアンステージに移動' })).toBeInTheDocument()
    })

    const dirtyRow = screen.getByRole('button', { name: /dirty\.ts/ }).parentElement
    expect(dirtyRow?.className).not.toMatch(/selected/)
  })
})
