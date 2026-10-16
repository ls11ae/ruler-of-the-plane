/** A bucket for removing torches (drawn in SVG). */
export function TrashIcon({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9h20M12 9V6h8v3M8.5 9l1.6 18h11.8L23.5 9" />
        <path d="M13.5 13.5v9M18.5 13.5v9" />
      </g>
    </svg>
  )
}
