import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { GitDebugWindow } from './GitDebugWindow'

function InteractiveDebug() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ minHeight: 420, background: 'var(--color-slate-100)' }}>
      <button type="button" onClick={() => setOpen(true)}>
        デバッグを開く
      </button>
      <GitDebugWindow open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

const meta = {
  title: 'Settings/GitDebugWindow',
  component: InteractiveDebug,
} satisfies Meta<typeof InteractiveDebug>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'デバッグウィンドウ',
}
