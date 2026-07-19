import type { Meta, StoryObj } from '@storybook/react-vite'

import { RepoTabBar } from './RepoTabBar'

const meta = {
  title: 'Tabs/RepoTabBar',
  component: RepoTabBar,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    repositories: ['C:/dev/sample-repo', 'C:/dev/other-repo', 'C:/dev/wt-manager'],
    activeRepository: 'C:/dev/sample-repo',
    onActivate: () => undefined,
    onClose: () => undefined,
    onAddLocal: () => undefined,
    onOpenClone: () => undefined,
  },
} satisfies Meta<typeof RepoTabBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    repositories: [],
    activeRepository: '',
  },
}

export const ManyTabs: Story = {
  args: {
    repositories: Array.from({ length: 12 }, (_, i) => `C:/dev/repo-${i + 1}`),
    activeRepository: 'C:/dev/repo-4',
  },
}
