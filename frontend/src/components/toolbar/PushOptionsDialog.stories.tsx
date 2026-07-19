import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PushOptionsDialog, type PushOptions } from './PushOptionsDialog'

const meta = {
  title: 'Toolbar/PushOptionsDialog',
  component: PushOptionsDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    currentBranch: 'feature/sync',
    aheadCount: 2,
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof PushOptionsDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    open: true,
  },
}

export const NoAhead: Story = {
  args: {
    open: true,
    aheadCount: 0,
  },
}

function InteractiveDemo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<PushOptions | null>(null)

  return (
    <div style={{ padding: '1rem' }}>
      <button type="button" onClick={() => setOpen(true)}>
        プッシュオプションを開く
      </button>
      {last && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
          前回: force={String(last.force)}
        </p>
      )}
      <PushOptionsDialog
        open={open}
        currentBranch="feature/sync"
        aheadCount={2}
        onConfirm={(options) => {
          setLast(options)
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  args: {
    open: false,
  },
}
