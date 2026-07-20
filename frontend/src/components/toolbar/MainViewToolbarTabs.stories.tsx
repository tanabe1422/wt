import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { MainViewToolbarTabs, type MainView } from './MainViewToolbarTabs'

function InteractiveTabs(args: {
  view: MainView
  hasFileChanges?: boolean
}) {
  const [view, setView] = useState<MainView>(args.view)
  return (
    <MainViewToolbarTabs
      view={view}
      onChange={setView}
      hasFileChanges={args.hasFileChanges}
    />
  )
}

const meta = {
  title: 'Toolbar/MainViewToolbarTabs',
  component: MainViewToolbarTabs,
  render: (args) => <InteractiveTabs {...args} />,
  args: {
    view: 'files' as const,
    onChange: () => {},
    hasFileChanges: false,
  },
  argTypes: {
    onChange: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'inline-flex',
          padding: '0.5rem 0.75rem',
          background: 'var(--color-surface-header)',
          border: '1px solid var(--color-slate-200)',
          borderRadius: '0.375rem',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MainViewToolbarTabs>

export default meta
type Story = StoryObj<typeof meta>

export const Files: Story = {
  args: { view: 'files' },
}

export const History: Story = {
  args: { view: 'history' },
}

export const WithFileChanges: Story = {
  args: { view: 'history', hasFileChanges: true },
  name: 'ファイルに変更あり',
}

function DividerPreview(args: { view: MainView }) {
  const [view, setView] = useState<MainView>(args.view)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <MainViewToolbarTabs view={view} onChange={setView} />
      <div
        aria-hidden
        style={{
          width: 1,
          height: '1.75rem',
          background: 'var(--color-slate-300)',
        }}
      />
      <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Pull / Push / Fetch …</span>
    </div>
  )
}

export const WithDividerPreview: Story = {
  render: (args) => <DividerPreview {...args} />,
}
