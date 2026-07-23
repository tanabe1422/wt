// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FileStatus } from '../../types'
import { ChangesPanel } from './ChangesPanel'

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

const emptySelection = { paths: new Set<string>(), focus: null, anchor: null }

describe('ChangesPanel', () => {
  it('invokes stage/unstage all and selected handlers', async () => {
    const user = userEvent.setup()
    const onStageAll = vi.fn()
    const onUnstageAll = vi.fn()
    const onStageSelected = vi.fn()
    const onUnstageSelected = vi.fn()

    render(
      <ChangesPanel
        staged={staged}
        unstaged={unstaged}
        loading={false}
        stagedSelection={{ paths: new Set(['staged.ts']), focus: 'staged.ts', anchor: 'staged.ts' }}
        unstagedSelection={{ paths: new Set(['dirty.ts']), focus: 'dirty.ts', anchor: 'dirty.ts' }}
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={onStageSelected}
        onUnstageSelected={onUnstageSelected}
        onStageAll={onStageAll}
        onUnstageAll={onUnstageAll}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'すべて追加' }))
    expect(onStageAll).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '選択を追加' }))
    expect(onStageSelected).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'すべて除く' }))
    expect(onUnstageAll).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '選択を除く' }))
    expect(onUnstageSelected).toHaveBeenCalledTimes(1)
  })

  it('disables selected actions when nothing is selected', () => {
    render(
      <ChangesPanel
        staged={staged}
        unstaged={unstaged}
        loading={false}
        stagedSelection={emptySelection}
        unstagedSelection={emptySelection}
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={vi.fn()}
        onUnstageSelected={vi.fn()}
        onStageAll={vi.fn()}
        onUnstageAll={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '選択を追加' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '選択を除く' })).toBeDisabled()
  })

  it('shows rebase banner actions', async () => {
    const user = userEvent.setup()
    const onContinueRebase = vi.fn()
    const onAbortOperation = vi.fn()

    render(
      <ChangesPanel
        staged={[]}
        unstaged={unstaged}
        loading={false}
        stagedSelection={emptySelection}
        unstagedSelection={emptySelection}
        repoOperation="rebase"
        conflictCount={2}
        canContinueRebase={false}
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={vi.fn()}
        onUnstageSelected={vi.fn()}
        onStageAll={vi.fn()}
        onUnstageAll={vi.fn()}
        onContinueRebase={onContinueRebase}
        onAbortOperation={onAbortOperation}
      />,
    )

    expect(screen.getByText('リベース競合: 2 ファイル')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '続行' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'リベースを中止' }))
    expect(onAbortOperation).toHaveBeenCalledTimes(1)
  })

  it('enables continue when canContinueRebase is true', async () => {
    const user = userEvent.setup()
    const onContinueRebase = vi.fn()

    render(
      <ChangesPanel
        staged={[]}
        unstaged={[]}
        loading={false}
        stagedSelection={emptySelection}
        unstagedSelection={emptySelection}
        repoOperation="cherry-pick"
        canContinueRebase
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={vi.fn()}
        onUnstageSelected={vi.fn()}
        onStageAll={vi.fn()}
        onUnstageAll={vi.fn()}
        onContinueRebase={onContinueRebase}
        onAbortOperation={vi.fn()}
      />,
    )

    expect(screen.getByText('cherry-pick 進行中')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '続行' }))
    expect(onContinueRebase).toHaveBeenCalledTimes(1)
  })

  it('shows skip for empty cherry-pick in progress', async () => {
    const user = userEvent.setup()
    const onSkipCherryPick = vi.fn()

    render(
      <ChangesPanel
        staged={[]}
        unstaged={[]}
        loading={false}
        stagedSelection={emptySelection}
        unstagedSelection={emptySelection}
        repoOperation="cherry-pick"
        canContinueRebase={false}
        canSkipCherryPick
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={vi.fn()}
        onUnstageSelected={vi.fn()}
        onStageAll={vi.fn()}
        onUnstageAll={vi.fn()}
        onContinueRebase={vi.fn()}
        onSkipCherryPick={onSkipCherryPick}
        onAbortOperation={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '続行' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'スキップ' }))
    expect(onSkipCherryPick).toHaveBeenCalledTimes(1)
  })

  it('shows merge abort when only conflictCount is set', async () => {
    const user = userEvent.setup()
    const onAbortOperation = vi.fn()

    render(
      <ChangesPanel
        staged={[]}
        unstaged={unstaged}
        loading={false}
        stagedSelection={emptySelection}
        unstagedSelection={emptySelection}
        conflictCount={1}
        onFileClick={vi.fn()}
        onStage={vi.fn()}
        onUnstage={vi.fn()}
        onStageSelected={vi.fn()}
        onUnstageSelected={vi.fn()}
        onStageAll={vi.fn()}
        onUnstageAll={vi.fn()}
        onAbortOperation={onAbortOperation}
      />,
    )

    expect(screen.getByText('マージ競合: 1 ファイル')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'マージを中止' }))
    expect(onAbortOperation).toHaveBeenCalledTimes(1)
  })
})
