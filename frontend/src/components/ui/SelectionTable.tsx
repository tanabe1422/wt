import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'

import { cx } from '../../utils/cx'
import styles from './SelectionTable.module.css'

export { styles as selectionTableStyles }

export type SelectionTableVariant = 'current' | 'legacy' | 'flat' | 'zebra' | 'dense' | 'soft'

const VARIANT_CLASS: Record<SelectionTableVariant, string | undefined> = {
  current: undefined,
  legacy: styles.variantLegacy,
  flat: styles.variantFlat,
  zebra: styles.variantZebra,
  dense: styles.variantDense,
  soft: styles.variantSoft,
}

export interface SelectionTableListProps {
  children?: ReactNode
  /** When set, shown instead of children (empty / loading). */
  placeholder?: ReactNode
  className?: string
  /** min 12rem / max 26rem. Disable for flex-split panes. Default true. */
  constrained?: boolean
  /** Visual appearance. Default `current`. Candidates: flat / zebra / dense / soft. */
  variant?: SelectionTableVariant
}

export function SelectionTableList({
  children,
  placeholder,
  className,
  constrained = true,
  variant = 'current',
}: SelectionTableListProps) {
  return (
    <div
      className={cx(
        styles.list,
        constrained && styles.listConstrained,
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {placeholder != null ? (
        typeof placeholder === 'string' || typeof placeholder === 'number' ? (
          <p className={styles.empty}>{placeholder}</p>
        ) : (
          placeholder
        )
      ) : (
        children
      )}
    </div>
  )
}

export interface SelectionTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

export function SelectionTable({ children, className, ...rest }: SelectionTableProps) {
  return (
    <table className={cx(styles.table, className)} {...rest}>
      {children}
    </table>
  )
}

export interface SelectionTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  locked?: boolean
  focused?: boolean
}

export function SelectionTableRow({
  locked = false,
  focused = false,
  className,
  onClick,
  children,
  ...rest
}: SelectionTableRowProps) {
  return (
    <tr
      className={cx(
        styles.row,
        locked && styles.rowLocked,
        focused && styles.rowFocused,
        className,
      )}
      onClick={locked ? undefined : onClick}
      {...rest}
    >
      {children}
    </tr>
  )
}
