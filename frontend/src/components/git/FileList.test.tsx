// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FileStatus } from '../../types'
import { FileList } from './FileList'

afterEach(() => {
  cleanup()
})

const files: FileStatus[] = [
  {
    path: 'src/a.ts',
    index: ' ',
    workTree: 'M',
    staged: false,
    isDirectory: false,
  },
  {
    path: 'src/b.ts',
    index: ' ',
    workTree: 'A',
    staged: false,
    isDirectory: false,
  },
]

describe('FileList', () => {
  it('notifies onFileClick and shows selected class', async () => {
    const user = userEvent.setup()
    const onFileClick = vi.fn()

    const { rerender } = render(
      <FileList
        files={files}
        mode="unstaged"
        selectedPaths={new Set()}
        focusPath={null}
        onFileClick={onFileClick}
        onStage={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /src\/a\.ts/ }))
    expect(onFileClick).toHaveBeenCalled()
    expect(onFileClick.mock.calls[0][0]).toBe('src/a.ts')
    expect(onFileClick.mock.calls[0][1]).toBe(0)

    rerender(
      <FileList
        files={files}
        mode="unstaged"
        selectedPaths={new Set(['src/a.ts'])}
        focusPath="src/a.ts"
        onFileClick={onFileClick}
        onStage={vi.fn()}
      />,
    )

    const row = screen.getByRole('button', { name: /src\/a\.ts/ }).parentElement
    expect(row?.className).toMatch(/selected/)
  })

  it('calls onStage from the stage action button', async () => {
    const user = userEvent.setup()
    const onStage = vi.fn()

    render(
      <FileList
        files={files}
        mode="unstaged"
        selectedPaths={new Set()}
        focusPath={null}
        onFileClick={vi.fn()}
        onStage={onStage}
      />,
    )

    await user.click(screen.getAllByRole('button', { name: 'ステージ' })[0]!)
    expect(onStage).toHaveBeenCalledWith('src/a.ts')
  })
})
