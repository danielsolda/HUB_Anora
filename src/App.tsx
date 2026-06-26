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
import { FinanceiroView } from './views/FinanceiroView'
import { UsersView } from './views/UsersView'
import { DashboardEmbed } from './components/DashboardEmbed'
import { services } from './data/services'
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

function shouldShowIntro() {
  // Toca a cada carregamento da página / login (respeitando quem prefere
  // menos animação).
  try {
    return !prefersReducedMotion()
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('anora_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const [showIntro, setShowIntro] = useState(shouldShowIntro)

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem('anora_sidebar_collapsed', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

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
  // Views que embutem um dashboard/planilha em tela cheia: o próprio conteúdo já
  // tem cabeçalho, então a barra superior do app não aparece (sem duplicar).
  const embedViews = ['analise', 'auditoria']
  const chromeless = embedViews.includes(route.view)
  // Busca não aparece nesses dashboards nem em Financeiro, nem para o Vendedor.
  const showSearch =
    user.role !== 'vendedor' && !chromeless && route.view !== 'financeiro'

  function renderMain() {
    if (!canAccessView(user.role, route.view)) return null
    if (searching) return <ServicesView view="todos" query={query} />
    if (route.view === 'inicio') return <HomeView onNavigate={(view) => navigate(view)} />
    if (route.view === 'videos') return <VideosView />
    if (route.view === 'financeiro') return <FinanceiroView />
    if (route.view === 'usuarios') return <UsersView />
    if (route.view === 'analise' || route.view === 'auditoria') {
      // Abre direto o dashboard/planilha embutido (sem 2ª sidebar).
      const dash = services.find(
        (s) => s.category === route.view && s.status === 'ativo' && s.embedUrl,
      )
      return dash?.embedUrl ? (
        <DashboardEmbed
          title={dash.name}
          src={dash.embedUrl}
          onOpenMenu={() => setSidebarOpen(true)}
          fullHeight
        />
      ) : (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center text-sm text-ink/50">
          Nenhum dashboard disponível.
        </div>
      )
    }
    if (route.view === 'gestao') {
      return (
        <CategoryWorkspace
          categoryId="gestao"
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
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]'
        }`}
      >
        {chromeless ? null : (
          <TopBar
            view={route.view}
            query={query}
            onQuery={setQuery}
            onOpenMenu={() => setSidebarOpen(true)}
            showSearch={showSearch}
          />
        )}

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
