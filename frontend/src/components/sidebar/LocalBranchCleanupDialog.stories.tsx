import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import type { BranchEntry } from '../../types'
import { collectWorktreeBranches } from '../../utils/branchMarks'
import { LocalBranchCleanupDialog } from './LocalBranchCleanupDialog'
import { branchesComposite, worktreesComposite } from './fixtures/sidebarFixtures'

function InteractiveLocalCleanup({
  initiallyOpen = true,
  branches = branchesComposite,
}: {
  initiallyOpen?: boolean
  branches?: BranchEntry[]
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [branchList, setBranchList] = useState(branches)
  const worktreeBranches = useMemo(
    () => collectWorktreeBranches(worktreesComposite),
    [],
  )
  const checkedOutBranch =
    worktreesComposite.find((entry) => entry.isMain)?.branch ?? 'feature/hoge'

  return (
    <div style={{ minHeight: 480 }}>
      <button type="button" onClick={() => setOpen(true)}>
        ブランチの整理を開く
      </button>
      <LocalBranchCleanupDialog
        open={open}
        worktreePath="C:/dev/sample-repo"
        branches={branchList}
        checkedOutBranch={checkedOutBranch}
        worktreeBranches={worktreeBranches}
        onClose={() => setOpen(false)}
        onDeleted={async () => {
          setBranchList((prev) =>
            prev.filter((entry) => entry.isRemote || entry.name === 'feature/hoge'),
          )
          console.info('[story] local branches deleted')
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Sidebar/LocalBranchCleanupDialog',
  component: InteractiveLocalCleanup,
  parameters: {
    docs: {
      description: {
        component:
          'ローカルブランチの一覧と一括削除。ワークツリー紐付き／選択中 checkout ブランチは選択不可。',
      },
    },
  },
} satisfies Meta<typeof InteractiveLocalCleanup>

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
