import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { WelcomeOverlay } from './components/WelcomeOverlay'
import { HomeView } from './views/HomeView'
import { ServicesView } from './views/ServicesView'
import { GestaoWorkspace } from './views/GestaoWorkspace'
import type { Route, ViewId } from './navigation'
import { readRoute, writeRoute } from './navigation'

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function shouldShowIntro() {
  try {
    if (prefersReducedMotion()) return false
    const route = readRoute()
    if (route && route.view !== 'inicio') return false
    return sessionStorage.getItem('anora_intro_seen') !== '1'
  } catch {
    return true
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRoute() ?? { view: 'inicio', module: null })
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(shouldShowIntro)

  // Mantém a URL (hash) em sincronia com a rota atual.
  useEffect(() => {
    writeRoute(route)
  }, [route])

  // Acompanha mudanças externas do hash (links internos, voltar, etc.).
  useEffect(() => {
    const onHashChange = () => {
      const next = readRoute()
      if (next) {
        setRoute(next)
        setQuery('')
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((view: ViewId, module: string | null = null) => {
    setRoute({ view, module })
    setQuery('')
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const searching = query.trim().length > 0

  function renderMain() {
    if (searching) {
      return <ServicesView view="todos" query={query} />
    }
    if (route.view === 'inicio') {
      return <HomeView onNavigate={(view) => navigate(view)} />
    }
    if (route.view === 'gestao') {
      return (
        <GestaoWorkspace
          activeModule={route.module}
          onSelectModule={(module) => navigate('gestao', module)}
        />
      )
    }
    return <ServicesView view={route.view} query="" />
  }

  return (
    <div className="min-h-screen bg-anora">
      <Sidebar
        activeView={route.view}
        onNavigate={(view) => navigate(view)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <TopBar
          view={route.view}
          query={query}
          onQuery={setQuery}
          onOpenMenu={() => setSidebarOpen(true)}
        />

        <main className="flex-1">{renderMain()}</main>
      </div>

      {showIntro ? <WelcomeOverlay onDone={() => setShowIntro(false)} /> : null}
    </div>
  )
}
