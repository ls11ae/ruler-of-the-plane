import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { buttonClass, type Look } from './buttonClass'

/** Sketchy button as in the mockup: ink border, hard shadow, at least 44 px high. */
export function Button({
  variant,
  small,
  selected,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return <button type={type} className={buttonClass({ variant, small, selected }, className)} {...props} />
}

export function LinkButton({
  variant,
  small,
  selected,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & Look) {
  return <a className={buttonClass({ variant, small, selected }, className)} {...props} />
}
