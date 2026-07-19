import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import type { WorktreeEntry } from '../../types'
import { WorktreeCleanupDialog } from './WorktreeCleanupDialog'
import {
  FIXTURE_REPO_ROOT,
  worktreesComposite,
  worktreesDetached,
} from './fixtures/sidebarFixtures'

function InteractiveWorktreeCleanup({
  initiallyOpen = true,
  worktrees = worktreesComposite,
}: {
  initiallyOpen?: boolean
  worktrees?: WorktreeEntry[]
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [list, setList] = useState(worktrees)
  const [selectedWorktree, setSelectedWorktree] = useState(
    () => list.find((entry) => !entry.isMain)?.path ?? list[0]?.path ?? null,
  )

  return (
    <div style={{ minHeight: 480 }}>
      <button type="button" onClick={() => setOpen(true)}>
        ワークツリーの整理を開く
      </button>
      <WorktreeCleanupDialog
        open={open}
        repoPath={FIXTURE_REPO_ROOT}
        worktrees={list}
        selectedWorktree={selectedWorktree}
        onSelectWorktree={setSelectedWorktree}
        onClose={() => setOpen(false)}
        onDeleted={async () => {
          setList((prev) => prev.filter((entry) => entry.isMain))
          console.info('[story] worktrees deleted')
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Sidebar/WorktreeCleanupDialog',
  component: InteractiveWorktreeCleanup,
  parameters: {
    docs: {
      description: {
        component:
          'ワークツリーの一覧と一括削除。メインワークツリーは表示のみで選択不可。',
      },
    },
  },
} satisfies Meta<typeof InteractiveWorktreeCleanup>

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

export const WithDetached: Story = {
  name: 'detached 含む',
  args: {
    worktrees: worktreesDetached,
  },
}
