import { useEffect } from 'react'
import { AnoraMark } from './AnoraLogo'

/**
 * Tela de boas-vindas exibida ao entrar no HUB.
 * "Bem-vindo ao HUB" surge, segura por um instante e sobe, revelando a
 * central de controle. Roda uma vez por sessão; clique pula a animação.
 */
export function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    try {
      sessionStorage.setItem('anora_intro_seen', '1')
    } catch {
      /* sessionStorage indisponível — segue sem persistir */
    }
    const timer = window.setTimeout(onDone, 2500)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div
      onClick={onDone}
      role="presentation"
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-ink text-cream [animation:welcome-rise_2.5s_cubic-bezier(0.7,0,0.2,1)_forwards]"
    >
      {/* brilho sutil de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(40rem 24rem at 50% 38%, rgba(137,75,54,0.28), transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center [animation:welcome-content_1s_ease-out_both]">
        <AnoraMark className="h-16 w-16 text-terracotta sm:h-20 sm:w-20" title="Clínica Anora" />
        <p className="mt-8 text-[0.7rem] uppercase tracking-[0.42em] text-cream/50">
          Clínica Anora
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl">
          Bem-vindo ao HUB
        </h1>
        <p className="mt-4 text-sm text-cream/55 sm:text-base">
          Sua central de serviços
        </p>
      </div>

      <span className="absolute bottom-10 text-[0.65rem] uppercase tracking-[0.32em] text-cream/30">
        entrando
      </span>
    </div>
  )
}
