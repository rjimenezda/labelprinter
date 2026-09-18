import { lazy, Suspense } from 'react'
import { useRoute } from './router/useRoute'
import { ViewerPage } from './viewer/ViewerPage'

// Editor and hub are lazy -- the viewer route must boot as fast as
// possible over LAN Wi-Fi, so it statically imports only render/ + codec/,
// never the editor's code.
const EditorPage = lazy(() => import('./editor/EditorPage').then((m) => ({ default: m.EditorPage })))
const HubPage = lazy(() => import('./hub/HubPage').then((m) => ({ default: m.HubPage })))
const SelfTestPage = lazy(() => import('./probe/SelfTestPage').then((m) => ({ default: m.SelfTestPage })))

function App() {
  const route = useRoute()

  if (route.k === 'view') {
    return <ViewerPage payload={route.payload} />
  }

  if (route.k === 'hub') {
    return (
      <Suspense fallback={null}>
        <HubPage />
      </Suspense>
    )
  }

  if (route.k === 'selftest') {
    return (
      <Suspense fallback={null}>
        <SelfTestPage />
      </Suspense>
    )
  }

  if (route.k === 'notfound') {
    return (
      <div style={{ padding: 24, fontFamily: 'inherit' }}>
        <h1>Not found</h1>
        <p>
          Unrecognized route: <code>#{route.raw}</code>
        </p>
        <p>
          <a href="#/">Go to editor</a> · <a href="#/hub">Go to probe hub</a>
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <EditorPage initialPayload={route.k === 'editor' ? route.payload : undefined} />
    </Suspense>
  )
}

export default App
