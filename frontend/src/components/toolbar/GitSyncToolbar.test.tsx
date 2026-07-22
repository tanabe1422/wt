// @vitest-environment happy-dom

import type { ReactElement } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SidebarProvider } from '../layout/CollapsibleSidebar'

vi.mock('../../lib/wails', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/wails')>()
  return {
    ...actual,
    resetWorkingTree: vi.fn().mockResolvedValue(undefined),
  }
})

import { resetWorkingTree } from '../../lib/wails'
import { GitSyncToolbar } from './GitSyncToolbar'

afterEach(() => {
  cleanup()
})

function renderToolbar(ui: ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>)
}

describe('GitSyncToolbar reset working tree', () => {
  const worktreePath = 'C:/dev/sample-repo'

  beforeEach(() => {
    vi.mocked(resetWorkingTree).mockReset().mockResolvedValue(undefined)
  })

  it('confirms then calls resetWorkingTree and refreshes statusAndBadge', async () => {
    const user = userEvent.setup()
    const onActionComplete = vi.fn().mockResolvedValue(undefined)
    const onBusyChange = vi.fn()

    renderToolbar(
      <GitSyncToolbar
        worktreePath={worktreePath}
        currentBranch="feature/a"
        mainView="files"
        onMainViewChange={vi.fn()}
        changedFileCount={3}
        onActionComplete={onActionComplete}
        onBusyChange={onBusyChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'リセット' }))

    const dialog = screen.getByRole('dialog', { name: 'ワーキングツリーをリセット' })
    expect(
      within(dialog).getByText(
        'ステージ済み・未ステージの変更と未追跡ファイルをすべて破棄します。この操作は取り消せません。',
      ),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'リセット' }))

    await waitFor(() => {
      expect(resetWorkingTree).toHaveBeenCalledWith(worktreePath)
    })
    expect(onActionComplete).toHaveBeenCalledWith('resetWorkingTree')
    expect(onBusyChange).toHaveBeenCalledWith(true, 'リセットしています…')
    expect(onBusyChange).toHaveBeenCalledWith(false, undefined)
    expect(screen.queryByRole('dialog', { name: 'ワーキングツリーをリセット' })).not.toBeInTheDocument()
  })

  it('disables reset when there are no uncommitted changes', () => {
    renderToolbar(
      <GitSyncToolbar
        worktreePath={worktreePath}
        mainView="files"
        onMainViewChange={vi.fn()}
        changedFileCount={0}
      />,
    )

    expect(screen.getByRole('button', { name: 'リセット' })).toBeDisabled()
  })

  it('cancels without calling resetWorkingTree', async () => {
    const user = userEvent.setup()
    const onActionComplete = vi.fn()

    renderToolbar(
      <GitSyncToolbar
        worktreePath={worktreePath}
        mainView="files"
        onMainViewChange={vi.fn()}
        changedFileCount={2}
        onActionComplete={onActionComplete}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'リセット' }))
    const dialog = screen.getByRole('dialog', { name: 'ワーキングツリーをリセット' })
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }))

    expect(resetWorkingTree).not.toHaveBeenCalled()
    expect(onActionComplete).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'ワーキングツリーをリセット' })).not.toBeInTheDocument()
  })
})
