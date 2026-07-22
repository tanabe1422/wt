import type { MouseEvent } from 'react'

import type { BranchHead, CommitLogEntry } from '../../types'
import {
  commitSubject,
  formatCommitDateYmd,
  shortSha,
} from '../../utils/commitGraph'
import { cx } from '../../utils/cx'
import styles from './CommitList.module.css'

interface CommitListProps {
  commits: CommitLogEntry[]
  labels: BranchHead[]
  rowHeight: number
  rowGridTemplateColumns: string
  selectedSha: string | null
  onSelect: (sha: string) => void
  onContextMenu?: (sha: string, event: MouseEvent) => void
}

function labelNamesForCommit(labels: BranchHead[], sha: string): string[] {
  return labels.filter((head) => head.commit.sha === sha).map((head) => head.name)
}

export function CommitList({
  commits,
  labels,
  rowHeight,
  rowGridTemplateColumns,
  selectedSha,
  onSelect,
  onContextMenu,
}: CommitListProps) {
  return (
    <div className={styles.list} role="list">
      {commits.map((commit) => {
        const commitLabels = labelNamesForCommit(labels, commit.sha)
        const isSelected = selectedSha === commit.sha

        return (
          <button
            key={commit.sha}
            type="button"
            role="listitem"
            data-commit-sha={commit.sha}
            className={cx(styles.row, isSelected && styles.selected)}
            style={{ height: rowHeight, gridTemplateColumns: rowGridTemplateColumns }}
            onClick={() => onSelect(commit.sha)}
            onContextMenu={(event) => onContextMenu?.(commit.sha, event)}
          >
            <span className={styles.message}>{commitSubject(commit.commit.message)}</span>
            <span className={styles.labels}>
              {commitLabels.length > 0 ? (
                <>
                  <span className={styles.labelsVisible}>
                    {commitLabels.slice(0, 2).map((name) => (
                      <span key={name} className={styles.label}>
                        {name}
                      </span>
                    ))}
                    {commitLabels.length > 2 && (
                      <span className={styles.labelMore}>+{commitLabels.length - 2}</span>
                    )}
                  </span>
                  <span className={styles.labelsPopover} aria-hidden="true">
                    {commitLabels.map((name) => (
                      <span key={name} className={styles.label}>
                        {name}
                      </span>
                    ))}
                  </span>
                </>
              ) : null}
            </span>
            <span className={styles.date}>{formatCommitDateYmd(commit.commit.author.date)}</span>
            <span className={styles.author}>{commit.commit.author.name}</span>
            <span className={styles.sha}>{shortSha(commit.sha)}</span>
          </button>
        )
      })}
    </div>
  )
}
