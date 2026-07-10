import { useMemo } from 'react'
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
}

export function CommitHistoryTable({
  commits,
  labels,
  selectedSha,
  onSelect,
  onContextMenu,
}: CommitHistoryTableProps) {
  const {
    widths,
    gridTemplateColumns,
    rowGridTemplateColumns,
    resizingColumn,
    startResize,
  } = useResizableColumns()

  const selectedRowIndex = useMemo(() => {
    if (!selectedSha) {
      return -1
    }
    return commits.findIndex((commit) => commit.sha === selectedSha)
  }, [commits, selectedSha])

  if (commits.length === 0) {
    return <p className={styles.empty}>コミットがありません</p>
  }

  return (
    <div className={styles.table}>
      <CommitHistoryHeader
        gridTemplateColumns={gridTemplateColumns}
        resizingColumn={resizingColumn}
        onResizeStart={startResize}
      />
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
        <div className={styles.graphColumn} style={{ width: widths.graph }}>
          <CommitHistoryGraph commits={commits} rowHeight={COMMIT_ROW_HEIGHT} />
        </div>
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
    </div>
  )
}
