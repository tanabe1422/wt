import { memo, useCallback, useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'

import type { FileDiff } from '../../types'
import { applyDiffLineSelection, isSelectableDiffKind } from '../../utils/diffLineSelection'
import { cx } from '../../utils/cx'
import { Button } from '../ui/Button'
import styles from './DiffView.module.css'

/** 半角スペースを薄い · で可視化（コピー時は実スペース）。連続スペースは 1 span にまとめる。 */
const DiffLineText = memo(function DiffLineText({ content }: { content: string }) {
  const display = content.includes(' ')
    ? content.split(/( +)/).map((part, index) =>
        part.startsWith(' ') ? (
          <span key={index} className={styles.space}>
            {part.replaceAll(' ', '·')}
          </span>
        ) : (
          part
        ),
      )
    : content
  return (
    <span
      className={styles.text}
      onCopy={(event) => {
        event.clipboardData.setData('text/plain', content)
        event.preventDefault()
      }}
    >
      {display}
    </span>
  )
})

type DiffLineRowProps = {
  hunkIndex: number
  lineIndex: number
  kind: string
  oldNo?: number
  newNo?: number
  content: string
  selectable: boolean
  selected: boolean
  kinds: readonly string[]
  onMouseDown: (event: ReactMouseEvent) => void
  onClick: (
    event: ReactMouseEvent,
    hunkIndex: number,
    lineIndex: number,
    kinds: readonly string[],
  ) => void
  onApplySelection: (
    hunkIndex: number,
    lineIndex: number,
    kinds: readonly string[],
    shiftKey: boolean,
    ctrlOrMeta: boolean,
  ) => void
}

const DiffLineRow = memo(function DiffLineRow({
  hunkIndex,
  lineIndex,
  kind,
  oldNo,
  newNo,
  content,
  selectable,
  selected,
  kinds,
  onMouseDown,
  onClick,
  onApplySelection,
}: DiffLineRowProps) {
  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onApplySelection(
        hunkIndex,
        lineIndex,
        kinds,
        event.shiftKey,
        event.ctrlKey || event.metaKey,
      )
    }
  }

  return (
    <div
      className={cx(
        styles.line,
        selectable && styles.lineSelectable,
        selected && styles.lineSelected,
      )}
      onMouseDown={selectable ? onMouseDown : undefined}
      onClick={
        selectable ? (event) => onClick(event, hunkIndex, lineIndex, kinds) : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
    >
      <div className={styles.lineNums}>
        <span className={styles.lineNo}>{oldNo ? String(oldNo) : ''}</span>
        <span className={styles.lineNo}>{newNo ? String(newNo) : ''}</span>
      </div>
      <div
        className={cx(
          styles.lineBody,
          kind === 'add' && styles.add,
          kind === 'del' && styles.del,
        )}
      >
        <span className={styles.prefix}>{kind === 'add' ? '+' : kind === 'del' ? '-' : ' '}</span>
        <DiffLineText content={content} />
      </div>
    </div>
  )
})

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

  const applyLineSelection = useCallback(
    (
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
    },
    [lineActionsEnabled],
  )

  const handleLineMouseDown = useCallback((event: ReactMouseEvent) => {
    // Prevent native text selection during Shift/Ctrl line picking.
    event.preventDefault()
  }, [])

  const handleLineClick = useCallback(
    (
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
    },
    [applyLineSelection],
  )

  const clearSelection = useCallback(() => setSelection(null), [])

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
        ) : !diffMatchesFile || !diff.hunks || diff.hunks.length === 0 ? (
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
                      <DiffLineRow
                        key={`${index}-${lineIndex}`}
                        hunkIndex={index}
                        lineIndex={lineIndex}
                        kind={line.kind}
                        oldNo={line.oldNo}
                        newNo={line.newNo}
                        content={line.content}
                        selectable={selectable}
                        selected={selected}
                        kinds={kinds}
                        onMouseDown={handleLineMouseDown}
                        onClick={handleLineClick}
                        onApplySelection={applyLineSelection}
                      />
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
