import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { ToastHost, type ToastItem, type ToastVariant } from '../components/ui/Toast'

const SUCCESS_DURATION_MS = 3000

interface ToastApi {
  success: (message: string) => string
  progress: (id: string, message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let toastSeq = 0

function nextId(prefix: string): string {
  toastSeq += 1
  return `${prefix}-${toastSeq}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
    },
    [clearTimer],
  )

  const upsert = useCallback(
    (id: string, message: string, variant: ToastVariant, autoDismiss: boolean) => {
      clearTimer(id)
      setItems((prev) => {
        const next: ToastItem = { id, message, variant }
        const index = prev.findIndex((item) => item.id === id)
        if (index === -1) {
          return [...prev, next]
        }
        const copy = [...prev]
        copy[index] = next
        return copy
      })
      if (autoDismiss) {
        const timer = setTimeout(() => dismiss(id), SUCCESS_DURATION_MS)
        timersRef.current.set(id, timer)
      }
    },
    [clearTimer, dismiss],
  )

  const success = useCallback(
    (message: string) => {
      const id = nextId('success')
      upsert(id, message, 'success', true)
      return id
    },
    [upsert],
  )

  const progress = useCallback(
    (id: string, message: string) => {
      upsert(id, message, 'progress', false)
    },
    [upsert],
  )

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success,
      progress,
      dismiss,
    }),
    [success, progress, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return api
}
