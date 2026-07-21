import { useCallback, useEffect, useState } from 'react'

export type BusyChangeHandler = (busy: boolean, message?: string) => void

export function useBusy(onBusyChange?: BusyChangeHandler) {
  const [busy, setBusy] = useState(false)

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const runBusy = useCallback(
    async (action: () => Promise<void>, message?: string) => {
      setBusy(true)
      onBusyChange?.(true, message)
      try {
        await action()
      } finally {
        setBusy(false)
        onBusyChange?.(false)
      }
    },
    [onBusyChange],
  )

  return { busy, runBusy }
}
