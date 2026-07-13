import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { RemoteCleanupDialog } from './RemoteCleanupDialog'

function InteractiveRemoteCleanup({
  worktreePath = 'C:/dev/sample-repo',
  initiallyOpen = true,
}: {
  worktreePath?: string
  initiallyOpen?: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <div style={{ minHeight: 480 }}>
      <button type="button" onClick={() => setOpen(true)}>
        リモート整理を開く
      </button>
      <RemoteCleanupDialog
        open={open}
        worktreePath={worktreePath}
        onClose={() => setOpen(false)}
        onDeleted={() => {
          console.info('[story] remote branches deleted')
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Toolbar/RemoteCleanupDialog',
  component: InteractiveRemoteCleanup,
  parameters: {
    docs: {
      description: {
        component:
          'リモートブランチのマージ済み／未マージ一覧と一括削除。判定は祖先（デフォルト）と内容（スカッシュ含む）を切替可能。',
      },
    },
  },
} satisfies Meta<typeof InteractiveRemoteCleanup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'デフォルト（マージ済み）',
}

export const Closed: Story = {
  name: '閉じた状態から開く',
  args: {
    initiallyOpen: false,
  },
}
