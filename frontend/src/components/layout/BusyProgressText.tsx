import { useEffect, useRef, useState } from 'react'

import styles from './BusyProgressText.module.css'

const FADE_MS = 150

export type BusyMessageAppearance =
  | 'bare'
  | 'strong'
  | 'strongInverse'
  | 'chip'
  | 'panel'
  | 'ink'
  | 'hud'
  | 'arcade'
  | 'rpg'

export const BUSY_MESSAGE_APPEARANCE_LABELS: Record<BusyMessageAppearance, string> = {
  bare: 'ベア（現行・プレートなし）',
  strong: '黒文字＋白シャドウ',
  strongInverse: '白文字＋黒シャドウ',
  chip: 'チップ（白ピル）',
  panel: 'パネル（白カード）',
  ink: 'インク（濃色プレート）',
  hud: 'ゲーム · HUD（角括弧）',
  arcade: 'ゲーム · アーケード（太い枠）',
  rpg: 'ゲーム · RPG（ステータス窓）',
}

interface BusyProgressTextProps {
  message: string
  appearance?: BusyMessageAppearance
}

/** Shown under the busy spinner; fades out then in when the message changes. */
export function BusyProgressText({ message, appearance = 'chip' }: BusyProgressTextProps) {
  const [displayed, setDisplayed] = useState(message)
  const [visible, setVisible] = useState(Boolean(message))
  const pendingRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadingOutRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (message === displayed) {
      return
    }

    pendingRef.current = message

    if (!displayed) {
      setDisplayed(message)
      pendingRef.current = null
      requestAnimationFrame(() => setVisible(true))
      return
    }

    if (fadingOutRef.current) {
      return
    }

    fadingOutRef.current = true
    setVisible(false)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      const next = pendingRef.current ?? ''
      pendingRef.current = null
      fadingOutRef.current = false
      setDisplayed(next)
      timerRef.current = null
      if (next) {
        requestAnimationFrame(() => setVisible(true))
      }
    }, FADE_MS)
  }, [message, displayed])

  if (!displayed) {
    return null
  }

  return (
    <p
      className={`${styles.busyMessage} ${styles[appearance]} ${visible ? styles.busyMessageIn : styles.busyMessageOut}`}
      aria-live="polite"
    >
      <span className={styles.pulseText}>{displayed}</span>
    </p>
  )
}
