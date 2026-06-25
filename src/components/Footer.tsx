import { AnoraMark } from './AnoraLogo'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer id="sobre" className="mt-24 border-t border-ink/10 bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-3 text-cream">
              <AnoraMark className="h-9 w-9" title="Clínica Anora" />
              <span className="text-xl font-medium tracking-[0.3em]">ANORA</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-cream/70">
              Um espaço para reunir os sistemas da clínica. O resultado acompanha o
              processo — e a tecnologia entra como parte dessa condução, com critério e
              consistência.
            </p>
          </div>

          <div className="text-sm">
            <h4 className="text-xs uppercase tracking-[0.2em] text-cream/50">HUB</h4>
            <ul className="mt-4 space-y-3 text-cream/70">
              <li>
                <a className="transition-colors hover:text-sand" href="#servicos">
                  Serviços
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-sand" href="#categorias">
                  Categorias
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-sand" href="#topo">
                  Voltar ao topo
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-cream/10 pt-6 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Clínica Anora. Uso interno.</p>
          <p className="tracking-[0.15em] uppercase">Bem-vinda à sua nova era</p>
        </div>
      </div>
    </footer>
  )
}
