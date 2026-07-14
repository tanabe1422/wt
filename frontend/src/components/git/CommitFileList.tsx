import { useMemo, type MouseEvent } from 'react'

import type { CommitFileChange } from '../../types'
import { commitFileMatchesPathQuery } from '../../utils/commitSearchPath'
import { cx } from '../../utils/cx'
import { sortCommitFileChanges } from '../../utils/gitStatus'
import { Button } from '../ui/Button'
import { GitPorcelainIcon } from './GitIcons'
import styles from './CommitFileList.module.css'

interface CommitFileListProps {
  files: CommitFileChange[]
  loading?: boolean
  selectedPath: string | null
  onSelect: (path: string) => void
  onFileHover?: (path: string) => void
  onFileContextMenu?: (entry: CommitFileChange, event: MouseEvent) => void
  /** When set (path search active), matching files are highlighted and sorted to the top. */
  highlightQuery?: string
}

export function CommitFileList({
  files,
  loading = false,
  selectedPath,
  onSelect,
  onFileHover,
  onFileContextMenu,
  highlightQuery = '',
}: CommitFileListProps) {
  const sortedFiles = useMemo(() => {
    const sorted = sortCommitFileChanges(files)
    const q = highlightQuery.trim()
    if (!q) {
      return sorted
    }
    const matched: CommitFileChange[] = []
    const rest: CommitFileChange[] = []
    for (const entry of sorted) {
      if (commitFileMatchesPathQuery(entry, q)) {
        matched.push(entry)
      } else {
        rest.push(entry)
      }
    }
    return [...matched, ...rest]
  }, [files, highlightQuery])

  return (
    <div className={styles.list}>
      {loading ? (
        <p className={styles.empty}>読み込み中…</p>
      ) : sortedFiles.length === 0 ? (
        <p className={styles.empty}>変更ファイルなし</p>
      ) : (
        sortedFiles.map((entry) => {
          const isSelected = selectedPath === entry.path
          const isMatched =
            highlightQuery.trim() !== '' && commitFileMatchesPathQuery(entry, highlightQuery)
          const label =
            entry.oldPath && entry.oldPath !== entry.path
              ? `${entry.oldPath} → ${entry.path}`
              : entry.path
          return (
            <div
              key={`${entry.status}-${entry.path}`}
              className={cx(
                styles.row,
                isMatched && styles.matched,
                isSelected && styles.selected,
              )}
              onMouseEnter={() => onFileHover?.(entry.path)}
              onContextMenu={(event) => onFileContextMenu?.(entry, event)}
            >
              <Button
                type="button"
                tabIndex={-1}
                className={styles.fileButton}
                onClick={() => onSelect(entry.path)}
              >
                <span className={styles.status}>
                  <GitPorcelainIcon code={entry.status} />
                </span>
                <span className={styles.path} title={label}>
                  {label}
                </span>
              </Button>
            </div>
          )
        })
      )}
    </div>
  )
}
