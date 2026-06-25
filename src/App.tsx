import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { WelcomeOverlay } from './components/WelcomeOverlay'
import { LoginScreen } from './components/LoginScreen'
import { AnoraMark } from './components/AnoraLogo'
import { HomeView } from './views/HomeView'
import { ServicesView } from './views/ServicesView'
import { CategoryWorkspace } from './views/CategoryWorkspace'
import { VideosView } from './views/VideosView'
import { UsersView } from './views/UsersView'
import type { Route, ViewId } from './navigation'
import { readRoute, writeRoute } from './navigation'
import { useAuth } from './auth/AuthContext'
import { canAccessView, defaultView } from './auth/access'
import type { User } from './auth/api'

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function shouldShowIntro(role: User['role']) {
  try {
    if (role === 'vendedor' || prefersReducedMotion()) return false
    const route = readRoute()
    if (route && route.view !== 'inicio') return false
    return sessionStorage.getItem('anora_intro_seen') !== '1'
  } catch {
    return true
  }
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-anora">
      <AnoraMark className="h-12 w-12 animate-pulse text-terracotta" title="Clínica Anora" />
    </div>
  )
}

function AppShell({ user }: { user: User }) {
  const [route, setRoute] = useState<Route>(() => readRoute() ?? { view: 'inicio', module: null })
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(() => shouldShowIntro(user.role))

  useEffect(() => {
    writeRoute(route)
  }, [route])

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

  // Redireciona se o papel não pode acessar a aba atual.
  useEffect(() => {
    if (!canAccessView(user.role, route.view)) {
      navigate(defaultView(user.role))
    }
  }, [user.role, route.view, navigate])

  const searching = query.trim().length > 0

  function renderMain() {
    if (!canAccessView(user.role, route.view)) return null
    if (searching) return <ServicesView view="todos" query={query} />
    if (route.view === 'inicio') return <HomeView onNavigate={(view) => navigate(view)} />
    if (route.view === 'videos') return <VideosView />
    if (route.view === 'usuarios') return <UsersView />
    if (route.view === 'gestao' || route.view === 'analise') {
      return (
        <CategoryWorkspace
          categoryId={route.view}
          activeModule={route.module}
          onSelectModule={(module) => navigate(route.view, module)}
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
          showSearch={user.role !== 'vendedor'}
        />

        <main className="flex-1">{renderMain()}</main>
      </div>

      {showIntro ? <WelcomeOverlay onDone={() => setShowIntro(false)} /> : null}
    </div>
  )
}

export default function App() {
  const { status, user } = useAuth()

  if (status === 'loading') return <Splash />
  if (status === 'anon' || !user) return <LoginScreen />
  return <AppShell user={user} />
}
