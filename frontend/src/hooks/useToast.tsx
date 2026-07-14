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
import { createPortal } from 'react-dom'

import { ToastHost, type ToastItem, type ToastVariant } from '../components/ui/Toast'
import toastStyles from '../components/ui/Toast.module.css'

const SUCCESS_DURATION_MS = 1000

interface ToastApi {
  success: (message: string) => string
  progress: (id: string, message: string) => void
  dismiss: (id: string) => void
}

interface ToastRootApi {
  setToastRoot: (el: HTMLElement | null) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const ToastRootContext = createContext<ToastRootApi | null>(null)

let toastSeq = 0

function nextId(prefix: string): string {
  toastSeq += 1
  return `${prefix}-${toastSeq}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [toastRoot, setToastRootState] = useState<HTMLElement | null>(null)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const setToastRoot = useCallback((el: HTMLElement | null) => {
    setToastRootState(el)
  }, [])

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

  const rootApi = useMemo<ToastRootApi>(() => ({ setToastRoot }), [setToastRoot])

  const host = toastRoot ? (
    createPortal(<ToastHost items={items} onDismiss={dismiss} />, toastRoot)
  ) : items.length > 0 ? (
    <div className={toastStyles.hostFixed}>
      <ToastHost items={items} onDismiss={dismiss} />
    </div>
  ) : null

  return (
    <ToastContext.Provider value={api}>
      <ToastRootContext.Provider value={rootApi}>
        {children}
        {host}
      </ToastRootContext.Provider>
    </ToastContext.Provider>
  )
}

/** MainLayout のメイン領域に置き、トーストをツールバー下・中央上部へ出す */
export function ToastRoot() {
  const rootApi = useContext(ToastRootContext)
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      rootApi?.setToastRoot(el)
    },
    [rootApi],
  )

  if (!rootApi) {
    return null
  }

  return <div className={toastStyles.host} ref={setRef} />
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return api
}
