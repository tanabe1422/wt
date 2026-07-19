import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { ToastProvider } from '../../hooks/useToast'
import { GitWorkspace } from '../git/GitWorkspace'
import { RepoTabBar } from '../tabs/RepoTabBar'
import { GitSyncToolbar } from '../toolbar/GitSyncToolbar'
import type { MainView } from '../toolbar/MainViewToolbarTabs'
import {
  BUSY_MESSAGE_APPEARANCE_LABELS,
  type BusyMessageAppearance,
} from './BusyProgressText'
import storyStyles from './BusyOverlayProgress.stories.module.css'
import { MainLayout } from './MainLayout'

const SAMPLE_MESSAGE = 'Receiving objects:  67% (1340/2000), 12.40 MiB | 1.20 MiB/s'
const SAMPLE_MESSAGES = [
  'フェッチしています…',
  'Enumerating objects: 1234, done.',
  'Counting objects: 100% (1234/1234), done.',
  'Receiving objects:  45% (450/1000), 4.20 MiB | 980.00 KiB/s',
  SAMPLE_MESSAGE,
  'Resolving deltas: 100% (800/800), done.',
]

const BRANCHES = [
  'main',
  'develop',
  'feature/auth-refresh',
  'feature/busy-overlay-progress',
  'fix/diff-scroll-jump',
  'chore/deps-bump',
  'origin/main',
  'origin/release/2026.07',
]

const FILES = [
  'frontend/src/App.tsx',
  'frontend/src/components/layout/MainLayout.tsx',
  'internal/git/sync.go',
  'internal/app/git_progress.go',
  'FEATURES.md',
  'README.md',
]

const DIFF_LINES = [
  { text: '@@ -40,8 +40,16 @@', tone: 'meta' as const },
  { text: ' func (a *App) Fetch(worktreePath string) error {', tone: 'ctx' as const },
  { text: '-       return withWorktree(worktreePath, git.Fetch)', tone: 'del' as const },
  { text: '+       return withWorktree(worktreePath, func(dir string) error {', tone: 'add' as const },
  { text: '+               a.emitGitProgress("フェッチしています…")', tone: 'add' as const },
  { text: '+               return git.FetchWithProgress(dir, a.emitGitProgress)', tone: 'add' as const },
  { text: '+       })', tone: 'add' as const },
  { text: ' }', tone: 'ctx' as const },
]

function OverlayPreview({
  appearance,
  message = SAMPLE_MESSAGE,
}: {
  appearance: BusyMessageAppearance
  message?: string
}) {
  return (
    <div className={storyStyles.viewport}>
      <MainLayout
        busy
        busyMessage={message}
        busyMessageAppearance={appearance}
        sidebar={
          <div className={storyStyles.clutterSidebar} style={{ borderRight: 'none', height: '100%' }}>
            <p className={storyStyles.clutterHeading}>Branches</p>
            <ul className={storyStyles.clutterList}>
              {BRANCHES.map((name, index) => (
                <li
                  key={name}
                  data-tone={index === 3 ? 'accent' : name.startsWith('origin/') ? 'muted' : undefined}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <div className={storyStyles.clutterMain} style={{ height: '100%' }}>
          <div className={storyStyles.clutterFiles}>
            <p className={storyStyles.clutterHeading}>Changes</p>
            <ul className={storyStyles.clutterList}>
              {FILES.map((path, index) => (
                <li key={path} data-tone={index === 1 ? 'accent' : undefined}>
                  {path}
                </li>
              ))}
            </ul>
          </div>
          <div className={storyStyles.clutterDiff}>
            <p className={storyStyles.clutterHeading}>Diff</p>
            <pre>
              {DIFF_LINES.map((line) => (
                <div
                  key={line.text}
                  className={
                    line.tone === 'add'
                      ? storyStyles.diffAdd
                      : line.tone === 'del'
                        ? storyStyles.diffDel
                        : undefined
                  }
                >
                  {line.text}
                </div>
              ))}
            </pre>
          </div>
        </div>
      </MainLayout>
    </div>
  )
}

function DesignOnContentGallery() {
  const appearances = Object.keys(BUSY_MESSAGE_APPEARANCE_LABELS) as BusyMessageAppearance[]
  return (
    <div>
      <p className={storyStyles.hint} style={{ padding: '1rem 1rem 0' }}>
        半透明オーバーレイの下にブランチ名・ファイルパス・diff が見える状態で、進捗文字の読みやすさを比較します。
      </p>
      <div className={storyStyles.gallery}>
        {appearances.map((appearance) => (
          <section key={appearance} className={storyStyles.card}>
            <h3 className={storyStyles.cardTitle}>{BUSY_MESSAGE_APPEARANCE_LABELS[appearance]}</h3>
            <OverlayPreview appearance={appearance} />
          </section>
        ))}
      </div>
    </div>
  )
}

function InAppBusyDemo({ appearance }: { appearance: BusyMessageAppearance }) {
  const [mainView, setMainView] = useState<MainView>('files')
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((value) => (value + 1) % SAMPLE_MESSAGES.length)
    }, 1600)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <ToastProvider>
      <div className={storyStyles.appShell}>
        <div className={storyStyles.controls}>
          <span>appearance: {BUSY_MESSAGE_APPEARANCE_LABELS[appearance]}</span>
          <p className={storyStyles.hint}>メッセージは自動で切り替わります（フェード確認用）</p>
        </div>
        <MainLayout
          busy
          busyMessage={SAMPLE_MESSAGES[messageIndex]}
          busyMessageAppearance={appearance}
          toolbar={
            <RepoTabBar
              repositories={['C:/dev/sample-repo', 'C:/dev/other-repo']}
              activeRepository="C:/dev/sample-repo"
              onActivate={() => undefined}
              onClose={() => undefined}
              onAddLocal={() => undefined}
              onOpenClone={() => undefined}
            />
          }
          workspaceToolbar={
            <GitSyncToolbar
              worktreePath="C:/dev/sample-repo"
              currentBranch="feature/hoge"
              aheadCount={2}
              behindCount={1}
              hasUpstream
              mainView={mainView}
              onMainViewChange={setMainView}
              onOpenSettings={() => undefined}
            />
          }
          sidebar={
            <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-slate-600)' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Branches</p>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {BRANCHES.slice(0, 6).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          }
        >
          <GitWorkspace
            worktreePath="C:/dev/sample-repo"
            hasUpstream
            pushAfterCommit={false}
            onPushAfterCommitChange={() => undefined}
          />
        </MainLayout>
      </div>
    </ToastProvider>
  )
}

function AppearanceSelectDemo() {
  const [appearance, setAppearance] = useState<BusyMessageAppearance>('bare')
  const appearances = Object.keys(BUSY_MESSAGE_APPEARANCE_LABELS) as BusyMessageAppearance[]

  return (
    <div>
      <div className={storyStyles.controls}>
        <label>
          デザイン案
          <select
            value={appearance}
            onChange={(event) => setAppearance(event.target.value as BusyMessageAppearance)}
          >
            {appearances.map((value) => (
              <option key={value} value={value}>
                {BUSY_MESSAGE_APPEARANCE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <p className={storyStyles.hint}>同じうるさい背景の上で切り替えて比較</p>
      </div>
      <div style={{ height: 360, borderTop: '1px solid var(--color-slate-200)' }}>
        <OverlayPreview appearance={appearance} />
      </div>
    </div>
  )
}

const meta = {
  title: 'Layout/BusyOverlayProgress',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const DesignOnContent: Story = {
  name: 'デザイン案比較（背景あり）',
  render: () => <DesignOnContentGallery />,
}

export const SwitchOnContent: Story = {
  name: '切替比較（背景あり）',
  render: () => <AppearanceSelectDemo />,
}

export const InAppBare: Story = {
  name: 'アプリ画面 · bare',
  render: () => <InAppBusyDemo appearance="bare" />,
}

export const InAppChip: Story = {
  name: 'アプリ画面 · chip',
  render: () => <InAppBusyDemo appearance="chip" />,
}

export const InAppPanel: Story = {
  name: 'アプリ画面 · panel',
  render: () => <InAppBusyDemo appearance="panel" />,
}

export const InAppInk: Story = {
  name: 'アプリ画面 · ink',
  render: () => <InAppBusyDemo appearance="ink" />,
}

export const InAppStrong: Story = {
  name: 'アプリ画面 · 黒文字＋白シャドウ',
  render: () => <InAppBusyDemo appearance="strong" />,
}

export const InAppStrongInverse: Story = {
  name: 'アプリ画面 · 白文字＋黒シャドウ',
  render: () => <InAppBusyDemo appearance="strongInverse" />,
}

export const InAppHud: Story = {
  name: 'アプリ画面 · HUD',
  render: () => <InAppBusyDemo appearance="hud" />,
}

export const InAppArcade: Story = {
  name: 'アプリ画面 · アーケード',
  render: () => <InAppBusyDemo appearance="arcade" />,
}

export const InAppRpg: Story = {
  name: 'アプリ画面 · RPG',
  render: () => <InAppBusyDemo appearance="rpg" />,
}
