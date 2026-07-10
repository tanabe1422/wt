import { useEffect, useState } from 'react'

export function useErrorDialog(error: string | null) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [error])

  return {
    open: error !== null && !dismissed,
    message: error ?? '',
    dismiss: () => setDismissed(true),
  }
}
