import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

export type SplitOrientation = 'horizontal' | 'vertical'

interface UseResizableSplitOptions {
  storageKey: string
  defaultRatio: number
  minRatio: number
  maxRatio: number
  orientation: SplitOrientation
}

interface UseResizableSplitResult {
  ratio: number
  resizing: boolean
  splitRef: RefObject<HTMLDivElement | null>
  handleResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void
}

function readRatio(
  storageKey: string,
  defaultRatio: number,
  minRatio: number,
  maxRatio: number,
): number {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaultRatio
    const value = Number(raw)
    if (!Number.isFinite(value)) return defaultRatio
    return Math.min(maxRatio, Math.max(minRatio, value))
  } catch {
    return defaultRatio
  }
}

function writeRatio(storageKey: string, ratio: number) {
  try {
    localStorage.setItem(storageKey, String(ratio))
  } catch {
    // ignore
  }
}

function clampRatio(ratio: number, minRatio: number, maxRatio: number) {
  return Math.min(maxRatio, Math.max(minRatio, ratio))
}

export function readStoredSplitRatio(
  storageKey: string,
  defaultRatio: number,
  minRatio: number,
  maxRatio: number,
): number {
  return readRatio(storageKey, defaultRatio, minRatio, maxRatio)
}

export function clampSplitRatio(ratio: number, minRatio: number, maxRatio: number) {
  return clampRatio(ratio, minRatio, maxRatio)
}

export function useResizableSplit({
  storageKey,
  defaultRatio,
  minRatio,
  maxRatio,
  orientation,
}: UseResizableSplitOptions): UseResizableSplitResult {
  const [ratio, setRatio] = useState(() =>
    readRatio(storageKey, defaultRatio, minRatio, maxRatio),
  )
  const [resizing, setResizing] = useState(false)
  const splitRef = useRef<HTMLDivElement>(null)
  const ratioRef = useRef(ratio)

  useEffect(() => {
    ratioRef.current = ratio
  }, [ratio])

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const split = splitRef.current
      if (!split) return

      const startPos = orientation === 'horizontal' ? event.clientX : event.clientY
      const startRatio = ratioRef.current
      const rect = split.getBoundingClientRect()
      const size = orientation === 'horizontal' ? rect.width : rect.height
      if (size <= 0) return

      setResizing(true)

      const onMove = (moveEvent: PointerEvent) => {
        const currentPos =
          orientation === 'horizontal' ? moveEvent.clientX : moveEvent.clientY
        const nextRatio = clampRatio(
          startRatio + (currentPos - startPos) / size,
          minRatio,
          maxRatio,
        )
        ratioRef.current = nextRatio
        setRatio(nextRatio)
      }

      const onUp = () => {
        setResizing(false)
        writeRatio(storageKey, ratioRef.current)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [maxRatio, minRatio, orientation, storageKey],
  )

  return { ratio, resizing, splitRef, handleResizeStart }
}
