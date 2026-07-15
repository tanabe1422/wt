import { useCallback, useReducer, useState } from 'react'

import { getSidebarExpanded, setSidebarExpanded } from '../lib/sidebarExpansionStore'

/**
 * 展開状態フック。
 * storageKey があるときはモジュールストアを描画時に同期読みする
 * （タブ切替で同名ノードが再利用されても、useEffect 後追い復元にならない）。
 */
export function useTreeExpansion(
  depth: number,
  threshold = 1,
  storageKey?: string | null,
) {
  const fallback = depth < threshold
  const [, bump] = useReducer((version: number) => version + 1, 0)
  const [localExpanded, setLocalExpanded] = useState(fallback)

  const setExpanded = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (storageKey) {
        const prev = getSidebarExpanded(storageKey) ?? fallback
        const next = typeof value === 'function' ? value(prev) : value
        setSidebarExpanded(storageKey, next)
        bump()
        return
      }
      setLocalExpanded(value)
    },
    [storageKey, fallback],
  )

  const expanded = storageKey
    ? (getSidebarExpanded(storageKey) ?? fallback)
    : localExpanded

  return [expanded, setExpanded] as const
}
