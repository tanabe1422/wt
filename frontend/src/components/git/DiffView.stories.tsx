import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DiffView } from './DiffView'
import {
  readmeFileDiff,
  SAMPLE_FILE_PATH,
  sampleFileDiff,
  whitespaceFileDiff,
} from './diffFixtures'

const panelDecorator = (width = 560, height = 420) =>
  function PanelFrame(Story: React.ComponentType) {
    return (
      <div
        style={{
          width,
          height,
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          background: 'var(--color-surface-main)',
        }}
      >
        <Story />
      </div>
    )
  }

const meta = {
  title: 'Git/DiffView',
  component: DiffView,
  decorators: [panelDecorator()],
  args: {
    diff: null,
    loading: false,
    error: null,
    file: null,
    staged: false,
    conflict: false,
    busy: false,
  },
  argTypes: {
    onStageHunk: { table: { disable: true } },
    onUnstageHunk: { table: { disable: true } },
    onDiscardHunk: { table: { disable: true } },
    onStageLines: { table: { disable: true } },
    onUnstageLines: { table: { disable: true } },
    onDiscardLines: { table: { disable: true } },
  },
} satisfies Meta<typeof DiffView>

export default meta
type Story = StoryObj<typeof meta>

export const NoFileSelected: Story = {}

export const Loading: Story = {
  args: {
    file: SAMPLE_FILE_PATH,
    loading: true,
  },
}

export const Error: Story = {
  args: {
    file: SAMPLE_FILE_PATH,
    error: 'バイナリファイルの差分は表示できません',
  },
}

export const NoDiff: Story = {
  args: {
    file: SAMPLE_FILE_PATH,
    diff: { path: SAMPLE_FILE_PATH, hunks: [] },
  },
}

export const Conflict: Story = {
  name: '競合（プレースホルダ）',
  args: {
    file: 'src/conflict.ts',
    conflict: true,
    diff: { path: 'src/conflict.ts', hunks: [] },
  },
}

/** 履歴ビュー（CommitDetailPane）と同様の読み取り専用表示 */
export const HistoryReadOnly: Story = {
  args: {
    file: readmeFileDiff.path,
    diff: readmeFileDiff,
  },
}

export const WithDiff: Story = {
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff,
  },
}

export const VisibleSpaces: Story = {
  name: '半角スペース可視化',
  args: {
    file: whitespaceFileDiff.path,
    diff: whitespaceFileDiff,
  },
}

function UnstagedWithActions(
  props: Omit<
    React.ComponentProps<typeof DiffView>,
    | 'onStageHunk'
    | 'onUnstageHunk'
    | 'onDiscardHunk'
    | 'onStageLines'
    | 'onUnstageLines'
    | 'onDiscardLines'
  >,
) {
  const [log, setLog] = useState<string[]>([])
  const append = (message: string) => setLog((prev) => [...prev, message])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DiffView
          {...props}
          onStageHunk={(index) => append(`stage hunk ${index}`)}
          onUnstageHunk={(index) => append(`unstage hunk ${index}`)}
          onDiscardHunk={(index) => append(`discard hunk ${index}`)}
          onStageLines={(index, lines) => append(`stage lines hunk ${index}: ${lines.join(',')}`)}
          onUnstageLines={(index, lines) =>
            append(`unstage lines hunk ${index}: ${lines.join(',')}`)
          }
          onDiscardLines={(index, lines) =>
            append(`discard lines hunk ${index}: ${lines.join(',')}`)
          }
        />
      </div>
      {log.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--color-slate-600)',
            background: 'var(--color-slate-50)',
            borderTop: '1px solid var(--color-slate-200)',
          }}
        >
          {log.map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  )
}

/** ファイルビュー（GitWorkspace）の未ステージ変更 */
export const UnstagedWithHunkActions: Story = {
  name: '未ステージ（hunk / 行選択）',
  decorators: [panelDecorator(640, 480)],
  render: (args) => (
    <UnstagedWithActions
      {...args}
      file={sampleFileDiff.path}
      diff={sampleFileDiff}
      staged={false}
    />
  ),
}

/** ファイルビュー（GitWorkspace）のステージ済み変更 */
export const StagedWithHunkActions: Story = {
  decorators: [panelDecorator(640, 480)],
  render: (args) => (
    <UnstagedWithActions
      {...args}
      file={sampleFileDiff.path}
      diff={sampleFileDiff}
      staged
    />
  ),
}

export const Busy: Story = {
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff,
    busy: true,
    onStageHunk: () => undefined,
    onDiscardHunk: () => undefined,
    onStageLines: () => undefined,
    onDiscardLines: () => undefined,
  },
}

function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        width: 900,
        height: 480,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      <div
        style={{
          flex: '0 0 38%',
          minWidth: 0,
          borderRight: '1px solid var(--color-slate-200)',
          padding: '0.75rem',
          fontSize: '0.8125rem',
          color: 'var(--color-slate-500)',
        }}
      >
        変更ファイル一覧 / コミット情報
      </div>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{children}</div>
    </div>
  )
}

export const InFilesWorkspace: Story = {
  decorators: [(Story) => <WorkspaceLayout><Story /></WorkspaceLayout>],
  args: {
    file: sampleFileDiff.path,
    diff: sampleFileDiff,
    onStageHunk: () => undefined,
    onDiscardHunk: () => undefined,
    onStageLines: () => undefined,
    onDiscardLines: () => undefined,
  },
}

export const InHistoryPane: Story = {
  decorators: [(Story) => <WorkspaceLayout><Story /></WorkspaceLayout>],
  args: {
    file: readmeFileDiff.path,
    diff: readmeFileDiff,
  },
}
