import { useEffect, useRef } from 'react'

const DEBOUNCE_MS = 200

/**
 * ウィンドウが再びアクティブになったとき（他アプリから復帰など）に onActivate を呼ぶ。
 * 初回マウント時の focus は無視する。busy ロックは呼び出し側で制御する。
 */
export function useWindowActivateRefresh(onActivate: () => void, enabled: boolean) {
  const onActivateRef = useRef(onActivate)
  onActivateRef.current = onActivate

  useEffect(() => {
    if (!enabled) {
      return
    }

    let blurred = document.hidden
    let timer: ReturnType<typeof setTimeout> | undefined

    const schedule = () => {
      if (document.hidden) {
        return
      }
      window.clearTimeout(timer)
      timer = setTimeout(() => {
        if (document.hidden) {
          return
        }
        onActivateRef.current()
      }, DEBOUNCE_MS)
    }

    const onBlur = () => {
      blurred = true
    }

    const onFocus = () => {
      if (!blurred) {
        return
      }
      blurred = false
      schedule()
    }

    const onVisibility = () => {
      if (document.hidden) {
        blurred = true
        return
      }
      schedule()
    }

    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
