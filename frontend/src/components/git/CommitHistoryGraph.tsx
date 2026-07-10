import { useMemo } from 'react'

import { COMMIT_ROW_HEIGHT, GRAPH_NODE_RADIUS, toGraphCommits } from '../../utils/commitGraph'
import type { CommitLogEntry } from '../../types'
import { GitGraph } from './graph/GitGraph'
import styles from './CommitHistoryGraph.module.css'

const GRAPH_COLOR_PALETTE = ['#0891b2', '#2563eb', '#16a34a', '#db2777', '#f59e0b']

interface CommitHistoryGraphProps {
  commits: CommitLogEntry[]
  rowHeight?: number
}

export function CommitHistoryGraph({
  commits,
  rowHeight = COMMIT_ROW_HEIGHT,
}: CommitHistoryGraphProps) {
  const graphCommits = useMemo(() => toGraphCommits(commits), [commits])

  if (graphCommits.length === 0) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <GitGraph
        commits={graphCommits}
        rowHeight={rowHeight}
        laneWidth={14}
        padding={{ top: 0, right: 4, bottom: 0, left: 12 }}
        colorPalette={GRAPH_COLOR_PALETTE}
        renderNode={(x, y, color, commit) => (
          <circle key={`${commit.id}-node`} cx={x} cy={y} r={GRAPH_NODE_RADIUS} fill={color} />
        )}
      />
    </div>
  )
}
