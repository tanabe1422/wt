import styles from './Toast.module.css'

export type ToastVariant = 'success' | 'progress'

/** Visual style. Default production style is `soft` (no left accent bar). */
export type ToastAppearance = 'soft' | 'icon' | 'plain' | 'accent'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastProps {
  item: ToastItem
  onDismiss: (id: string) => void
  appearance?: ToastAppearance
}

function SuccessIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.25 10.25 8.75 12.75 13.75 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function appearanceClass(appearance: ToastAppearance): string {
  if (appearance === 'icon') {
    return styles.iconTone
  }
  return styles[appearance]
}

export function Toast({ item, onDismiss, appearance = 'soft' }: ToastProps) {
  const showSuccessIcon = item.variant === 'success' && appearance !== 'plain' && appearance !== 'accent'
  const showSpinner = item.variant === 'progress'

  return (
    <div
      className={`${styles.toast} ${appearanceClass(appearance)} ${styles[item.variant]}`}
      role="status"
      aria-live="polite"
    >
      {showSuccessIcon && <SuccessIcon />}
      {showSpinner && <span className={styles.spinner} aria-hidden="true" />}
      <p className={styles.message}>{item.message}</p>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="閉じる"
        onClick={() => onDismiss(item.id)}
      >
        ×
      </button>
    </div>
  )
}

interface ToastHostProps {
  items: ToastItem[]
  onDismiss: (id: string) => void
  appearance?: ToastAppearance
}

export function ToastHost({ items, onDismiss, appearance = 'soft' }: ToastHostProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={styles.host}>
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={onDismiss} appearance={appearance} />
      ))}
    </div>
  )
}

export const TOAST_APPEARANCE_LABELS: Record<ToastAppearance, string> = {
  soft: 'ソフト塗り（既定）',
  icon: 'アイコン + 白背景',
  plain: 'プレーン（アイコンなし）',
  accent: '左アクセント線（旧）',
}
