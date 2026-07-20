// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FileDiff } from '../../types'
import { DiffView } from './DiffView'

afterEach(() => {
  cleanup()
})

const sampleDiff: FileDiff = {
  path: 'src/app.ts',
  hunks: [
    {
      header: '@@ -1,3 +1,4 @@',
      lines: [
        { kind: 'ctx', content: 'const a = 1', oldNo: 1, newNo: 1 },
        { kind: 'del', content: 'const b = 2', oldNo: 2 },
        { kind: 'add', content: 'const b = 3', newNo: 2 },
        { kind: 'ctx', content: 'const c = 4', oldNo: 3, newNo: 3 },
      ],
    },
  ],
}

describe('DiffView', () => {
  it('survives file=null to file set re-render without crashing', () => {
    const { rerender } = render(
      <DiffView diff={null} loading={false} error={null} file={null} />,
    )

    expect(screen.getByText('ファイルを選択すると diff が表示されます')).toBeInTheDocument()

    rerender(
      <DiffView
        diff={sampleDiff}
        loading={false}
        error={null}
        file="src/app.ts"
        onStageHunk={vi.fn()}
        onStageLines={vi.fn()}
      />,
    )

    expect(screen.getByText('src/app.ts')).toBeInTheDocument()
    expect(screen.getByText('const·a·=·1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hunkをステージに移動' })).toBeInTheDocument()
  })

  it('calls onStageLines after selecting a diff line', async () => {
    const user = userEvent.setup()
    const onStageLines = vi.fn()

    render(
      <DiffView
        diff={sampleDiff}
        loading={false}
        error={null}
        file="src/app.ts"
        onStageLines={onStageLines}
      />,
    )

    const addLine = screen.getByText('const·b·=·3').closest('[role="button"]')
    expect(addLine).toBeTruthy()
    await user.click(addLine!)

    await user.click(screen.getByRole('button', { name: '選択をステージ' }))
    expect(onStageLines).toHaveBeenCalledWith(0, [2])
  })

  it('exposes unstage and discard hunk actions when staged', async () => {
    const user = userEvent.setup()
    const onUnstageHunk = vi.fn()
    const onDiscardHunk = vi.fn()

    render(
      <DiffView
        diff={sampleDiff}
        loading={false}
        error={null}
        file="src/app.ts"
        staged
        onUnstageHunk={onUnstageHunk}
        onDiscardHunk={onDiscardHunk}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Hunkをアンステージに移動' }))
    expect(onUnstageHunk).toHaveBeenCalledWith(0)

    await user.click(screen.getByRole('button', { name: 'Hunkを破棄' }))
    expect(onDiscardHunk).toHaveBeenCalledWith(0)
  })

  it('calls onUnstageLines after selecting a staged line', async () => {
    const user = userEvent.setup()
    const onUnstageLines = vi.fn()

    render(
      <DiffView
        diff={sampleDiff}
        loading={false}
        error={null}
        file="src/app.ts"
        staged
        onUnstageLines={onUnstageLines}
      />,
    )

    await user.click(screen.getByText('const·b·=·3').closest('[role="button"]')!)
    await user.click(screen.getByRole('button', { name: '選択をアンステージ' }))
    expect(onUnstageLines).toHaveBeenCalledWith(0, [2])
  })

  it('hides stage actions and shows conflict guidance when conflict', () => {
    render(
      <DiffView
        diff={{ path: 'conflict.ts', hunks: [] }}
        loading={false}
        error={null}
        file="conflict.ts"
        conflict
        onStageHunk={vi.fn()}
        onDiscardHunk={vi.fn()}
      />,
    )

    expect(screen.getByText(/競合中のファイルです/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hunkをステージに移動' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Hunkを破棄' })).toBeNull()
  })
})
