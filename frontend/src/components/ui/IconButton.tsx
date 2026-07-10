import type { ButtonHTMLAttributes } from 'react'

import { cx } from '../../utils/cx'
import styles from './IconButton.module.css'

type IconButtonSize = 'md' | 'sm'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize
}

export function IconButton({
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, size === 'sm' ? styles.sm : styles.md, className)}
      {...rest}
    />
  )
}
