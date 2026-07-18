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
  detachedHeadSha,
  repoOperation,
  conflictCount,
  canContinueRebase,
}: {
  staged: typeof conflictStagedFiles
  unstaged: typeof conflictUnstagedNormal
  hint?: string
  detachedHeadSha?: string | null
  repoOperation?: 'none' | 'merge' | 'rebase'
  conflictCount?: number
  canContinueRebase?: boolean
}) {
  const [focusPath, setFocusPath] = useState<string | null>(
    unstaged.find((entry) => isConflict(entry))?.path ?? unstaged[0]?.path ?? null,
  )
  const [menu, setMenu] = useState<{
    x: number
    y: number
    path: string
    conflict: boolean
    untracked: boolean
  } | null>(null)

  const resolvedConflictCount =
    conflictCount ?? unstaged.filter((entry) => isConflict(entry)).length
  const resolvedOperation =
    repoOperation ??
    (unstaged.some((entry) => isConflict(entry)) ? 'merge' : 'none')

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
            event.preventDefault()
            setMenu({
              x: event.clientX,
              y: event.clientY,
              path: entry.path,
              conflict: isConflict(entry),
              untracked: entry.index === '?' && entry.workTree === '?',
            })
          }}
          onStage={noop}
          onUnstage={noop}
          onStageSelected={noop}
          onUnstageSelected={noop}
          onStageAll={noop}
          onUnstageAll={noop}
          onDiscardSelected={noop}
          onDiscardAll={noop}
          onAbortOperation={
            resolvedOperation !== 'none' || resolvedConflictCount > 0 ? noop : undefined
          }
          conflictCount={resolvedConflictCount}
          repoOperation={resolvedOperation}
          canContinueRebase={canContinueRebase}
          onContinueRebase={resolvedOperation === 'rebase' ? noop : undefined}
          detachedHeadSha={detachedHeadSha}
          onCreateBranchFromDetached={
            detachedHeadSha !== undefined
              ? () => {
                  console.info('[story] create branch from detached', detachedHeadSha)
                }
              : undefined
          }
        />
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={
            menu.conflict
              ? [
                  {
                    label: '外部ツールで競合を解決',
                    onClick: () => {
                      console.info('[story] OpenMergetool', menu.path)
                    },
                  },
                  {
                    label: 'エクスプローラーで表示',
                    onClick: () => {
                      console.info('[story] ShowInExplorer', menu.path)
                    },
                  },
                ]
              : [
                  {
                    label: '差分を外部ツールで開く',
                    onClick: () => {
                      console.info('[story] OpenDifftool', menu.path)
                    },
                  },
                  {
                    label: 'エクスプローラーで表示',
                    onClick: () => {
                      console.info('[story] ShowInExplorer', menu.path)
                    },
                  },
                  menu.untracked
                    ? {
                        label: 'ファイルを削除',
                        onClick: () => {
                          console.info('[story] DeleteUntracked', menu.path)
                        },
                      }
                    : {
                        label: '変更を破棄',
                        onClick: () => {
                          console.info('[story] DiscardFiles', menu.path)
                        },
                      },
                ]
          }
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

export const RebaseConflict: Story = {
  name: 'リベース競合',
  args: {
    staged: [],
    unstaged: conflictFiles,
    hint: '静止画。操作フロー全体は Git/RebaseFlow →「リベース → 競合解決 → Push」を参照。',
    repoOperation: 'rebase',
    conflictCount: conflictFiles.length,
    canContinueRebase: false,
  },
}

export const DetachedHead: Story = {
  name: 'detached HEAD',
  args: {
    staged: conflictStagedFiles,
    unstaged: conflictUnstagedNormal,
    hint: '情報バナー + 「ブランチを作成」。rebase/merge 中は出ない。',
    detachedHeadSha: 'a1b2c3d4e5f6789012345678abcdef01',
    repoOperation: 'none',
    conflictCount: 0,
  },
}

export const DetachedWhileRebase: Story = {
  name: 'detached 中のリベース（操作バナー優先）',
  args: {
    staged: [],
    unstaged: conflictFiles,
    hint: 'detachedHeadSha があっても rebase バナーだけ表示される。',
    detachedHeadSha: 'a1b2c3d4e5f6789012345678abcdef01',
    repoOperation: 'rebase',
    conflictCount: conflictFiles.length,
    canContinueRebase: false,
  },
}
