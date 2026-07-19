import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StashCleanupDialog } from './StashCleanupDialog'

function InteractiveStashCleanup({
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
        スタッシュ整理を開く
      </button>
      <StashCleanupDialog
        open={open}
        worktreePath={worktreePath}
        onClose={() => setOpen(false)}
        onDeleted={() => {
          console.info('[story] stashes deleted')
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Toolbar/StashCleanupDialog',
  component: InteractiveStashCleanup,
  parameters: {
    docs: {
      description: {
        component:
          'スタッシュ一覧のプレビュー（ファイル一覧 / diff）と一括削除。チェックで削除対象、行クリックでプレビュー。',
      },
    },
  },
} satisfies Meta<typeof InteractiveStashCleanup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'デフォルト',
}

export const Closed: Story = {
  name: '閉じた状態から開く',
  args: {
    initiallyOpen: false,
  },
}
