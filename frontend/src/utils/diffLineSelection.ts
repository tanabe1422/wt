/** Whether a diff line kind can be selected for stage/discard. */
export function isSelectableDiffKind(kind: string): boolean {
  return kind === 'add' || kind === 'del'
}

/**
 * Toggle a single line in the selection set.
 * Returns a new Set (does not mutate).
 */
export function toggleLineSelection(selected: ReadonlySet<number>, lineIndex: number): Set<number> {
  const next = new Set(selected)
  if (next.has(lineIndex)) {
    next.delete(lineIndex)
  } else {
    next.add(lineIndex)
  }
  return next
}

/**
 * Select all add/del lines in the inclusive range [from, to] within kinds[].
 * Context lines are skipped. Returns a new Set that replaces the previous selection.
 */
export function rangeSelectAddDel(
  kinds: readonly string[],
  from: number,
  to: number,
): Set<number> {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const next = new Set<number>()
  for (let i = lo; i <= hi; i++) {
    if (i >= 0 && i < kinds.length && isSelectableDiffKind(kinds[i]!)) {
      next.add(i)
    }
  }
  return next
}

export type DiffLineSelectionState = {
  hunkIndex: number
  lines: Set<number>
  anchor: number | null
}

/**
 * List-style selection:
 * - plain click → single select (click sole selected line again → clear)
 * - Shift → range from anchor (same hunk)
 * - Ctrl/Meta → toggle (non-contiguous, can skip lines)
 */
export function applyDiffLineSelection(options: {
  kinds: readonly string[]
  hunkIndex: number
  lineIndex: number
  current: {
    hunkIndex: number
    lines: ReadonlySet<number>
    anchor: number | null
  } | null
  shiftKey: boolean
  ctrlOrMeta: boolean
}): DiffLineSelectionState | null {
  const { kinds, hunkIndex, lineIndex, current, shiftKey, ctrlOrMeta } = options
  if (!isSelectableDiffKind(kinds[lineIndex]!)) {
    return current
      ? { hunkIndex: current.hunkIndex, lines: new Set(current.lines), anchor: current.anchor }
      : null
  }

  if (shiftKey) {
    const sameHunk = current?.hunkIndex === hunkIndex
    const anchor = sameHunk && current.anchor != null ? current.anchor : lineIndex
    return {
      hunkIndex,
      lines: rangeSelectAddDel(kinds, anchor, lineIndex),
      anchor,
    }
  }

  if (ctrlOrMeta) {
    if (current?.hunkIndex === hunkIndex) {
      const lines = toggleLineSelection(current.lines, lineIndex)
      if (lines.size === 0) {
        return null
      }
      return { hunkIndex, lines, anchor: lineIndex }
    }
    return { hunkIndex, lines: new Set([lineIndex]), anchor: lineIndex }
  }

  // Plain click: click the sole selected line again → clear; otherwise select only that line.
  if (
    current?.hunkIndex === hunkIndex &&
    current.lines.size === 1 &&
    current.lines.has(lineIndex)
  ) {
    return null
  }

  return { hunkIndex, lines: new Set([lineIndex]), anchor: lineIndex }
}
