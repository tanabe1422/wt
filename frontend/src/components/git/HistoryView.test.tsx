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
  getStatus: vi.fn(async () => []),
  cherryPick: vi.fn(),
  skipCherryPick: vi.fn(),
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

import {
  cherryPick,
  getRepoOperationState,
  getStatus,
  skipCherryPick,
} from '../../lib/wails'
import { HistoryView } from './HistoryView'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockUseCommitHistory.mockReset()
  vi.mocked(getRepoOperationState).mockReset()
  vi.mocked(getRepoOperationState).mockResolvedValue({ kind: 'none' })
  vi.mocked(getStatus).mockReset()
  vi.mocked(getStatus).mockResolvedValue([])
  vi.mocked(cherryPick).mockReset()
  vi.mocked(skipCherryPick).mockReset()
  localStorage.clear()
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

  it('toggles remote branch label visibility', async () => {
    const user = userEvent.setup()
    const labels = [
      {
        name: 'feature/local',
        isRemote: false,
        isTag: false,
        commit: { sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      },
      {
        name: 'origin/main',
        isRemote: true,
        isTag: false,
        commit: { sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      },
    ]

    function RemoteLabelHarness() {
      const [scope, setScope] = useState<HistoryScope>('all')
      mockUseCommitHistory.mockReturnValue({
        scope,
        setScope,
        searchType: 'path',
        setSearchType: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        activeSearchQuery: '',
        commits,
        labels,
        hasMore: false,
        loading: false,
        loadingMore: false,
        error: null,
        loadMore: vi.fn(),
        reload: vi.fn(),
      })
      return <HistoryView worktreePath="/repo" currentBranch="feature/local" />
    }

    render(<RemoteLabelHarness />)

    const remoteToggle = screen.getByRole('checkbox', { name: /リモートブランチを表示/ })
    expect(remoteToggle).not.toBeChecked()
    expect(screen.getAllByText('feature/local').length).toBeGreaterThan(0)
    expect(screen.queryByText('origin/main')).toBeNull()

    await user.click(remoteToggle)
    expect(remoteToggle).toBeChecked()
    expect(screen.getAllByText('origin/main').length).toBeGreaterThan(0)
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

  it('skips empty cherry-pick and shows explanation', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    const onResetComplete = vi.fn()
    let picking = false
    vi.mocked(getRepoOperationState).mockImplementation(async () => ({
      kind: picking ? 'cherry-pick' : 'none',
    }))
    vi.mocked(cherryPick).mockImplementation(async () => {
      picking = true
      throw new Error('empty patch')
    })
    vi.mocked(getStatus).mockResolvedValue([])
    vi.mocked(skipCherryPick).mockImplementation(async () => {
      picking = false
    })

    mockUseCommitHistory.mockReturnValue({
      scope: 'all',
      setScope: vi.fn(),
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
      reload,
    })

    render(
      <HistoryView
        worktreePath="/repo"
        currentBranch="main"
        onResetComplete={onResetComplete}
      />,
    )

    await user.pointer({
      keys: '[MouseRight>]',
      target: screen.getByText('beta change').closest('button')!,
    })
    await user.click(screen.getByRole('menuitem', { name: 'このコミットを cherry-pick' }))

    await waitFor(() => {
      expect(skipCherryPick).toHaveBeenCalledWith('/repo')
    })
    expect(
      await screen.findByText(
        'このコミットの変更は既に取り込まれているため、cherry-pick をスキップしました',
      ),
    ).toBeInTheDocument()
    expect(reload).toHaveBeenCalled()
    expect(onResetComplete).toHaveBeenCalled()
  })

  it('keeps cherry-pick in progress on conflict and shows guidance', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    let picking = false
    vi.mocked(getRepoOperationState).mockImplementation(async () => ({
      kind: picking ? 'cherry-pick' : 'none',
    }))
    vi.mocked(cherryPick).mockImplementation(async () => {
      picking = true
      throw new Error('conflict')
    })
    vi.mocked(getStatus).mockResolvedValue([
      {
        path: 'a.txt',
        index: 'U',
        workTree: 'U',
        staged: false,
        isDirectory: false,
      },
    ])

    mockUseCommitHistory.mockReturnValue({
      scope: 'all',
      setScope: vi.fn(),
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
      reload,
    })

    render(<HistoryView worktreePath="/repo" currentBranch="main" />)

    await user.pointer({
      keys: '[MouseRight>]',
      target: screen.getByText('beta change').closest('button')!,
    })
    await user.click(screen.getByRole('menuitem', { name: 'このコミットを cherry-pick' }))

    expect(
      await screen.findByText('競合が発生しました。変更タブで解決してください'),
    ).toBeInTheDocument()
    expect(skipCherryPick).not.toHaveBeenCalled()
    expect(reload).toHaveBeenCalled()
  })
})
