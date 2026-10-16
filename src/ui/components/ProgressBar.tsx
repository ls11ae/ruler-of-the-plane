/** A sketchy progress bar (e.g. "84 % beleuchtet"); `value` from 0 to 1. */
export function ProgressBar({
  value,
  color = 'var(--light)',
  label,
  width = 210,
}: {
  value: number
  color?: string
  label: string
  width?: number
}) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      style={{
        display: 'inline-block',
        width,
        maxWidth: '100%',
        height: 18,
        border: '2.5px solid var(--ink)',
        borderRadius: 9,
        background: 'var(--paper)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${v * 100}%`,
          height: '100%',
          background: color,
          borderRight: v > 0 && v < 1 ? '2px solid var(--ink)' : undefined,
          transition: 'width 120ms linear',
        }}
      />
    </span>
  )
}
