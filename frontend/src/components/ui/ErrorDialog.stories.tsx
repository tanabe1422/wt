import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  mergetoolError,
  pullConflictError,
} from '../git/fixtures/conflictStatusFixtures'
import { ErrorDialog } from './ErrorDialog'

const meta = {
  title: 'UI/ErrorDialog',
  component: ErrorDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onClose: () => undefined,
  },
} satisfies Meta<typeof ErrorDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    open: true,
    message: 'リポジトリの読み込みに失敗しました。',
  },
}

export const CustomTitle: Story = {
  args: {
    open: true,
    title: 'コミットに失敗しました',
    message: 'コミットメッセージが空です。メッセージを入力してから再度お試しください。',
  },
}

export const WithItems: Story = {
  args: {
    open: true,
    title: 'プッシュに失敗しました',
    message: '3 件のブランチをプッシュできませんでした。',
    items: [
      {
        label: 'feature/sync-badge',
        detail: 'rejected: non-fast-forward',
      },
      {
        label: 'hotfix/login',
        detail: 'remote: Permission denied',
      },
      {
        label: 'develop',
        detail: 'failed to connect to origin',
      },
    ],
  },
}

export const MultilineMessage: Story = {
  args: {
    open: true,
    title: 'Git 操作エラー',
    message: 'git push に失敗しました。\n\nリモートの変更を取り込んでから再度プッシュしてください。',
  },
}

export const PullConflict: Story = {
  name: 'プル競合',
  args: {
    open: true,
    title: pullConflictError.title,
    message: pullConflictError.message,
  },
}

export const MergetoolNotConfigured: Story = {
  name: 'mergetool 未設定',
  args: {
    open: true,
    title: mergetoolError.title,
    message: mergetoolError.message,
  },
}

function InteractiveDemo() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ padding: '1rem' }}>
      <button type="button" onClick={() => setOpen(true)}>
        エラーを表示
      </button>
      <ErrorDialog
        open={open}
        message="操作を完了できませんでした。"
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  args: {
    open: false,
    message: '',
    onClose: () => undefined,
  },
}
