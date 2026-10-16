import { InkDefs } from './components/InkDefs'
import { useRoute } from './shell/router'
import { StartMap } from './shell/StartMap'
import './styles/global.css'

export function App() {
  const route = useRoute()
  return (
    <>
      <InkDefs />
      {route.name === 'start' && <StartMap />}
    </>
  )
}
