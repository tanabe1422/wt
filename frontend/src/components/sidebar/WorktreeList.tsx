import type { MouseEvent } from 'react'

import type { WorktreeEntry } from '../../types'
import { cx } from '../../utils/cx'
import { formatDetachedLabel, isDetachedWorktree } from '../../utils/detachedHead'
import { Button } from '../ui/Button'
import { CountBadge } from '../ui/CountBadge'
import { ActiveMark } from './ActiveMark'
import { FolderIcon } from './BranchIcons'
import styles from './WorktreeList.module.css'

const INDENT_BASE = 8

function baseName(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

interface WorktreeListProps {
  worktrees: WorktreeEntry[]
  selectedWorktree: string | null
  onSelect: (path: string) => void
  onContextMenu?: (worktree: WorktreeEntry, event: MouseEvent) => void
}

export function WorktreeList({
  worktrees,
  selectedWorktree,
  onSelect,
  onContextMenu,
}: WorktreeListProps) {
  return (
    <>
      {worktrees.map((worktree) => {
        const isSelected = selectedWorktree === worktree.path
        const branchLabel = isDetachedWorktree(worktree)
          ? formatDetachedLabel(worktree.head)
          : worktree.branch

        return (
          <Button
            key={worktree.path}
            variant="plain"
            className={cx(styles.item, isSelected && styles.selected)}
            style={{ paddingLeft: INDENT_BASE }}
            title={worktree.path}
            onClick={() => onSelect(worktree.path)}
            onContextMenu={(event) => onContextMenu?.(worktree, event)}
          >
            <ActiveMark
              active={isSelected}
              title="選択中のワークツリー"
              className={styles.activeMark}
            />
            <span className={styles.folderIcon}>
              <FolderIcon />
            </span>
            <span className={styles.labelGroup}>
              <span className={styles.nameRow}>
                <span className={styles.name}>{baseName(worktree.path)}</span>
                {worktree.isMain && <span className={styles.badge}>メイン</span>}
              </span>
              <span className={styles.branch}>{branchLabel}</span>
            </span>
            <span className={styles.badgeGroup}>
              <CountBadge count={worktree.changedFileCount} variant="changes" />
            </span>
          </Button>
        )
      })}
    </>
  )
}
