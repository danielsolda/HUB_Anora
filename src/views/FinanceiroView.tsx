import { DashboardEmbed } from '../components/DashboardEmbed'
import { ChartIcon } from '../lib/icons'

/**
 * Aba Financeiro (dashboard de faturamento/recebimentos).
 * Quando o dashboard existir, defina a URL abaixo e ele abre embutido inline,
 * igual à Análise. Por enquanto, mostra um placeholder.
 */
const FINANCEIRO_EMBED_URL = ''

export function FinanceiroView() {
  if (FINANCEIRO_EMBED_URL) {
    return <DashboardEmbed title="Dashboard Financeiro" src={FINANCEIRO_EMBED_URL} />
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-linen text-mauve">
          <ChartIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-ink">Dashboard Financeiro</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          Faturamento, recebimentos e desempenho por procedimento, organizados para leitura
          rápida.
        </p>
        <p className="mt-5 inline-flex rounded-full bg-sand/25 px-3 py-1 text-xs font-medium text-mauve ring-1 ring-mauve/20">
          Em desenvolvimento
        </p>
      </div>
    </div>
  )
}
