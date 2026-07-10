import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { MouseEvent } from 'react'

import type { SectionSelection } from '../../hooks/useSectionSelection'
import { isConflict } from '../../lib/wails'
import { ContextMenu } from '../ui/ContextMenu'
import { ChangesPanel } from './ChangesPanel'
import {
  conflictFiles,
  conflictStagedFiles,
  conflictUnstagedNormal,
} from './fixtures/conflictStatusFixtures'

const emptySelection: SectionSelection = { paths: new Set(), focus: null, anchor: null }

function selectionFor(path: string | null): SectionSelection {
  if (!path) {
    return emptySelection
  }
  return { paths: new Set([path]), focus: path, anchor: path }
}

function noop() {}

function ChangesPanelDemo({
  staged,
  unstaged,
  hint,
}: {
  staged: typeof conflictStagedFiles
  unstaged: typeof conflictUnstagedNormal
  hint?: string
}) {
  const [focusPath, setFocusPath] = useState<string | null>(
    unstaged.find((entry) => isConflict(entry))?.path ?? unstaged[0]?.path ?? null,
  )
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: 360 }}>
      {hint ? (
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-slate-600)' }}>{hint}</p>
      ) : null}
      <div
        style={{
          height: 420,
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
          overflow: 'hidden',
          background: 'var(--color-surface-main)',
        }}
      >
        <ChangesPanel
          staged={staged}
          unstaged={unstaged}
          loading={false}
          stagedSelection={selectionFor(
            staged.some((entry) => entry.path === focusPath) ? focusPath : null,
          )}
          unstagedSelection={selectionFor(
            unstaged.some((entry) => entry.path === focusPath) ? focusPath : null,
          )}
          onFileClick={(path) => setFocusPath(path)}
          onFileContextMenu={(entry, event: MouseEvent) => {
            if (!isConflict(entry)) {
              return
            }
            event.preventDefault()
            setMenu({ x: event.clientX, y: event.clientY, path: entry.path })
          }}
          onStage={noop}
          onUnstage={noop}
          onStageSelected={noop}
          onUnstageSelected={noop}
          onStageAll={noop}
          onUnstageAll={noop}
        />
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: '外部ツールで競合を解決',
              onClick: () => {
                console.info('[story] OpenMergetool', menu.path)
              },
            },
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

const meta = {
  title: 'Git/ChangesPanel',
  component: ChangesPanelDemo,
} satisfies Meta<typeof ChangesPanelDemo>

export default meta
type Story = StoryObj<typeof meta>

export const WithConflicts: Story = {
  name: '競合あり',
  args: {
    staged: conflictStagedFiles,
    unstaged: [...conflictFiles, ...conflictUnstagedNormal],
    hint: '衝突ファイルは「変更」側のみ。右クリックでメニューを確認できます。',
  },
}

export const MixedStatuses: Story = {
  name: '状態混在',
  args: {
    staged: conflictStagedFiles,
    unstaged: [
      conflictFiles[0],
      { path: 'old/util.ts', index: ' ', workTree: 'D', staged: false, isDirectory: false },
      ...conflictUnstagedNormal,
    ],
    hint: 'staged / unstaged / conflict / untracked の混在例',
  },
}

export const ConflictOnly: Story = {
  name: '競合のみ',
  args: {
    staged: [],
    unstaged: conflictFiles,
    hint: '衝突ファイルのみ（ステージ済みは空）',
  },
}
