// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommitLogEntry, HistoryScope } from '../../types'

const mockUseCommitHistory = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useCommitHistory', () => ({
  useCommitHistory: (...args: unknown[]) => mockUseCommitHistory(...args),
}))

vi.mock('../../lib/wails', () => ({
  getRepoOperationState: vi.fn(async () => ({ kind: 'none' })),
  cherryPick: vi.fn(),
  resetToCommit: vi.fn(),
}))

vi.mock('./CommitDetailPane', () => ({
  CommitDetailPane: ({ commit }: { commit: CommitLogEntry | null }) => (
    <div data-testid="commit-detail">
      {commit ? `detail:${commit.sha}` : 'no-detail'}
    </div>
  ),
}))

vi.mock('./CompareDetailPane', () => ({
  CompareDetailPane: ({ range }: { range: { fromRef: string; toRef: string } }) => (
    <div data-testid="compare-detail">
      compare:{range.fromRef}..{range.toRef}
    </div>
  ),
}))

import { HistoryView } from './HistoryView'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockUseCommitHistory.mockReset()
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

const commits: CommitLogEntry[] = [
  {
    sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    commit: {
      author: { name: 'Alice', date: '2026-07-01T00:00:00Z' },
      message: 'alpha change',
    },
    parents: [],
  },
  {
    sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    commit: {
      author: { name: 'Bob', date: '2026-07-02T00:00:00Z' },
      message: 'beta change',
    },
    parents: [{ sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }],
  },
]

function HistoryHarness({
  initialScope = 'all' as HistoryScope,
  revealCommitRequest = null as { sha: string } | null,
  onRevealRequestConsumed,
}: {
  initialScope?: HistoryScope
  revealCommitRequest?: { sha: string } | null
  onRevealRequestConsumed?: () => void
}) {
  const [scope, setScope] = useState<HistoryScope>(initialScope)

  mockUseCommitHistory.mockReturnValue({
    scope,
    setScope,
    searchType: 'path',
    setSearchType: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    activeSearchQuery: '',
    commits,
    labels: [],
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    loadMore: vi.fn(),
    reload: vi.fn(),
  })

  return (
    <HistoryView
      worktreePath="/repo"
      currentBranch="main"
      revealCommitRequest={revealCommitRequest}
      onRevealRequestConsumed={onRevealRequestConsumed}
    />
  )
}

describe('HistoryView', () => {
  it('opens commit detail when a history row is clicked', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness />)

    expect(screen.getByTestId('commit-detail')).toHaveTextContent('no-detail')

    await user.click(screen.getByText('beta change').closest('button')!)

    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent(
        'detail:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      )
    })
  })

  it('selects commit when the graph column is clicked', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness />)

    const graphColumn = document.querySelector('[class*="graphColumn"]') as HTMLElement
    expect(graphColumn).toBeTruthy()
    vi.spyOn(graphColumn, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 52,
      right: 40,
      width: 40,
      height: 52,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    // Second row (index 1) → beta commit. COMMIT_ROW_HEIGHT = 26.
    await user.pointer({
      keys: '[MouseLeft]',
      target: graphColumn,
      coords: { clientX: 10, clientY: 30 },
    })

    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent(
        'detail:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      )
    })
  })

  it('opens compare detail from the context menu', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness />)

    await user.pointer({
      keys: '[MouseRight>]',
      target: screen.getByText('beta change').closest('button')!,
    })
    await user.click(screen.getByRole('menuitem', { name: /現在のブランチとの Diff を表示/ }))

    await waitFor(() => {
      expect(screen.getByTestId('compare-detail')).toHaveTextContent(
        'compare:main..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      )
    })
  })

  it('clears selection when history scope changes', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness initialScope="all" />)

    await user.click(screen.getByText('beta change').closest('button')!)
    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent(/detail:/)
    })

    await user.click(screen.getByRole('checkbox', { name: /すべてのブランチを表示する/ }))

    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent('no-detail')
    })
  })

  it('selects commit from revealCommitRequest', async () => {
    const onRevealRequestConsumed = vi.fn()
    render(
      <HistoryHarness
        revealCommitRequest={{ sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }}
        onRevealRequestConsumed={onRevealRequestConsumed}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent(
        'detail:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      )
    })
    expect(onRevealRequestConsumed).toHaveBeenCalled()
  })

  it('switches scope to all when revealing while scoped to branch', async () => {
    function ScopeRevealHarness() {
      const [scope, setScope] = useState<HistoryScope>('branch')
      const [loading, setLoading] = useState(false)
      const [pageCommits, setPageCommits] = useState([commits[0]])
      const [reveal, setReveal] = useState<{ sha: string } | null>({
        sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      })

      mockUseCommitHistory.mockReturnValue({
        scope,
        setScope: (next: HistoryScope) => {
          setScope(next)
          if (next === 'all') {
            setLoading(true)
            setPageCommits([])
            queueMicrotask(() => {
              setLoading(false)
              setPageCommits(commits)
            })
          }
        },
        searchType: 'path',
        setSearchType: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        activeSearchQuery: '',
        commits: pageCommits,
        labels: [],
        hasMore: false,
        loading,
        loadingMore: false,
        error: null,
        loadMore: vi.fn(),
        reload: vi.fn(),
      })

      return (
        <HistoryView
          worktreePath="/repo"
          currentBranch="main"
          revealCommitRequest={reveal}
          onRevealRequestConsumed={() => setReveal(null)}
        />
      )
    }

    render(<ScopeRevealHarness />)

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /すべてのブランチを表示する/ })).toBeChecked()
    })
    await waitFor(() => {
      expect(screen.getByTestId('commit-detail')).toHaveTextContent(
        'detail:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      )
    })
  })
})
