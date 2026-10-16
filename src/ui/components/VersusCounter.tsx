import { useT } from '../i18n'
import { useVersus } from '../shell/booth'

/** "Mensch gegen Maschine" today, e.g. on the start map, the attract screen and result screens. */
export function VersusCounter({ className }: { className?: string }) {
  const t = useT()
  const { human, machine } = useVersus()
  return (
    <span className={className} aria-label={`${t.versus.title} ${t.versus.today}: ${human} : ${machine}`}>
      {t.versus.title} ({t.versus.today}):{' '}
      <strong>
        {human} : {machine}
      </strong>
    </span>
  )
}
