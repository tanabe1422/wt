import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { ToastProvider, useToast } from '../../hooks/useToast'
import { GitWorkspace } from '../git/GitWorkspace'
import { MainLayout } from '../layout/MainLayout'
import { RepoTabBar } from '../tabs/RepoTabBar'
import { GitSyncToolbar } from '../toolbar/GitSyncToolbar'
import type { MainView } from '../toolbar/MainViewToolbarTabs'
import {
  Toast,
  ToastHost,
  TOAST_APPEARANCE_LABELS,
  type ToastAppearance,
  type ToastItem,
} from './Toast'
import styles from './Toast.module.css'

function StaticToastDemo({ items }: { items: ToastItem[] }) {
  const [toasts, setToasts] = useState(items)
  return (
    <div style={{ minHeight: 280, position: 'relative', background: 'var(--color-surface-main)' }}>
      <p
        style={{
          margin: 0,
          padding: '4rem 1rem 1rem',
          textAlign: 'center',
          color: 'var(--color-slate-500)',
          fontSize: '0.875rem',
        }}
      >
        メイン領域の中央上部にトーストが表示されます
      </p>
      <div className={styles.host}>
        <ToastHost
          items={toasts}
          onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
        />
      </div>
    </div>
  )
}

function InteractiveToastDemo() {
  const toast = useToast()
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        minHeight: 280,
        padding: '4rem 1rem 1rem',
        justifyContent: 'center',
        background: 'var(--color-surface-main)',
      }}
    >
      <button type="button" onClick={() => toast.success('コミットしました')}>
        成功
      </button>
      <button
        type="button"
        onClick={() => toast.progress('story-progress', 'フェッチしています…')}
      >
        進捗開始
      </button>
      <button type="button" onClick={() => toast.dismiss('story-progress')}>
        進捗を閉じる
      </button>
      <button
        type="button"
        onClick={() => {
          toast.dismiss('story-progress')
          toast.success('フェッチしました')
        }}
      >
        進捗→成功
      </button>
    </div>
  )
}

function InteractiveToast() {
  return (
    <ToastProvider>
      <InteractiveToastDemo />
    </ToastProvider>
  )
}

const designSamples: ToastItem[] = [
  { id: 'success', message: 'コミットしました', variant: 'success' },
  { id: 'progress', message: 'プッシュしています…', variant: 'progress' },
]

function DesignGallery() {
  const appearances = Object.keys(TOAST_APPEARANCE_LABELS) as ToastAppearance[]
  return (
    <div className={styles.gallery}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
        左アクセント線を使わない案を中心に比較できます。アプリ既定は「ソフト塗り」です。
      </p>
      {appearances.map((appearance) => (
        <section key={appearance} className={styles.gallerySection}>
          <h3 className={styles.galleryTitle}>{TOAST_APPEARANCE_LABELS[appearance]}</h3>
          <div className={styles.galleryRow}>
            {designSamples.map((item) => (
              <Toast
                key={`${appearance}-${item.id}`}
                item={{ ...item, id: `${appearance}-${item.id}` }}
                appearance={appearance}
                onDismiss={() => undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

type AppToastPreset = 'success' | 'progress' | 'stack'

function SeedAppToasts({ preset }: { preset: AppToastPreset }) {
  const toast = useToast()

  useEffect(() => {
    toast.dismiss('app-progress')
    if (preset === 'progress') {
      toast.progress('app-progress', 'フェッチしています…')
      return
    }
    if (preset === 'stack') {
      toast.progress('app-progress', 'フェッチしています…')
      toast.success('ブランチを作成しました')
      return
    }
    toast.success('プッシュしました')
  }, [preset, toast])

  return null
}

function AppScreenWithToast({ preset }: { preset: AppToastPreset }) {
  const [mainView, setMainView] = useState<MainView>('files')
  const [busy, setBusy] = useState(false)

  return (
    <ToastProvider>
      <SeedAppToasts preset={preset} />
      <div
        style={{
          height: '100vh',
          minHeight: 640,
          border: '1px solid var(--color-slate-200)',
          overflow: 'hidden',
        }}
      >
        <MainLayout
            busy={busy}
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
                onBusyChange={setBusy}
                onOpenSettings={() => undefined}
              />
            }
            sidebar={
              <div
                style={{
                  padding: '0.75rem',
                  fontSize: '0.8125rem',
                  color: 'var(--color-slate-500)',
                }}
              >
                サイドバー（モック）
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

const meta = {
  title: 'UI/Toast',
  component: StaticToastDemo,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    items: [{ id: 'success-1', message: 'コミットしました', variant: 'success' as const }],
  },
} satisfies Meta<typeof StaticToastDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  name: '成功',
  args: {
    items: [{ id: 'success-1', message: 'コミットしました', variant: 'success' }],
  },
}

export const Progress: Story = {
  name: '進捗',
  args: {
    items: [{ id: 'progress-1', message: 'プッシュしています…', variant: 'progress' }],
  },
}

export const Stack: Story = {
  name: 'スタック',
  args: {
    items: [
      { id: 'progress-1', message: 'フェッチしています…', variant: 'progress' },
      { id: 'success-1', message: 'ブランチを作成しました', variant: 'success' },
    ],
  },
}

export const Interactive: Story = {
  name: 'インタラクティブ',
  render: () => <InteractiveToast />,
}

export const DesignOptions: Story = {
  name: 'デザイン案比較',
  render: () => <DesignGallery />,
}

export const InAppSuccess: Story = {
  name: 'アプリ画面（成功）',
  render: () => <AppScreenWithToast preset="success" />,
}

export const InAppProgress: Story = {
  name: 'アプリ画面（進捗）',
  render: () => <AppScreenWithToast preset="progress" />,
}

export const InAppStack: Story = {
  name: 'アプリ画面（スタック）',
  render: () => <AppScreenWithToast preset="stack" />,
}
