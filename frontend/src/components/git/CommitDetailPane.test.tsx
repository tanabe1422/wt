// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommitFileChange, CommitLogEntry, FileDiff } from '../../types'

vi.mock('../../hooks/useCommitFiles', () => ({
  useCommitFiles: vi.fn(),
}))

vi.mock('../../hooks/useCommitFileDiff', () => ({
  useCommitFileDiff: vi.fn(),
}))

vi.mock('../../lib/diffPrefetch', () => ({
  prefetchCommitDiffs: vi.fn(() => () => {}),
  prefetchCommitHover: vi.fn(),
  prefetchCommitNeighbors: vi.fn(),
}))

vi.mock('../../lib/wails', () => ({
  openCommitDifftool: vi.fn(),
}))

import { useCommitFileDiff } from '../../hooks/useCommitFileDiff'
import { useCommitFiles } from '../../hooks/useCommitFiles'
import { CommitDetailPane } from './CommitDetailPane'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.mocked(useCommitFiles).mockReset()
  vi.mocked(useCommitFileDiff).mockReset()
})

const commit: CommitLogEntry = {
  sha: 'cccccccccccccccccccccccccccccccccccccccc',
  commit: {
    author: { name: 'Carol', email: 'c@example.com', date: '2026-07-03T00:00:00Z' },
    message: 'detail commit',
  },
  parents: [{ sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }],
}

const files: CommitFileChange[] = [
  { path: 'src/one.ts', status: 'M' },
  { path: 'src/two.ts', status: 'A' },
]

const oneDiff: FileDiff = {
  path: 'src/one.ts',
  hunks: [
    {
      header: '@@ -1 +1 @@',
      lines: [{ kind: 'add', content: 'console.log(1)', newNo: 1 }],
    },
  ],
}

const twoDiff: FileDiff = {
  path: 'src/two.ts',
  hunks: [
    {
      header: '@@ -0,0 +1 @@',
      lines: [{ kind: 'add', content: 'export const two = 2', newNo: 1 }],
    },
  ],
}

describe('CommitDetailPane', () => {
  it('shows placeholder when no commit is selected', () => {
    vi.mocked(useCommitFiles).mockReturnValue({
      files: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useCommitFileDiff).mockReturnValue({
      diff: null,
      loading: false,
      error: null,
      reload: vi.fn(),
    })

    render(<CommitDetailPane worktreePath="/repo" commit={null} />)
    expect(screen.getByText('コミットを選択すると詳細が表示されます')).toBeInTheDocument()
  })

  it('auto-selects first file and shows its diff, then switches on click', async () => {
    const user = userEvent.setup()

    vi.mocked(useCommitFiles).mockReturnValue({
      files,
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useCommitFileDiff).mockImplementation((_wt, _sha, selectedPath) => {
      if (selectedPath === 'src/two.ts') {
        return { diff: twoDiff, loading: false, error: null, reload: vi.fn() }
      }
      if (selectedPath === 'src/one.ts') {
        return { diff: oneDiff, loading: false, error: null, reload: vi.fn() }
      }
      return { diff: null, loading: false, error: null, reload: vi.fn() }
    })

    render(<CommitDetailPane worktreePath="/repo" commit={commit} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'src/one.ts' })).toBeInTheDocument()
      expect(screen.getByText('console.log(1)')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /src\/two\.ts/ }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'src/two.ts' })).toBeInTheDocument()
      expect(screen.getByText('export·const·two·=·2')).toBeInTheDocument()
    })
  })
})
