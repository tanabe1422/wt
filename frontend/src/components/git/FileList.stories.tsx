import type { Meta, StoryObj } from '@storybook/react-vite'

import { FileList } from './FileList'
import {
  afterPullConflictStaged,
  afterPullConflictUnstaged,
  conflictOnlyUnstaged,
} from './fixtures/conflictStatusFixtures'

const meta = {
  title: 'Git/FileList',
  component: FileList,
  parameters: {
    layout: 'padded',
  },
  args: {
    loading: false,
    selectedPaths: new Set<string>(),
    focusPath: null,
    onFileClick: () => {},
  },
} satisfies Meta<typeof FileList>

export default meta
type Story = StoryObj<typeof meta>

export const Staged: Story = {
  name: 'ステージ済み',
  args: {
    files: afterPullConflictStaged,
    mode: 'staged',
    focusPath: afterPullConflictStaged[0]?.path ?? null,
    selectedPaths: new Set(
      afterPullConflictStaged[0] ? [afterPullConflictStaged[0].path] : [],
    ),
  },
}

export const UnstagedWithConflict: Story = {
  name: '未ステージ（競合あり）',
  args: {
    files: afterPullConflictUnstaged,
    mode: 'unstaged',
    focusPath: 'src/conflict.ts',
    selectedPaths: new Set(['src/conflict.ts']),
  },
}

export const ConflictOnly: Story = {
  name: '競合のみ',
  args: {
    files: conflictOnlyUnstaged,
    mode: 'unstaged',
    focusPath: 'src/conflict.ts',
    selectedPaths: new Set(['src/conflict.ts']),
  },
}

export const Empty: Story = {
  name: '空',
  args: {
    files: [],
    mode: 'unstaged',
  },
}
