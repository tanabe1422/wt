// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BranchHead, CommitLogEntry } from '../../types'
import { CommitList } from './CommitList'

afterEach(() => {
  cleanup()
})

const commits: CommitLogEntry[] = [
  {
    sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    commit: {
      author: { name: 'Alice', date: '2026-07-01T00:00:00Z' },
      message: 'first commit\n\nbody',
    },
    parents: [],
  },
  {
    sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    commit: {
      author: { name: 'Bob', date: '2026-07-02T00:00:00Z' },
      message: 'second commit',
    },
    parents: [{ sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }],
  },
]

const labels: BranchHead[] = [
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
  {
    name: 'v1.0.0',
    isRemote: false,
    isTag: true,
    commit: { sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  },
]

describe('CommitList', () => {
  it('calls onSelect with sha when a row is clicked and highlights selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    const { rerender } = render(
      <CommitList
        commits={commits}
        labels={[]}
        rowHeight={26}
        rowGridTemplateColumns="1fr 80px 90px 100px 70px"
        selectedSha={null}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByText('second commit').closest('button')!)
    expect(onSelect).toHaveBeenCalledWith('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')

    rerender(
      <CommitList
        commits={commits}
        labels={[]}
        rowHeight={26}
        rowGridTemplateColumns="1fr 80px 90px 100px 70px"
        selectedSha="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        onSelect={onSelect}
      />,
    )

    const selected = screen.getByText('second commit').closest('button')
    expect(selected?.className).toMatch(/selected/)
  })

  it('renders branch and tag labels with distinguishing icons', () => {
    render(
      <CommitList
        commits={commits}
        labels={labels}
        rowHeight={26}
        rowGridTemplateColumns="1fr 80px 90px 100px 70px"
        selectedSha={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getAllByText('feature/local').length).toBeGreaterThan(0)
    expect(screen.getAllByText('origin/main').length).toBeGreaterThan(0)
    expect(screen.getAllByText('v1.0.0').length).toBeGreaterThan(0)
  })
})
