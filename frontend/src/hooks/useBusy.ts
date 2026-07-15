import { useCallback, useEffect, useState } from 'react'

export type BusyChangeHandler = (busy: boolean, message?: string) => void

export function useBusy(onBusyChange?: BusyChangeHandler) {
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  const runBusy = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, runBusy }
}
