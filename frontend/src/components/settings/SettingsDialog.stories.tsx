import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { emptyExternalTool } from '../../lib/externalToolPresets'
import type { Settings } from '../../types'
import { SettingsDialog } from './SettingsDialog'

const sampleSettings: Settings = {
  repositories: ['C:/dev/sample-repo'],
  activeRepository: 'C:/dev/sample-repo',
  diffTool: {
    preset: 'vscode',
    path: 'code',
    args: '--wait --diff $LOCAL $REMOTE',
  },
  mergeTool: {
    preset: 'vscode',
    path: 'code',
    args: '--wait --merge $REMOTE $LOCAL $BASE $MERGED',
  },
}

function InteractiveSettings(props: { initial?: Settings }) {
  const [open, setOpen] = useState(true)
  const [settings, setSettings] = useState<Settings>(props.initial ?? sampleSettings)
  return (
    <div style={{ minHeight: 360 }}>
      <button type="button" onClick={() => setOpen(true)}>
        設定を開く
      </button>
      <SettingsDialog
        open={open}
        settings={settings}
        onClose={() => setOpen(false)}
        onSave={async (next) => {
          setSettings(next)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Settings/SettingsDialog',
  component: InteractiveSettings,
} satisfies Meta<typeof InteractiveSettings>

export default meta
type Story = StoryObj<typeof meta>

export const DiffSection: Story = {
  name: 'Diff セクション',
}

export const EmptyTools: Story = {
  name: '未設定',
  args: {
    initial: {
      ...sampleSettings,
      diffTool: emptyExternalTool(),
      mergeTool: emptyExternalTool(),
    },
  },
}
