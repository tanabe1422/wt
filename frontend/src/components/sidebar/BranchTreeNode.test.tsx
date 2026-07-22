// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BranchTreeNode } from './BranchTreeNode'

afterEach(() => {
  cleanup()
})

describe('BranchTreeNode', () => {
  it('calls onRevealInHistory on left click but not on context menu', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onRevealInHistory = vi.fn()
    const onContextMenu = vi.fn()

    render(
      <BranchTreeNode
        node={{ name: 'feature', fullName: 'feature/hoge', children: [] }}
        depth={0}
        selectedBranch={null}
        onSelect={onSelect}
        checkedOutBranch={null}
        worktreeBranches={new Set()}
        onRevealInHistory={onRevealInHistory}
        onContextMenu={onContextMenu}
      />,
    )

    const row = screen.getByTitle('feature/hoge')
    await user.click(row)

    expect(onSelect).toHaveBeenCalledWith('feature/hoge')
    expect(onRevealInHistory).toHaveBeenCalledWith('feature/hoge')
    expect(onContextMenu).not.toHaveBeenCalled()

    onSelect.mockClear()
    onRevealInHistory.mockClear()

    await user.pointer({ keys: '[MouseRight>]', target: row })

    expect(onSelect).toHaveBeenCalledWith('feature/hoge')
    expect(onRevealInHistory).not.toHaveBeenCalled()
    expect(onContextMenu).toHaveBeenCalled()
  })
})
