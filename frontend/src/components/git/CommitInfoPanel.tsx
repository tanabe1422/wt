import type { CommitLogEntry } from '../../types'
import { formatCommitDate, shortSha } from '../../utils/commitGraph'
import styles from './CommitInfoPanel.module.css'

interface CommitInfoPanelProps {
  commit: CommitLogEntry
}

export function CommitInfoPanel({ commit }: CommitInfoPanelProps) {
  const { author, message } = commit.commit
  const parents = commit.parents.map((parent) => shortSha(parent.sha)).join(', ')

  return (
    <div className={styles.panel}>
      <dl className={styles.meta}>
        <div className={styles.row}>
          <dt>SHA</dt>
          <dd>{commit.sha}</dd>
        </div>
        <div className={styles.row}>
          <dt>作者</dt>
          <dd>
            {author.name}
            {author.email ? ` <${author.email}>` : ''}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>日付</dt>
          <dd>{formatCommitDate(author.date)}</dd>
        </div>
        {parents && (
          <div className={styles.row}>
            <dt>親</dt>
            <dd className={styles.mono}>{parents}</dd>
          </div>
        )}
      </dl>
      <pre className={styles.message}>{message || '(no message)'}</pre>
    </div>
  )
}
