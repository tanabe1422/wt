import type { MouseEvent } from 'react'

import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { FolderIcon } from '../sidebar/BranchIcons'
import type { FileStatus } from '../../types'
import { formatFileStatusPath } from '../../utils/gitPaths'
import { cx } from '../../utils/cx'
import { isConflict } from '../../lib/wails'
import { GitChangeIcon, GitPorcelainIcon, porcelainToChangeType } from './GitIcons'
import styles from './FileList.module.css'

interface FileListProps {
  files: FileStatus[]
  mode: 'staged' | 'unstaged'
  loading?: boolean
  selectedPaths: ReadonlySet<string>
  focusPath: string | null
  onFileClick: (path: string, index: number, event: MouseEvent) => void
  onFileContextMenu?: (entry: FileStatus, event: MouseEvent) => void
  onStage?: (path: string) => void
  onUnstage?: (path: string) => void
}

function statusCode(entry: FileStatus, mode: 'staged' | 'unstaged'): string {
  if (isConflict(entry)) {
    return 'U'
  }
  return mode === 'staged' ? entry.index : entry.workTree
}

export function FileList({
  files,
  mode,
  loading = false,
  selectedPaths,
  focusPath,
  onFileClick,
  onFileContextMenu,
  onStage,
  onUnstage,
}: FileListProps) {
  return (
    <div className={styles.list}>
      {loading ? (
        <p className={styles.empty}>読み込み中…</p>
      ) : files.length === 0 ? (
        <p className={styles.empty}>変更なし</p>
      ) : (
        files.map((entry, index) => {
          const isSelected = selectedPaths.has(entry.path)
          const isFocus = focusPath === entry.path
          const code = statusCode(entry, mode)
          const conflict = isConflict(entry)
          const showStage = mode === 'unstaged' && onStage && !conflict
          const showUnstage = mode === 'staged' && onUnstage
          return (
            <div
              key={`${mode}-${entry.path}`}
              className={cx(styles.row, isSelected && styles.selected, isFocus && styles.focused)}
              onContextMenu={(event) => onFileContextMenu?.(entry, event)}
            >
              <Button
                type="button"
                tabIndex={-1}
                className={styles.fileButton}
                onClick={(event) => onFileClick(entry.path, index, event)}
              >
                <span className={styles.status}>
                  {conflict ? (
                    <GitChangeIcon type="conflict" />
                  ) : porcelainToChangeType(code) ? (
                    <GitPorcelainIcon code={code} />
                  ) : null}
                </span>
                <span className={styles.path}>
                  <span className={styles.pathText}>{formatFileStatusPath(entry)}</span>
                  {entry.isDirectory && (
                    <span className={styles.dirMarker} title="ディレクトリ" aria-hidden="true">
                      <FolderIcon />
                    </span>
                  )}
                </span>
              </Button>
              {showUnstage && (
                <IconButton
                  size="sm"
                  tabIndex={-1}
                  className={styles.action}
                  title="アンステージ"
                  aria-label="アンステージ"
                  onClick={(event) => {
                    event.stopPropagation()
                    onUnstage(entry.path)
                  }}
                >
                  −
                </IconButton>
              )}
              {showStage && (
                <IconButton
                  size="sm"
                  tabIndex={-1}
                  className={styles.action}
                  title="ステージ"
                  aria-label="ステージ"
                  onClick={(event) => {
                    event.stopPropagation()
                    onStage(entry.path)
                  }}
                >
                  +
                </IconButton>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
