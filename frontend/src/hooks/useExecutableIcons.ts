import { useEffect, useMemo, useState } from 'react'

import { getExecutableIconDataURL } from '../lib/wails'

/** Loads Windows exe icons as PNG data URLs, keyed by command/path. */
export function useExecutableIcons(paths: string[]) {
  const key = useMemo(() => {
    const unique = [...new Set(paths.map((path) => path.trim()).filter(Boolean))]
    unique.sort()
    return unique.join('\0')
  }, [paths])

  const [icons, setIcons] = useState<Record<string, string>>({})

  useEffect(() => {
    const unique = key ? key.split('\0') : []
    if (unique.length === 0) {
      setIcons({})
      return
    }

    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        unique.map(async (path) => {
          try {
            const url = await getExecutableIconDataURL(path)
            return url ? ([path, url] as const) : null
          } catch {
            return null
          }
        }),
      )
      if (cancelled) {
        return
      }
      const next: Record<string, string> = {}
      for (const entry of entries) {
        if (entry) {
          next[entry[0]] = entry[1]
        }
      }
      setIcons(next)
    })()

    return () => {
      cancelled = true
    }
  }, [key])

  return icons
}
