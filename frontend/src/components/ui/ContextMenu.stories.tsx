import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { openAppIcon } from '../icons/openAppIcons'
import { ContextMenu } from './ContextMenu'
import { Button } from './Button'

function ConflictMenuDemo() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  return (
    <div style={{ padding: '2rem' }}>
      <p style={{ marginTop: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
        衝突ファイルの右クリックメニュー例
      </p>
      <Button
        type="button"
        onContextMenu={(event) => {
          event.preventDefault()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        src/conflict.ts（右クリック）
      </Button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: '外部ツールで競合を解決',
              onClick: () => {
                console.info('[story] OpenMergetool src/conflict.ts')
              },
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

function OpenAppMenuDemo() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  return (
    <div style={{ padding: '2rem' }}>
      <p style={{ marginTop: 0, fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
        ワークツリーの右クリック（アプリで開く）
      </p>
      <Button
        type="button"
        onContextMenu={(event) => {
          event.preventDefault()
          setMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        worktree（右クリック）
      </Button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              icon: openAppIcon('cursor'),
              label: 'Cursorで開く',
              onClick: () => console.info('[story] OpenInApp cursor'),
            },
            {
              icon: openAppIcon('vscode'),
              label: 'VS Codeで開く',
              onClick: () => console.info('[story] OpenInApp vscode'),
            },
            { type: 'separator' },
            {
              label: 'エクスプローラで開く',
              onClick: () => console.info('[story] ShowInExplorer'),
            },
            {
              label: 'ターミナルで開く',
              onClick: () => console.info('[story] OpenTerminal'),
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

const meta = {
  title: 'UI/ContextMenu',
  component: ConflictMenuDemo,
} satisfies Meta<typeof ConflictMenuDemo>

export default meta
type Story = StoryObj<typeof meta>

export const ConflictResolve: Story = {
  name: '競合解決メニュー',
}

export const OpenInApp: Story = {
  name: 'アプリで開く',
  render: () => <OpenAppMenuDemo />,
}
