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

function circlePositions(html: string): { cx: number; cy: number }[] {
  return [...html.matchAll(/<circle cx="([^"]+)" cy="([^"]+)"/g)].map((match) => ({
    cx: Number(match[1]),
    cy: Number(match[2]),
  }))
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

  it('keeps git log order instead of re-sorting by author date', () => {
    const rowCenterY = (index: number) => index * rowHeight + rowHeight / 2
    const { html } = renderGraph([
    {
      id: 'rebased',
      message: 'rebased',
      author: 'x',
      date: '2026-07-01T10:00:00Z',
      parents: ['main'],
    },
    {
      id: 'main',
      message: 'main',
      author: 'x',
      date: '2026-07-07T12:00:00Z',
      parents: ['base'],
    },
    {
      id: 'base',
      message: 'base',
      author: 'x',
      date: '2026-06-01T00:00:00Z',
      parents: [],
    },
  ])
    const circles = circlePositions(html)
    expect(circles[0]?.cy).toBe(rowCenterY(0))
    expect(circles[1]?.cy).toBe(rowCenterY(1))
    expect(circles[2]?.cy).toBe(rowCenterY(2))
  })

  it('places the first merge parent on the left lane', () => {
    const leftLaneX = padding.left
    const rightLaneX = padding.left + laneWidth
    const rowCenterY = (index: number) => index * rowHeight + rowHeight / 2
    const { html } = renderGraph([
      {
        id: 'M',
        message: 'merge',
        author: 'x',
        date: '2026-07-04T00:00:00Z',
        parents: ['A', 'B'],
      },
      { id: 'A', message: 'a', author: 'x', date: '2026-07-03T00:00:00Z', parents: ['C'] },
      { id: 'B', message: 'b', author: 'x', date: '2026-07-02T00:00:00Z', parents: ['C'] },
      { id: 'C', message: 'c', author: 'x', date: '2026-07-01T00:00:00Z', parents: [] },
    ])
    const circles = circlePositions(html)
    const atRow = (index: number) => circles.find((circle) => circle.cy === rowCenterY(index))
    expect(atRow(0)?.cx).toBe(leftLaneX)
    expect(atRow(1)?.cx).toBe(leftLaneX)
    expect(atRow(2)?.cx).toBe(rightLaneX)
    expect(atRow(3)?.cx).toBe(leftLaneX)
  })
})
