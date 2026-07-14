import { useMemo, type MouseEvent } from 'react'

import type { CommitFileChange } from '../../types'
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
}

export function CommitFileList({
  files,
  loading = false,
  selectedPath,
  onSelect,
  onFileHover,
  onFileContextMenu,
}: CommitFileListProps) {
  const sortedFiles = useMemo(() => sortCommitFileChanges(files), [files])

  return (
    <div className={styles.list}>
      {loading ? (
        <p className={styles.empty}>読み込み中…</p>
      ) : sortedFiles.length === 0 ? (
        <p className={styles.empty}>変更ファイルなし</p>
      ) : (
        sortedFiles.map((entry) => {
          const isSelected = selectedPath === entry.path
          const label =
            entry.oldPath && entry.oldPath !== entry.path
              ? `${entry.oldPath} → ${entry.path}`
              : entry.path
          return (
            <div
              key={`${entry.status}-${entry.path}`}
              className={cx(styles.row, isSelected && styles.selected)}
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
