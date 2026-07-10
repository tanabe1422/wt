import type { ButtonHTMLAttributes } from 'react'

import { cx } from '../../utils/cx'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'plain' | 'menuItem'

const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
  plain: styles.plain,
  menuItem: styles.menuItem,
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'plain',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BUTTON_CLASS[variant], className)}
      {...rest}
    />
  )
}
