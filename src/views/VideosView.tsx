import { VideoIcon } from '../lib/icons'

/**
 * Aba Vídeos. Estrutura inicial — o conteúdo (lista/biblioteca de vídeos) será
 * definido depois. É a única aba visível para o perfil Vendedor.
 */
export function VideosView() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <header className="animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">
          Biblioteca
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Vídeos</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink/60">
          Espaço para os vídeos da equipe — treinamentos, protocolos e materiais de apoio.
        </p>
      </header>

      <div className="animate-fade-up mt-10 rounded-xl2 border border-dashed border-ink/15 bg-cream/50 py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-linen text-mauve">
          <VideoIcon className="h-7 w-7" />
        </span>
        <p className="mt-5 text-ink/70">Nenhum vídeo ainda.</p>
        <p className="mt-1 text-sm text-ink/45">
          Em breve você poderá adicionar e organizar os vídeos por aqui.
        </p>
      </div>
    </div>
  )
}
