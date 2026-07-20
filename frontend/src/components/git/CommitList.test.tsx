// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CommitLogEntry } from '../../types'
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
})
