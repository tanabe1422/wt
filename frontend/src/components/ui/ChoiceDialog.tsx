import { useEffect, useState } from 'react'

import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface ChoiceDialogProps<T extends string> {
  open: boolean
  title: string
  message?: string
  options: ChoiceOption<T>[]
  defaultValue: T
  confirmLabel?: string
  cancelLabel?: string
  warningForValue?: T
  warningMessage?: string
  onConfirm: (value: T) => void
  onCancel: () => void
}

export function ChoiceDialog<T extends string>({
  open,
  title,
  message,
  options,
  defaultValue,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  warningForValue,
  warningMessage,
  onConfirm,
  onCancel,
}: ChoiceDialogProps<T>) {
  const [value, setValue] = useState<T>(defaultValue)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
    }
  }, [open, defaultValue])

  if (!open) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.body}>
          <h2 id="choice-title" className={styles.title}>
            {title}
          </h2>
          {message && <p className={styles.message}>{message}</p>}
          <div className={styles.choices} role="radiogroup" aria-labelledby="choice-title">
            {options.map((option) => (
              <label key={option.value} className={styles.choice}>
                <input
                  type="radio"
                  className={styles.choiceInput}
                  name="choice-dialog"
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => setValue(option.value)}
                />
                <span className={styles.choiceBody}>
                  <span className={styles.choiceLabel}>{option.label}</span>
                  {option.description && (
                    <span className={styles.choiceDescription}>{option.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {warningForValue && value === warningForValue && warningMessage && (
            <p className={styles.warning}>{warningMessage}</p>
          )}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={warningForValue && value === warningForValue ? 'danger' : 'primary'}
            onClick={() => onConfirm(value)}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
