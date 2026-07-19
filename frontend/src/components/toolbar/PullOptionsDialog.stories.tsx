import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PullOptionsDialog, type PullOptions } from './PullOptionsDialog'

const meta = {
  title: 'Toolbar/PullOptionsDialog',
  component: PullOptionsDialog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
} satisfies Meta<typeof PullOptionsDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    open: true,
  },
}

function InteractiveDemo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<PullOptions | null>(null)

  return (
    <div style={{ padding: '1rem' }}>
      <button type="button" onClick={() => setOpen(true)}>
        プルオプションを開く
      </button>
      {last && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
          前回: rebase={String(last.rebase)}, force={String(last.force)}
        </p>
      )}
      <PullOptionsDialog
        open={open}
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
