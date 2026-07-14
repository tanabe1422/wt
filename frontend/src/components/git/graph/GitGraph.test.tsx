import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { GRAPH_NODE_RADIUS } from '../../../utils/commitGraph'
import { GitGraph, type GraphCommitItem } from './GitGraph'

const padding = { top: 0, right: 4, bottom: 0, left: 12 }
const rowHeight = 26
const laneWidth = 14

function renderGraph(commits: GraphCommitItem[]) {
  const html = renderToStaticMarkup(
    createElement(GitGraph, {
      commits,
      rowHeight,
      laneWidth,
      padding,
    }),
  )
  const paths = [...html.matchAll(/d="([^"]+)"/g)].map((match) => match[1])
  const circles = [...html.matchAll(/<circle/g)].length
  const width = Number(html.match(/width="(\d+(?:\.\d+)?)"/)?.[1] ?? NaN)
  const height = Number(html.match(/height="(\d+(?:\.\d+)?)"/)?.[1] ?? NaN)
  return { html, paths, circles, width, height }
}

describe('GitGraph', () => {
  it('draws edges for a full parent chain', () => {
    const { paths, circles } = renderGraph([
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: ['B'] },
      { id: 'B', message: 'b', author: 'x', date: '2026-07-02T00:00:00Z', parents: ['C'] },
      { id: 'C', message: 'c', author: 'x', date: '2026-07-01T00:00:00Z', parents: [] },
    ])
    expect(circles).toBe(3)
    expect(paths).toHaveLength(2)
  })

  it('extends unfinished lanes to the graph bottom when parents are outside the window', () => {
    const { paths, circles, height } = renderGraph([
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: ['B'] },
      { id: 'B', message: 'b', author: 'x', date: '2026-07-02T00:00:00Z', parents: ['C'] },
    ])
    expect(circles).toBe(2)
    // A→B plus stub B→(missing C) down to the bottom
    expect(paths).toHaveLength(2)
    expect(paths.some((d) => d.includes(`L ${padding.left} ${height}`))).toBe(true)
  })

  it('draws a stub from a single commit whose parent is not loaded', () => {
    const { paths, circles, height } = renderGraph([
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: ['B'] },
    ])
    expect(circles).toBe(1)
    expect(paths).toHaveLength(1)
    expect(paths[0]).toContain(`L ${padding.left} ${height}`)
  })

  it('keeps a merge stub when the second parent is outside the window', () => {
    const { paths, circles } = renderGraph([
      { id: 'M', message: 'merge', author: 'x', date: '2026-07-04T00:00:00Z', parents: ['A', 'X'] },
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: ['B'] },
    ])
    expect(circles).toBe(2)
    // M→A, stub for missing X, stub for missing B
    expect(paths).toHaveLength(3)
  })

  it('includes node radius in svg width and uses computed width immediately', () => {
    const { width } = renderGraph([
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: [] },
    ])
    expect(width).toBe(padding.left + GRAPH_NODE_RADIUS + padding.right)
  })
})
