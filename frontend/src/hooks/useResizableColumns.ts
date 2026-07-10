import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

export const COMMIT_HISTORY_COLUMN_IDS = [
  'graph',
  'message',
  'label',
  'date',
  'author',
  'sha',
] as const

export type CommitHistoryColumnId = (typeof COMMIT_HISTORY_COLUMN_IDS)[number]

export const COMMIT_HISTORY_COLUMN_LABELS: Record<CommitHistoryColumnId, string> = {
  graph: 'グラフ',
  message: 'コミットメッセージ',
  label: 'ラベル',
  date: '日付',
  author: 'コミット者',
  sha: 'SHA',
}

const STORAGE_KEY = 'wt-manager.commitHistoryColumnWidths'

const DEFAULT_WIDTHS: Record<CommitHistoryColumnId, number> = {
  graph: 80,
  message: 280,
  label: 120,
  date: 88,
  author: 120,
  sha: 72,
}

const MIN_WIDTHS: Record<CommitHistoryColumnId, number> = {
  graph: 48,
  message: 120,
  label: 80,
  date: 72,
  author: 80,
  sha: 64,
}

function clampColumnWidth(id: CommitHistoryColumnId, width: number): number {
  return Math.max(MIN_WIDTHS[id], Math.round(width))
}

function readWidths(): Record<CommitHistoryColumnId, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_WIDTHS }
    const parsed = JSON.parse(raw) as Partial<Record<CommitHistoryColumnId, number>>
    const widths = { ...DEFAULT_WIDTHS }
    for (const id of COMMIT_HISTORY_COLUMN_IDS) {
      const value = parsed[id]
      if (typeof value === 'number' && Number.isFinite(value)) {
        widths[id] = clampColumnWidth(id, value)
      }
    }
    return widths
  } catch {
    return { ...DEFAULT_WIDTHS }
  }
}

function writeWidths(widths: Record<CommitHistoryColumnId, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // ignore
  }
}

export type ResizableCommitHistoryColumnId = Exclude<CommitHistoryColumnId, 'message'>

export type FixedColumnResizeId = Exclude<CommitHistoryColumnId, 'message' | 'graph'>

export type ColumnResizeMode =
  | { kind: 'flex'; column: 'graph' | 'label'; deltaSign: 1 | -1 }
  | { kind: 'pair'; left: FixedColumnResizeId; right: FixedColumnResizeId }

export function resizeModeForHandle(handleColumnId: CommitHistoryColumnId): ColumnResizeMode | null {
  switch (handleColumnId) {
    case 'graph':
      return { kind: 'flex', column: 'graph', deltaSign: 1 }
    case 'message':
      return { kind: 'flex', column: 'label', deltaSign: -1 }
    case 'label':
      return { kind: 'pair', left: 'label', right: 'date' }
    case 'date':
      return { kind: 'pair', left: 'date', right: 'author' }
    case 'author':
      return { kind: 'pair', left: 'author', right: 'sha' }
    default:
      return null
  }
}

/** @deprecated Use resizeModeForHandle */
export function resizeColumnForHandle(
  handleColumnId: CommitHistoryColumnId,
): FixedColumnResizeId | 'graph' | null {
  const mode = resizeModeForHandle(handleColumnId)
  if (!mode) return null
  if (mode.kind === 'flex') return mode.column
  return mode.left
}

/** @deprecated Use resizeModeForHandle */
export function resizeDeltaForHandle(handleColumnId: CommitHistoryColumnId, delta: number): number {
  const mode = resizeModeForHandle(handleColumnId)
  if (!mode) return delta
  if (mode.kind === 'flex') return mode.deltaSign * delta
  return delta
}

export function applyPairedColumnResize(
  widths: Record<CommitHistoryColumnId, number>,
  left: FixedColumnResizeId,
  right: FixedColumnResizeId,
  delta: number,
): Record<CommitHistoryColumnId, number> | null {
  if (delta === 0) return null

  let nextLeft = widths[left] + delta
  let nextRight = widths[right] - delta

  if (nextLeft < MIN_WIDTHS[left]) {
    const applied = MIN_WIDTHS[left] - widths[left]
    nextLeft = MIN_WIDTHS[left]
    nextRight = widths[right] - applied
  }
  if (nextRight < MIN_WIDTHS[right]) {
    const applied = widths[right] - MIN_WIDTHS[right]
    nextRight = MIN_WIDTHS[right]
    nextLeft = widths[left] + applied
  }

  nextLeft = clampColumnWidth(left, nextLeft)
  nextRight = clampColumnWidth(right, nextRight)

  if (nextLeft === widths[left] && nextRight === widths[right]) {
    return null
  }

  return { ...widths, [left]: nextLeft, [right]: nextRight }
}

export function buildCommitHistoryGridTemplate(
  widths: Record<CommitHistoryColumnId, number>,
): string {
  return [
    `${widths.graph}px`,
    `minmax(${MIN_WIDTHS.message}px, 1fr)`,
    `${widths.label}px`,
    `${widths.date}px`,
    `${widths.author}px`,
    `${widths.sha}px`,
  ].join(' ')
}

export function buildCommitHistoryRowGridTemplate(
  widths: Record<CommitHistoryColumnId, number>,
): string {
  return [
    `minmax(${MIN_WIDTHS.message}px, 1fr)`,
    `${widths.label}px`,
    `${widths.date}px`,
    `${widths.author}px`,
    `${widths.sha}px`,
  ].join(' ')
}

export function useResizableColumns() {
  const [widths, setWidths] = useState(readWidths)
  const [resizingColumn, setResizingColumn] = useState<CommitHistoryColumnId | null>(null)
  const widthsRef = useRef(widths)

  useEffect(() => {
    widthsRef.current = widths
  }, [widths])

  const gridTemplateColumns = useMemo(() => buildCommitHistoryGridTemplate(widths), [widths])
  const rowGridTemplateColumns = useMemo(
    () => buildCommitHistoryRowGridTemplate(widths),
    [widths],
  )

  const columnStyle = useMemo(
    () =>
      ({
        '--col-graph': `${widths.graph}px`,
        '--col-label': `${widths.label}px`,
        '--col-date': `${widths.date}px`,
        '--col-author': `${widths.author}px`,
        '--col-sha': `${widths.sha}px`,
        gridTemplateColumns,
      }) as CSSProperties,
    [gridTemplateColumns, widths],
  )

  const startResize = useCallback(
    (handleColumnId: CommitHistoryColumnId, clientX: number) => {
      const mode = resizeModeForHandle(handleColumnId)
      if (!mode) return

      const startX = clientX
      const startWidths = widthsRef.current
      setResizingColumn(mode.kind === 'pair' ? mode.left : mode.column)

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX
        let next: Record<CommitHistoryColumnId, number> | null = null

        if (mode.kind === 'pair') {
          next = applyPairedColumnResize(startWidths, mode.left, mode.right, delta)
        } else {
          const columnId = mode.column
          const nextWidth = clampColumnWidth(
            columnId,
            startWidths[columnId] + mode.deltaSign * delta,
          )
          if (nextWidth !== startWidths[columnId]) {
            next = { ...startWidths, [columnId]: nextWidth }
          }
        }

        if (!next) return
        widthsRef.current = next
        setWidths(next)
      }

      const onUp = () => {
        setResizingColumn(null)
        writeWidths(widthsRef.current)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [],
  )

  return {
    widths,
    gridTemplateColumns,
    rowGridTemplateColumns,
    columnStyle,
    resizingColumn,
    startResize,
  }
}
