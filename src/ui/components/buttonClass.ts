import styles from './Button.module.css'

export type ButtonVariant = 'solid' | 'accent' | 'dashed'

export interface Look {
  variant?: ButtonVariant
  small?: boolean
  selected?: boolean
}

/** Class names of the sketchy button look, for elements that are not a `<button>`. */
export function buttonClass({ variant = 'solid', small, selected }: Look = {}, extra?: string): string {
  return [
    styles.button,
    variant !== 'solid' && styles[variant],
    small && styles.small,
    selected && styles.selected,
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}
