import { useT } from '../i18n'

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'

/** Three stars, `count` of them filled (drawn in SVG: the fonts have no star glyph). */
export function Stars({ count, size = 40 }: { count: number; size?: number }) {
  const t = useT()
  return (
    <span role="img" aria-label={t.result.stars(count)} style={{ display: 'inline-flex', gap: size * 0.15 }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            d={STAR}
            fill={i < count ? 'var(--light)' : 'none'}
            stroke="var(--ink)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeDasharray={i < count ? undefined : '2.5 2'}
          />
        </svg>
      ))}
    </span>
  )
}
