import type { MouseEvent } from 'react'

import type { StashEntry } from '../../types'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import styles from './StashList.module.css'

const INDENT_BASE = 8

interface StashListProps {
  stashes: StashEntry[]
  onContextMenu?: (stash: StashEntry, event: MouseEvent) => void
}

export function StashList({ stashes, onContextMenu }: StashListProps) {
  return (
    <>
      {stashes.map((stash) => (
        <Button
          key={stash.ref}
          variant="plain"
          className={cx(styles.item)}
          style={{ paddingLeft: INDENT_BASE }}
          title={stash.ref}
          onContextMenu={(event) => onContextMenu?.(stash, event)}
        >
          <span className={styles.ref}>{stash.ref}</span>
          <span className={styles.message}>{stash.message || '（メッセージなし）'}</span>
        </Button>
      ))}
    </>
  )
}
