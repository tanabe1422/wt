import { useMemo, type ReactNode } from 'react'

import { GRAPH_NODE_RADIUS } from '../../../utils/commitGraph'

import { getCurveBottom, getCurveTop } from './gitGraphCurves'

export interface GraphCommitItem {
  id: string
  message: string
  author: string
  date: string
  parents: string[]
  meta?: {
    yIndex: number
    prev: string[]
  }
}

interface Padding {
  left: number
  right: number
  top: number
  bottom: number
}

interface BranchState {
  color: string
  xIndex: number
  lastxy: { x: number; y: number }
  pathStr: string
  toBeClosed?: string[]
  from: GraphCommitItem
}

type BranchPool = Record<string, BranchState>

interface CompletedPath {
  d: string
  color: string
  from: GraphCommitItem
  to: GraphCommitItem
}

export interface GitGraphProps {
  commits: GraphCommitItem[]
  colorPalette?: string[]
  padding?: Padding | number
  rowHeight?: number
  laneWidth?: number
  renderNode?: (x: number, y: number, color: string, commit: GraphCommitItem) => ReactNode
  renderEdge?: (
    from: GraphCommitItem,
    to: GraphCommitItem,
    d: string,
    color: string,
  ) => ReactNode
}

const DEFAULT_COLORS = ['#0891b2', '#2563eb', '#16a34a', '#db2777', '#f59e0b']
const DEFAULT_ROW_HEIGHT = 36
const DEFAULT_LANE_WIDTH = 14
const DEFAULT_PADDING = 8
const EDGE_WIDTH = 2

function normalizePadding(padding?: Padding | number): Padding {
  if (typeof padding === 'number') {
    return { left: padding, right: padding, top: padding, bottom: padding }
  }
  return (
    padding ?? {
      left: DEFAULT_PADDING,
      right: 4,
      top: 0,
      bottom: 0,
    }
  )
}

function buildGraph(
  commits: GraphCommitItem[],
  options: {
    colorPalette: string[]
    rowHeight: number
    laneWidth: number
    padding: Padding
    renderNode?: GitGraphProps['renderNode']
    renderEdge?: GitGraphProps['renderEdge']
  },
): { nodes: ReactNode[]; edges: ReactNode[]; width: number } {
  const { colorPalette, rowHeight, laneWidth, padding, renderNode, renderEdge } = options
  const nodes: ReactNode[] = []
  const edges: ReactNode[] = []
  const branchPool: BranchPool = {}
  const completedPaths: CompletedPath[] = []
  let colorCounter = 0
  let maxWidth = 0

  const rowCenterY = (index: number) => index * rowHeight + rowHeight / 2 + padding.top

  function assignNewBranch() {
    const occupied = new Set(Object.values(branchPool).map((branch) => branch.xIndex))
    let lane = 0
    while (occupied.has(lane)) {
      lane += 1
    }
    return {
      color: colorPalette[colorCounter++ % colorPalette.length],
      xIndex: lane,
    }
  }

  function compactLanes() {
    const occupiedLanes = new Set<number>()
    for (const key of Object.keys(branchPool)) {
      if (key.startsWith('merge_')) {
        occupiedLanes.add(branchPool[key].xIndex)
      }
    }

    const realBranches = Object.keys(branchPool)
      .filter((key) => !key.startsWith('merge_'))
      .map((key) => branchPool[key])
      .sort((a, b) => a.xIndex - b.xIndex)

    for (const branch of realBranches) {
      let targetLane = 0
      while (occupiedLanes.has(targetLane)) {
        targetLane += 1
      }
      if (targetLane < branch.xIndex) {
        branch.xIndex = targetLane
      }
      occupiedLanes.add(branch.xIndex)
    }
  }

  function drawActiveBranches(currentY: number, skipCommitId: string) {
    const skipKeys = new Set<string>()
    const terminatingBranch = branchPool[skipCommitId]
    if (terminatingBranch) {
      skipKeys.add(skipCommitId)
      terminatingBranch.toBeClosed?.forEach((key) => skipKeys.add(key))
    }

    for (const [key, info] of Object.entries(branchPool)) {
      if (skipKeys.has(key)) {
        continue
      }
      const targetX = info.xIndex * laneWidth + padding.left
      maxWidth = Math.max(maxWidth, targetX)
      if (info.lastxy.y !== currentY) {
        if (info.lastxy.x !== targetX) {
          info.pathStr += getCurveTop(info.lastxy.x, info.lastxy.y, targetX, currentY)
        } else {
          info.pathStr += ` L ${targetX} ${currentY}`
        }
        info.lastxy = { x: targetX, y: currentY }
      }
    }
  }

  function processNode(commit: GraphCommitItem, yIndex: number) {
    const arrivingBranch = branchPool[commit.id]
    let currentLane = 0
    let currentColor = ''

    if (!arrivingBranch) {
      const newBranch = assignNewBranch()
      currentLane = newBranch.xIndex
      currentColor = newBranch.color
    } else {
      currentLane = arrivingBranch.xIndex
      currentColor = arrivingBranch.color
    }

    const x = currentLane * laneWidth + padding.left
    const y = rowCenterY(yIndex)
    maxWidth = Math.max(maxWidth, x)

    drawActiveBranches(y, commit.id)

    if (arrivingBranch) {
      if (arrivingBranch.lastxy.y !== y || arrivingBranch.lastxy.x !== x) {
        arrivingBranch.pathStr += getCurveBottom(
          arrivingBranch.lastxy.x,
          arrivingBranch.lastxy.y,
          x,
          y,
        )
      }
      completedPaths.push({
        d: arrivingBranch.pathStr,
        color: arrivingBranch.color,
        from: arrivingBranch.from,
        to: commit,
      })

      arrivingBranch.toBeClosed?.forEach((key) => {
        const mergingBranch = branchPool[key]
        if (!mergingBranch) {
          return
        }
        if (mergingBranch.lastxy.y !== y || mergingBranch.lastxy.x !== x) {
          mergingBranch.pathStr += getCurveBottom(
            mergingBranch.lastxy.x,
            mergingBranch.lastxy.y,
            x,
            y,
          )
        }
        completedPaths.push({
          d: mergingBranch.pathStr,
          color: mergingBranch.color,
          from: mergingBranch.from,
          to: commit,
        })
        delete branchPool[key]
      })
      delete branchPool[commit.id]
    }

    if (renderNode) {
      nodes.push(
        <g key={`node-${commit.id}`}>{renderNode(x, y, currentColor, commit)}</g>,
      )
    } else {
      nodes.push(
        <circle key={`node-${commit.id}`} cx={x} cy={y} r={GRAPH_NODE_RADIUS} fill={currentColor} />,
      )
    }

    if ((commit.parents?.length ?? 0) === 0) {
      compactLanes()
      return
    }

    const primaryParentId = commit.parents[0]
    if (!branchPool[primaryParentId]) {
      branchPool[primaryParentId] = {
        color: currentColor,
        xIndex: currentLane,
        lastxy: { x, y },
        pathStr: `M ${x} ${y}`,
        from: commit,
      }
    } else {
      const existing = branchPool[primaryParentId]
      if (currentLane < existing.xIndex) {
        const dummyKey = `merge_${commit.id}_${primaryParentId}_${existing.xIndex}`
        branchPool[dummyKey] = existing
        branchPool[primaryParentId] = {
          color: currentColor,
          xIndex: currentLane,
          lastxy: { x, y },
          pathStr: `M ${x} ${y}`,
          toBeClosed: existing.toBeClosed ? [...existing.toBeClosed, dummyKey] : [dummyKey],
          from: commit,
        }
        delete existing.toBeClosed
      } else {
        const dummyKey = `merge_${commit.id}_${primaryParentId}_${currentLane}`
        branchPool[dummyKey] = {
          color: currentColor,
          xIndex: currentLane,
          lastxy: { x, y },
          pathStr: `M ${x} ${y}`,
          from: commit,
        }
        if (!branchPool[primaryParentId].toBeClosed) {
          branchPool[primaryParentId].toBeClosed = []
        }
        branchPool[primaryParentId].toBeClosed.push(dummyKey)
      }
    }

    for (let index = 1; index < commit.parents.length; index += 1) {
      const parentId = commit.parents[index]
      const targetLane = currentLane + index
      for (const branch of Object.values(branchPool)) {
        if (branch.xIndex >= targetLane) {
          branch.xIndex += 1
        }
      }

      const incomingBranch: BranchState = {
        color: colorPalette[colorCounter++ % colorPalette.length],
        xIndex: targetLane,
        lastxy: { x, y },
        pathStr: `M ${x} ${y}`,
        from: commit,
      }

      if (!branchPool[parentId]) {
        branchPool[parentId] = incomingBranch
      } else {
        const dummyKey = `merge_${commit.id}_${parentId}_${targetLane}`
        incomingBranch.color = branchPool[parentId].color
        branchPool[dummyKey] = incomingBranch
        if (!branchPool[parentId].toBeClosed) {
          branchPool[parentId].toBeClosed = []
        }
        branchPool[parentId].toBeClosed.push(dummyKey)
      }
    }

    compactLanes()
  }

  // Keep git log order (topo-order, newest first). Do not mutate input commits.
  commits.forEach((commit, index) => processNode(commit, index))

  // Parents outside the loaded window leave unfinished lanes in branchPool.
  // Extend those stubs to the bottom of the graph so lines don't look cut off.
  const endY = commits.length * rowHeight + padding.top
  for (const [key, info] of Object.entries(branchPool)) {
    const targetX = info.xIndex * laneWidth + padding.left
    maxWidth = Math.max(maxWidth, targetX)
    if (info.lastxy.y !== endY || info.lastxy.x !== targetX) {
      if (info.lastxy.x !== targetX) {
        info.pathStr += getCurveTop(info.lastxy.x, info.lastxy.y, targetX, endY)
      } else {
        info.pathStr += ` L ${targetX} ${endY}`
      }
    }
    completedPaths.push({
      d: info.pathStr,
      color: info.color,
      from: info.from,
      to: { id: key, message: '', author: '', date: '', parents: [] },
    })
  }

  for (const path of completedPaths) {
    if (renderEdge) {
      edges.push(
        <g key={`edge-${path.from.id}-${path.to.id}`}>
          {renderEdge(path.from, path.to, path.d, path.color)}
        </g>,
      )
    } else {
      edges.push(
        <path
          key={`edge-${path.from.id}-${path.to.id}`}
          d={path.d}
          stroke={path.color}
          strokeWidth={EDGE_WIDTH}
          fill="none"
        />,
      )
    }
  }

  return { nodes, edges, width: maxWidth + GRAPH_NODE_RADIUS + padding.right }
}

export function GitGraph({
  commits,
  colorPalette = DEFAULT_COLORS,
  padding,
  rowHeight = DEFAULT_ROW_HEIGHT,
  laneWidth = DEFAULT_LANE_WIDTH,
  renderNode,
  renderEdge,
}: GitGraphProps) {
  const resolvedPadding = normalizePadding(padding)

  const { nodes, edges, width } = useMemo(
    () =>
      buildGraph(commits, {
        colorPalette,
        rowHeight,
        laneWidth,
        padding: resolvedPadding,
        renderNode,
        renderEdge,
      }),
    [commits, colorPalette, rowHeight, laneWidth, resolvedPadding, renderNode, renderEdge],
  )

  if (commits.length === 0) {
    return null
  }

  return (
    <svg
      width={width}
      height={
        commits.length * rowHeight + resolvedPadding.top + resolvedPadding.bottom
      }
      aria-hidden="true"
    >
      {edges}
      {nodes}
    </svg>
  )
}
