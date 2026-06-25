import { useId } from 'react'

type MarkProps = {
  className?: string
  title?: string
}

/**
 * Símbolo da ANORA — "espelho desconstruído".
 * Moldura quadrada com abas nas laterais e uma estrela de 8 pontas vazada
 * ao centro (o reflexo fragmentado). Usa `currentColor`, então herda a cor
 * do contexto. A estrela é um recorte real (transparente), adaptando-se a
 * qualquer fundo.
 */
export function AnoraMark({ className, title }: MarkProps) {
  const maskId = useId()
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="64" height="64" fill="white" />
          <path
            d="M32,13.5 L35.06,24.61 L45.08,18.92 L39.39,28.94 L50.5,32 L39.39,35.06 L45.08,45.08 L35.06,39.39 L32,50.5 L28.94,39.39 L18.92,45.08 L24.61,35.06 L13.5,32 L24.61,28.94 L18.92,18.92 L28.94,24.61 Z"
            fill="black"
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill="currentColor">
        <rect x="7" y="7" width="50" height="50" rx="15" />
        <rect x="26" y="3.5" width="12" height="8" rx="4" />
        <rect x="26" y="52.5" width="12" height="8" rx="4" />
        <rect x="3.5" y="26" width="8" height="12" rx="4" />
        <rect x="52.5" y="26" width="8" height="12" rx="4" />
      </g>
    </svg>
  )
}

type LogoProps = {
  /** Tamanho do símbolo. */
  size?: 'sm' | 'md' | 'lg'
  /** Orientação do conjunto símbolo + texto. */
  layout?: 'horizontal' | 'stacked'
  /** Exibe a palavra "CLÍNICA" sob/junto ao nome. */
  showTagline?: boolean
  className?: string
}

const markSize: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
}

const wordSize: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

/** Lockup completo da marca: símbolo + "ANORA" + "CLÍNICA". */
export function AnoraLogo({
  size = 'md',
  layout = 'horizontal',
  showTagline = true,
  className = '',
}: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${
        layout === 'stacked' ? 'flex-col gap-2 text-center' : ''
      } ${className}`}
    >
      <AnoraMark className={`${markSize[size]} shrink-0`} title="Clínica Anora" />
      <span className={layout === 'stacked' ? 'flex flex-col items-center' : 'flex flex-col'}>
        <span className={`${wordSize[size]} font-medium leading-none tracking-[0.3em]`}>
          ANORA
        </span>
        {showTagline ? (
          <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.42em] opacity-70">
            Clínica
          </span>
        ) : null}
      </span>
    </span>
  )
}
