import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { WelcomeOverlay } from './components/WelcomeOverlay'
import { HomeView } from './views/HomeView'
import { ServicesView } from './views/ServicesView'
import type { ViewId } from './navigation'
import { readHash, writeHash } from './navigation'

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
    if (readHash() && readHash() !== 'inicio') return false
    return sessionStorage.getItem('anora_intro_seen') !== '1'
  } catch {
    return true
  }
}

export default function App() {
  const [view, setView] = useState<ViewId>(() => readHash() ?? 'inicio')
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(shouldShowIntro)

  // Mantém a URL (hash) em sincronia com a aba atual — permite compartilhar links.
  useEffect(() => {
    writeHash(view)
  }, [view])

  // Acompanha mudanças externas do hash (link compartilhado, edição manual).
  useEffect(() => {
    const onHashChange = () => {
      const next = readHash()
      if (next) setView(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: ViewId) => {
    setView(next)
    setQuery('')
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const searching = query.trim().length > 0

  return (
    <div className="min-h-screen bg-anora">
      <Sidebar
        activeView={view}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <TopBar
          view={view}
          query={query}
          onQuery={setQuery}
          onOpenMenu={() => setSidebarOpen(true)}
        />

        <main className="flex-1">
          {!searching && view === 'inicio' ? (
            <HomeView onNavigate={navigate} />
          ) : (
            <ServicesView view={view === 'inicio' ? 'todos' : view} query={query} />
          )}
        </main>
      </div>

      {showIntro ? <WelcomeOverlay onDone={() => setShowIntro(false)} /> : null}
    </div>
  )
}
