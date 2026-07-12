import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import type { AmendInfo } from '../../types'
import { CommitBar } from './CommitBar'

const canAmend: AmendInfo = {
  canAmend: true,
  reason: '',
  headMessage: 'fix: previous tip message',
}

const alreadyPushed: AmendInfo = {
  canAmend: false,
  reason: 'すでにプッシュ済みです',
  headMessage: 'chore: synced with remote',
}

function CommitBarDemo({ amendInfo }: { amendInfo: AmendInfo }) {
  const [last, setLast] = useState('')
  return (
    <div style={{ width: 560, border: '1px solid var(--color-slate-200)' }}>
      <CommitBar
        disabled={false}
        busy={false}
        amendInfo={amendInfo}
        onCommit={async (message, options) => {
          setLast(`${options.amend ? 'amend' : 'commit'}: ${message}`)
        }}
        onPush={async () => {
          setLast('push')
        }}
      />
      {last ? (
        <p style={{ margin: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-slate-600)' }}>
          last: {last}
        </p>
      ) : null}
    </div>
  )
}

const meta = {
  title: 'Git/CommitBar',
  component: CommitBarDemo,
} satisfies Meta<typeof CommitBarDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { amendInfo: canAmend },
}

export const AmendDisabled: Story = {
  args: { amendInfo: alreadyPushed },
}
