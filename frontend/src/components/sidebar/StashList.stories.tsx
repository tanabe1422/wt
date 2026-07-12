import type { Meta, StoryObj } from '@storybook/react-vite'

import type { StashEntry } from '../../types'
import { StashList } from './StashList'
import { SidebarStoryFrame } from './fixtures/sidebarStoryHelpers'

const sampleStashes: StashEntry[] = [
  { index: 0, ref: 'stash@{0}', message: 'On feature/hoge: WIP before merge' },
  { index: 1, ref: 'stash@{1}', message: 'WIP on main: draft notes' },
]

const meta = {
  title: 'Sidebar/StashList',
  component: StashList,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <SidebarStoryFrame>
        <Story />
      </SidebarStoryFrame>
    ),
  ],
  args: {
    stashes: sampleStashes,
    onContextMenu: (stash) => {
      console.info('[story] stash context menu', stash.ref)
    },
  },
} satisfies Meta<typeof StashList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    stashes: [],
  },
}
