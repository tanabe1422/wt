// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommitFileChange, FileDiff } from '../../types'

vi.mock('../../hooks/useRangeFiles', () => ({
  useRangeFiles: vi.fn(),
}))

vi.mock('../../hooks/useRangeFileDiff', () => ({
  useRangeFileDiff: vi.fn(),
}))

vi.mock('../../lib/diffPrefetch', () => ({
  prefetchRangeDiffs: vi.fn(() => () => {}),
  prefetchRangeHover: vi.fn(),
  prefetchRangeNeighbors: vi.fn(),
}))

vi.mock('../../lib/wails', () => ({
  openRangeDifftool: vi.fn(),
}))

import { useRangeFileDiff } from '../../hooks/useRangeFileDiff'
import { useRangeFiles } from '../../hooks/useRangeFiles'
import { getByDiffLineText } from '../../test/diffText'
import { CompareDetailPane } from './CompareDetailPane'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.mocked(useRangeFiles).mockReset()
  vi.mocked(useRangeFileDiff).mockReset()
})

const files: CommitFileChange[] = [
  { path: 'a.ts', status: 'M' },
  { path: 'b.ts', status: 'A' },
]

const aDiff: FileDiff = {
  path: 'a.ts',
  hunks: [
    {
      header: '@@ -1 +1 @@',
      lines: [{ kind: 'add', content: ' consola', newNo: 1 }],
    },
  ],
}

const bDiff: FileDiff = {
  path: 'b.ts',
  hunks: [
    {
      header: '@@ -0,0 +1 @@',
      lines: [{ kind: 'add', content: 'export const b = 1', newNo: 1 }],
    },
  ],
}

describe('CompareDetailPane', () => {
  it('shows compare range and auto-selects the first file diff', async () => {
    vi.mocked(useRangeFiles).mockReturnValue({
      files,
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useRangeFileDiff).mockImplementation((_wt, _from, _to, selectedPath) => {
      if (selectedPath === 'b.ts') {
        return { diff: bDiff, loading: false, error: null, reload: vi.fn() }
      }
      if (selectedPath === 'a.ts') {
        return { diff: aDiff, loading: false, error: null, reload: vi.fn() }
      }
      return { diff: null, loading: false, error: null, reload: vi.fn() }
    })

    render(
      <CompareDetailPane
        worktreePath="/repo"
        range={{ fromRef: 'main', toRef: 'feature' }}
      />,
    )

    expect(screen.getByText('Diff 比較')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('feature')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'a.ts' })).toBeInTheDocument()
    })
  })

  it('switches diff when another file is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(useRangeFiles).mockReturnValue({
      files,
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useRangeFileDiff).mockImplementation((_wt, _from, _to, selectedPath) => {
      if (selectedPath === 'b.ts') {
        return { diff: bDiff, loading: false, error: null, reload: vi.fn() }
      }
      if (selectedPath === 'a.ts') {
        return { diff: aDiff, loading: false, error: null, reload: vi.fn() }
      }
      return { diff: null, loading: false, error: null, reload: vi.fn() }
    })

    render(
      <CompareDetailPane
        worktreePath="/repo"
        range={{ fromRef: 'main', toRef: 'feature' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /b\.ts/ }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'b.ts' })).toBeInTheDocument()
      expect(getByDiffLineText('export·const·b·=·1')).toBeInTheDocument()
    })
  })

  it('resets selected file when the compare range changes', async () => {
    vi.mocked(useRangeFiles).mockReturnValue({
      files,
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useRangeFileDiff).mockImplementation((_wt, _from, _to, selectedPath) => {
      if (selectedPath === 'a.ts') {
        return { diff: aDiff, loading: false, error: null, reload: vi.fn() }
      }
      return { diff: null, loading: false, error: null, reload: vi.fn() }
    })

    const { rerender } = render(
      <CompareDetailPane
        worktreePath="/repo"
        range={{ fromRef: 'main', toRef: 'feature' }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'a.ts' })).toBeInTheDocument()
    })

    const otherFiles: CommitFileChange[] = [{ path: 'c.ts', status: 'M' }]
    vi.mocked(useRangeFiles).mockReturnValue({
      files: otherFiles,
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    vi.mocked(useRangeFileDiff).mockImplementation((_wt, _from, _to, selectedPath) => {
      if (selectedPath === 'c.ts') {
        return {
          diff: {
            path: 'c.ts',
            hunks: [
              {
                header: '@@ -1 +1 @@',
                lines: [{ kind: 'add', content: 'next', newNo: 1 }],
              },
            ],
          },
          loading: false,
          error: null,
          reload: vi.fn(),
        }
      }
      return { diff: null, loading: false, error: null, reload: vi.fn() }
    })

    rerender(
      <CompareDetailPane
        worktreePath="/repo"
        range={{ fromRef: 'main', toRef: 'other' }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'c.ts' })).toBeInTheDocument()
      expect(screen.getByText('next')).toBeInTheDocument()
    })
  })
})
