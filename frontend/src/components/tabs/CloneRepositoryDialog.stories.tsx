import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CloneRepositoryDialog } from './CloneRepositoryDialog'

function InteractiveCloneDialog() {
  const [open, setOpen] = useState(true)
  const [last, setLast] = useState<{ url: string; dest: string } | null>(null)

  return (
    <div style={{ padding: 24, minHeight: 320 }}>
      <button type="button" onClick={() => setOpen(true)}>
        ダイアログを開く
      </button>
      {last && (
        <p style={{ marginTop: 12, fontSize: 14 }}>
          前回: {last.url} → {last.dest}
        </p>
      )}
      <CloneRepositoryDialog
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={(url, destPath) => {
          setLast({ url, dest: destPath })
          setOpen(false)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Tabs/CloneRepositoryDialog',
  component: InteractiveCloneDialog,
} satisfies Meta<typeof InteractiveCloneDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {}
