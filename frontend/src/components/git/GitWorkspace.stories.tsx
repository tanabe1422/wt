import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { MouseEvent } from 'react'

import type { SectionSelection } from '../../hooks/useSectionSelection'
import { isConflict } from '../../lib/wails'
import type { FileStatus } from '../../types'
import { GitSyncToolbar } from '../toolbar/GitSyncToolbar'
import type { MainView } from '../toolbar/MainViewToolbarTabs'
import { ContextMenu } from '../ui/ContextMenu'
import { ErrorDialog } from '../ui/ErrorDialog'
import { ChangesPanel } from './ChangesPanel'
import { CommitBar } from './CommitBar'
import { DiffView } from './DiffView'
import {
  afterPullConflictStaged,
  afterPullConflictUnstaged,
  conflictOnlyUnstaged,
  mergetoolError,
  pullConflictError,
} from './fixtures/conflictStatusFixtures'
import workspaceStyles from './GitWorkspace.module.css'

const emptySelection: SectionSelection = { paths: new Set(), focus: null, anchor: null }

function selectionFor(path: string | null): SectionSelection {
  if (!path) {
    return emptySelection
  }
  return { paths: new Set([path]), focus: path, anchor: path }
}

const noopAsync = async () => {}

interface ConflictWorkspaceDemoProps {
  staged: FileStatus[]
  unstaged: FileStatus[]
  initialFocus?: string
  initialMenu?: { x: number; y: number; path: string }
  behindCount?: number
  showToolbar?: boolean
  hint?: string
  errorDialog?: { title: string; message: string }
}

function ConflictWorkspaceDemo({
  staged,
  unstaged,
  initialFocus,
  initialMenu,
  behindCount = 5,
  showToolbar = true,
  hint,
  errorDialog,
}: ConflictWorkspaceDemoProps) {
  const [mainView, setMainView] = useState<MainView>('files')
  const [focusPath, setFocusPath] = useState<string | null>(
    initialFocus ??
      unstaged.find((entry) => isConflict(entry))?.path ??
      unstaged[0]?.path ??
      staged[0]?.path ??
      null,
  )
  const [menu, setMenu] = useState(initialMenu ?? null)
  const [dialogOpen, setDialogOpen] = useState(!!errorDialog)

  const allFiles = [...staged, ...unstaged]
  const focusEntry = allFiles.find((entry) => entry.path === focusPath) ?? null
  const focusIsConflict = focusEntry ? isConflict(focusEntry) : false
  const focusInStaged = staged.some((entry) => entry.path === focusPath)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 880,
        height: 640,
        border: '1px solid var(--color-slate-200)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        background: 'var(--color-surface-main)',
      }}
    >
      {hint ? (
        <p
          style={{
            margin: 0,
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            color: 'var(--color-slate-600)',
            background: 'var(--color-slate-100)',
            borderBottom: '1px solid var(--color-slate-200)',
          }}
        >
          {hint}
        </p>
      ) : null}
      {showToolbar ? (
        <GitSyncToolbar
          worktreePath="C:/dev/sample-repo"
          behindCount={behindCount}
          aheadCount={0}
          mainView={mainView}
          onMainViewChange={setMainView}
        />
      ) : null}
      <div className={workspaceStyles.workspace} style={{ flex: 1, minHeight: 0 }}>
        <div className={workspaceStyles.body}>
          <div className={workspaceStyles.changes}>
            <ChangesPanel
              staged={staged}
              unstaged={unstaged}
              loading={false}
              stagedSelection={selectionFor(focusInStaged ? focusPath : null)}
              unstagedSelection={selectionFor(!focusInStaged ? focusPath : null)}
              onFileClick={(path) => setFocusPath(path)}
              onFileContextMenu={(entry, event: MouseEvent) => {
                if (!isConflict(entry)) {
                  return
                }
                event.preventDefault()
                setMenu({ x: event.clientX, y: event.clientY, path: entry.path })
              }}
              onStage={noopAsync}
              onUnstage={noopAsync}
              onStageSelected={noopAsync}
              onUnstageSelected={noopAsync}
              onStageAll={noopAsync}
              onUnstageAll={noopAsync}
            />
          </div>
          <div className={workspaceStyles.diff}>
            <DiffView
              file={focusPath}
              diff={focusPath ? { path: focusPath, hunks: [] } : null}
              loading={false}
              error={null}
              staged={focusInStaged}
              conflict={focusIsConflict}
            />
          </div>
        </div>
        <CommitBar disabled={false} busy={false} onCommit={noopAsync} onPush={noopAsync} />
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
      {errorDialog && (
        <ErrorDialog
          open={dialogOpen}
          title={errorDialog.title}
          message={errorDialog.message}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}

const meta = {
  title: 'Git/GitWorkspace',
  component: ConflictWorkspaceDemo,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ConflictWorkspaceDemo>

export default meta
type Story = StoryObj<typeof meta>

export const AfterPullConflict: Story = {
  name: 'プル衝突後（ダイアログ閉じた後）',
  args: {
    staged: afterPullConflictStaged,
    unstaged: afterPullConflictUnstaged,
    initialFocus: 'src/conflict.ts',
    behindCount: 5,
    hint: 'ダイアログを閉じた後。競合ファイルが「変更」に表示されます。',
  },
}

export const PullFailedWithDialog: Story = {
  name: 'プル失敗（ダイアログ表示）',
  args: {
    staged: afterPullConflictStaged,
    unstaged: afterPullConflictUnstaged,
    initialFocus: 'src/conflict.ts',
    behindCount: 5,
    errorDialog: pullConflictError,
    hint: 'Pull 失敗直後。エラーダイアログの背後に競合一覧が更新された状態です。',
  },
}

export const MergetoolFailedWithDialog: Story = {
  name: 'mergetool 起動失敗（ダイアログ表示）',
  args: {
    staged: afterPullConflictStaged,
    unstaged: afterPullConflictUnstaged,
    initialFocus: 'src/conflict.ts',
    behindCount: 5,
    errorDialog: mergetoolError,
    hint: '「外部ツールで競合を解決」実行時に mergetool 未設定などで失敗した場合。',
  },
}

export const WithContextMenuOpen: Story = {
  name: '競合解決メニュー表示',
  args: {
    staged: afterPullConflictStaged,
    unstaged: afterPullConflictUnstaged,
    initialFocus: 'src/conflict.ts',
    initialMenu: { x: 280, y: 220, path: 'src/conflict.ts' },
    behindCount: 5,
    hint: '競合ファイルの右クリックメニュー（外部ツールで競合を解決）',
  },
}

export const ConflictOnly: Story = {
  name: '競合ファイルのみ',
  args: {
    staged: [],
    unstaged: conflictOnlyUnstaged,
    initialFocus: 'src/conflict.ts',
    behindCount: 3,
    hint: '未解決の競合のみ（マージ途中で他に変更がない状態）',
  },
}

export const WorkspaceWithoutToolbar: Story = {
  name: 'ツールバーなし',
  args: {
    staged: afterPullConflictStaged,
    unstaged: afterPullConflictUnstaged,
    initialFocus: 'pkg/both-added.go',
    showToolbar: false,
    hint: 'ツールバーなし（メイン領域のみ）',
  },
}
