import { useCallback, useMemo } from 'react'
import type { MouseEvent } from 'react'

import type { BranchHead, CommitLogEntry } from '../../types'
import { COMMIT_ROW_HEIGHT } from '../../utils/commitGraph'
import { useResizableColumns } from '../../hooks/useResizableColumns'
import { CommitHistoryGraph } from './CommitHistoryGraph'
import { CommitHistoryHeader } from './CommitHistoryHeader'
import { CommitList } from './CommitList'
import styles from './CommitHistoryTable.module.css'

interface CommitHistoryTableProps {
  commits: CommitLogEntry[]
  labels: BranchHead[]
  selectedSha: string | null
  onSelect: (sha: string) => void
  onContextMenu?: (sha: string, event: MouseEvent) => void
  showGraph?: boolean
  loading?: boolean
  emptyMessage?: string
}

function commitAtGraphY(
  commits: CommitLogEntry[],
  event: MouseEvent<HTMLDivElement>,
): CommitLogEntry | undefined {
  const rect = event.currentTarget.getBoundingClientRect()
  const index = Math.floor((event.clientY - rect.top) / COMMIT_ROW_HEIGHT)
  return commits[index]
}

export function CommitHistoryTable({
  commits,
  labels,
  selectedSha,
  onSelect,
  onContextMenu,
  showGraph = true,
  loading = false,
  emptyMessage = 'コミットがありません',
}: CommitHistoryTableProps) {
  const {
    widths,
    gridTemplateColumns,
    rowGridTemplateColumns,
    resizingColumn,
    startResize,
  } = useResizableColumns()

  const headerGridTemplateColumns = showGraph ? gridTemplateColumns : rowGridTemplateColumns

  const selectedRowIndex = useMemo(() => {
    if (!selectedSha) {
      return -1
    }
    return commits.findIndex((commit) => commit.sha === selectedSha)
  }, [commits, selectedSha])

  const handleGraphClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const commit = commitAtGraphY(commits, event)
      if (commit) {
        onSelect(commit.sha)
      }
    },
    [commits, onSelect],
  )

  const handleGraphContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const commit = commitAtGraphY(commits, event)
      if (commit) {
        onContextMenu?.(commit.sha, event)
      }
    },
    [commits, onContextMenu],
  )

  return (
    <div className={styles.table}>
      <CommitHistoryHeader
        gridTemplateColumns={headerGridTemplateColumns}
        resizingColumn={resizingColumn}
        onResizeStart={startResize}
        showGraph={showGraph}
      />
      {commits.length === 0 ? (
        <p className={styles.empty} aria-live="polite">
          {loading ? 'コミット履歴を読み込み中…' : emptyMessage}
        </p>
      ) : (
        <div className={styles.body}>
          {selectedRowIndex >= 0 && (
            <div
              className={styles.rowHighlight}
              style={{
                top: selectedRowIndex * COMMIT_ROW_HEIGHT,
                height: COMMIT_ROW_HEIGHT,
              }}
              aria-hidden="true"
            />
          )}
          {showGraph ? (
            <div
              className={styles.graphColumn}
              style={{ width: widths.graph }}
              onClick={handleGraphClick}
              onContextMenu={handleGraphContextMenu}
            >
              <CommitHistoryGraph commits={commits} rowHeight={COMMIT_ROW_HEIGHT} />
            </div>
          ) : null}
          <div className={styles.rowsColumn}>
            <CommitList
              commits={commits}
              labels={labels}
              rowHeight={COMMIT_ROW_HEIGHT}
              rowGridTemplateColumns={rowGridTemplateColumns}
              selectedSha={selectedSha}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          </div>
        </div>
      )}
    </div>
  )
}
