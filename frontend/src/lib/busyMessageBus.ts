type BusyMessageListener = (message: string) => void

let listener: BusyMessageListener | null = null

/** Seed / update the busy overlay message without re-rendering AppShell. */
export function publishBusyMessage(message: string): void {
  const trimmed = message.trim()
  if (!trimmed) {
    return
  }
  listener?.(trimmed)
}

export function registerBusyMessageListener(fn: BusyMessageListener): () => void {
  listener = fn
  return () => {
    if (listener === fn) {
      listener = null
    }
  }
}
