import { describe, expect, it, vi } from 'vitest'

import { buildOpenAppMenuItems, withMenuSeparators } from './openAppMenu'
import type { OpenApp } from '../types'

const apps: OpenApp[] = [
  { id: 'a1', name: 'Cursor', path: 'cursor', args: '{path}', icon: 'cursor' },
  { id: 'a2', name: '', path: '', args: '{path}', icon: 'generic' },
  { id: 'a3', name: '', path: 'code', args: '{path}', icon: 'vscode' },
]

describe('buildOpenAppMenuItems', () => {
  it('skips apps without a path and labels with name or path', () => {
    const onOpen = vi.fn()
    const items = buildOpenAppMenuItems(apps, {}, onOpen)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ label: 'Cursorで開く' })
    expect(items[1]).toMatchObject({ label: 'codeで開く' })
    if (items[0] && items[0].type !== 'separator') {
      items[0].onClick()
    }
    expect(onOpen).toHaveBeenCalledWith('a1')
  })
})

describe('withMenuSeparators', () => {
  it('inserts separators only between non-empty groups', () => {
    const items = withMenuSeparators(
      [{ label: 'A', onClick: () => undefined }],
      [],
      [
        { label: 'B', onClick: () => undefined },
        { label: 'C', onClick: () => undefined },
      ],
      [{ label: 'D', onClick: () => undefined }],
    )
    expect(items.map((entry) => ('type' in entry && entry.type === 'separator' ? '|' : entry.label))).toEqual([
      'A',
      '|',
      'B',
      'C',
      '|',
      'D',
    ])
  })
})
