// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommitBar } from './CommitBar'

afterEach(() => {
  cleanup()
})

describe('CommitBar', () => {
  it('commits with the entered message', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn().mockResolvedValue(undefined)

    render(
      <CommitBar
        disabled={false}
        busy={false}
        amendInfo={{ canAmend: false, reason: '不可', headMessage: '' }}
        pushAfterCommit={false}
        onPushAfterCommitChange={vi.fn()}
        onCommit={onCommit}
      />,
    )

    await user.type(screen.getByPlaceholderText('コミットメッセージ'), 'feat: hello')
    await user.click(screen.getByRole('button', { name: 'Commit' }))

    expect(onCommit).toHaveBeenCalledWith('feat: hello', {
      amend: false,
      pushAfterCommit: false,
    })
  })

  it('opens amend confirm dialog before amending', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn().mockResolvedValue(undefined)

    render(
      <CommitBar
        disabled={false}
        busy={false}
        amendInfo={{
          canAmend: true,
          reason: '',
          headMessage: 'previous message',
        }}
        pushAfterCommit={false}
        onPushAfterCommitChange={vi.fn()}
        onCommit={onCommit}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /Amend/ }))
    expect(screen.getByPlaceholderText('コミットメッセージ')).toHaveValue('previous message')

    await user.click(screen.getByRole('button', { name: 'Amend' }))
    expect(screen.getByRole('dialog', { name: 'コミットを修正' })).toBeInTheDocument()
    expect(onCommit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '修正する' }))
    expect(onCommit).toHaveBeenCalledWith('previous message', {
      amend: true,
      pushAfterCommit: false,
    })
  })
})
