import { useEffect, useState, type ReactNode } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

import type { FileDiff } from '../../types'
import { applyDiffLineSelection, isSelectableDiffKind } from '../../utils/diffLineSelection'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import styles from './DiffView.module.css'

/** 半角スペースを · で可視化（コピー時は実スペースのまま） */
function DiffLineText({ content }: { content: string }): ReactNode {
  if (!content.includes(' ')) {
    return content
  }

  const nodes: ReactNode[] = []
  let textStart = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i] === ' ') {
      if (i > textStart) {
        nodes.push(content.slice(textStart, i))
      }
      nodes.push(
        <span key={i} className={styles.space}>
          {' '}
        </span>,
      )
      textStart = i + 1
    }
  }
  if (textStart < content.length) {
    nodes.push(content.slice(textStart))
  }
  return nodes
}

export interface DiffViewProps {
  diff: FileDiff | null
  loading: boolean
  error: string | null
  file: string | null
  staged?: boolean
  conflict?: boolean
  busy?: boolean
  onStageHunk?: (hunkIndex: number) => void
  onUnstageHunk?: (hunkIndex: number) => void
  onDiscardHunk?: (hunkIndex: number) => void
  onStageLines?: (hunkIndex: number, lineIndices: number[]) => void
  onUnstageLines?: (hunkIndex: number, lineIndices: number[]) => void
  onDiscardLines?: (hunkIndex: number, lineIndices: number[]) => void
}

type LineSelection = {
  hunkIndex: number
  lines: Set<number>
  anchor: number | null
}

export function DiffView({
  diff,
  loading,
  error,
  file,
  staged = false,
  conflict = false,
  busy = false,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  onStageLines,
  onUnstageLines,
  onDiscardLines,
}: DiffViewProps) {
  const [selection, setSelection] = useState<LineSelection | null>(null)
  const lineActionsEnabled =
    !conflict && Boolean(onStageLines || onUnstageLines || onDiscardLines)

  useEffect(() => {
    setSelection(null)
  }, [file, staged, diff])

  useEffect(() => {
    if (!lineActionsEnabled || !selection) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelection(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lineActionsEnabled, selection])

  if (!file) {
    return (
      <div className={styles.panel}>
        <p className={styles.placeholder}>ファイルを選択すると diff が表示されます</p>
      </div>
    )
  }

  const diffMatchesFile = diff !== null && diff.path === file
  const showInitialLoading = loading && !diffMatchesFile && !error
  const showStaleWhileLoading = loading && diffMatchesFile

  const selectedForHunk = (hunkIndex: number): number[] => {
    if (!selection || selection.hunkIndex !== hunkIndex) {
      return []
    }
    return [...selection.lines].sort((a, b) => a - b)
  }

  const applyLineSelection = (
    hunkIndex: number,
    lineIndex: number,
    kinds: readonly string[],
    shiftKey: boolean,
    ctrlOrMeta: boolean,
  ) => {
    if (!lineActionsEnabled) {
      return
    }
    setSelection((current) =>
      applyDiffLineSelection({
        kinds,
        hunkIndex,
        lineIndex,
        current,
        shiftKey,
        ctrlOrMeta,
      }),
    )
  }

  const handleLineMouseDown = (event: ReactMouseEvent) => {
    // Prevent native text selection during Shift/Ctrl line picking.
    event.preventDefault()
  }

  const handleLineClick = (
    event: ReactMouseEvent,
    hunkIndex: number,
    lineIndex: number,
    kinds: readonly string[],
  ) => {
    event.preventDefault()
    applyLineSelection(
      hunkIndex,
      lineIndex,
      kinds,
      event.shiftKey,
      event.ctrlKey || event.metaKey,
    )
  }

  const clearSelection = () => setSelection(null)

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.fileName}>{file}</h2>
        {showStaleWhileLoading && (
          <span className={styles.loadingHint} aria-live="polite">
            更新中…
          </span>
        )}
      </header>
      <div className={cx(styles.content, showStaleWhileLoading && styles.contentUpdating)}>
        {showInitialLoading ? (
          <p className={styles.placeholder}>読み込み中…</p>
        ) : error ? (
          <p className={styles.placeholder}>差分を表示できません</p>
        ) : !diffMatchesFile || diff.hunks.length === 0 ? (
          <p className={styles.placeholder}>
            {conflict
              ? '競合中のファイルです。右クリックから「外部ツールで競合を解決」を選んでください。'
              : '差分がありません'}
          </p>
        ) : (
          diff.hunks.map((hunk, index) => {
            const selectedLines = selectedForHunk(index)
            const hasLineSelection = selectedLines.length > 0
            const kinds = hunk.lines.map((line) => line.kind)

            return (
              <section key={`${hunk.header}-${index}`} className={styles.hunk}>
                <div className={styles.hunkHeader}>
                  <span className={styles.hunkRange}>{hunk.header}</span>
                  <div className={styles.hunkActions}>
                    {hasLineSelection ? (
                      <>
                        {!conflict && !staged && onStageLines && (
                          <Button
                            type="button"
                            className={styles.hunkAction}
                            disabled={busy}
                            onClick={() => {
                              onStageLines(index, selectedLines)
                              clearSelection()
                            }}
                          >
                            選択をステージ
                          </Button>
                        )}
                        {!conflict && staged && onUnstageLines && (
                          <Button
                            type="button"
                            className={styles.hunkAction}
                            disabled={busy}
                            onClick={() => {
                              onUnstageLines(index, selectedLines)
                              clearSelection()
                            }}
                          >
                            選択をアンステージ
                          </Button>
                        )}
                        {!conflict && onDiscardLines && (
                          <Button
                            type="button"
                            className={cx(styles.hunkAction, styles.hunkActionDanger)}
                            disabled={busy}
                            onClick={() => {
                              onDiscardLines(index, selectedLines)
                              clearSelection()
                            }}
                          >
                            選択を破棄
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {!conflict && !staged && onStageHunk && (
                          <Button
                            type="button"
                            className={styles.hunkAction}
                            disabled={busy}
                            onClick={() => onStageHunk(index)}
                          >
                            Hunkをステージに移動
                          </Button>
                        )}
                        {!conflict && staged && onUnstageHunk && (
                          <Button
                            type="button"
                            className={styles.hunkAction}
                            disabled={busy}
                            onClick={() => onUnstageHunk(index)}
                          >
                            Hunkをアンステージに移動
                          </Button>
                        )}
                        {!conflict && onDiscardHunk && (
                          <Button
                            type="button"
                            className={cx(styles.hunkAction, styles.hunkActionDanger)}
                            disabled={busy}
                            onClick={() => onDiscardHunk(index)}
                          >
                            Hunkを破棄
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <pre className={cx(styles.lines, lineActionsEnabled && styles.linesInteractive)}>
                  {hunk.lines.map((line, lineIndex) => {
                    const selectable =
                      lineActionsEnabled && isSelectableDiffKind(line.kind)
                    const selected =
                      selection?.hunkIndex === index && selection.lines.has(lineIndex)

                    return (
                      <div
                        key={`${index}-${lineIndex}`}
                        className={cx(
                          styles.line,
                          selectable && styles.lineSelectable,
                          selected && styles.lineSelected,
                        )}
                        onMouseDown={selectable ? handleLineMouseDown : undefined}
                        onClick={
                          selectable
                            ? (event) => handleLineClick(event, index, lineIndex, kinds)
                            : undefined
                        }
                        role={selectable ? 'button' : undefined}
                        tabIndex={selectable ? 0 : undefined}
                        onKeyDown={
                          selectable
                            ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  applyLineSelection(
                                    index,
                                    lineIndex,
                                    kinds,
                                    event.shiftKey,
                                    event.ctrlKey || event.metaKey,
                                  )
                                }
                              }
                            : undefined
                        }
                      >
                        <div className={styles.lineNums}>
                          <span className={styles.lineNo}>
                            {line.oldNo ? String(line.oldNo) : ''}
                          </span>
                          <span className={styles.lineNo}>
                            {line.newNo ? String(line.newNo) : ''}
                          </span>
                        </div>
                        <div
                          className={cx(
                            styles.lineBody,
                            line.kind === 'add' && styles.add,
                            line.kind === 'del' && styles.del,
                          )}
                        >
                          <span className={styles.prefix}>
                            {line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}
                          </span>
                          <span className={styles.text}>
                            <DiffLineText content={line.content} />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </pre>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
