import { apiFetch } from '../auth/api'

/**
 * Avaliações de desempenho. As perguntas de cada modelo (por função) vivem aqui
 * no frontend — são PLACEHOLDERS e devem ser trocadas pelas perguntas reais que
 * o cliente enviar. O gráfico de radar é montado a partir das dimensões.
 */

export type Assinatura = { nome: string; data: string } | null
export type Respostas = Record<string, number> // idDaPergunta -> nota 0..5

export type Avaliacao = {
  id: number
  colaborador_id: number
  modelo: string
  data_admissao: string | null
  data_avaliacao: string | null
  respostas: Respostas
  assinatura_colaborador: Assinatura
  assinatura_gestor: Assinatura
  observacoes: string
  created_at?: string
}

export type AvaliacaoComPessoa = Avaliacao & {
  colaborador_nome: string
  colaborador_cargo: string
  colaborador_setor: string
}

export type AvaliacaoInput = {
  modelo?: string
  data_admissao?: string | null
  data_avaliacao?: string | null
  respostas?: Respostas
  assinatura_colaborador?: Assinatura
  assinatura_gestor?: Assinatura
  observacoes?: string
}

export type Pergunta = { id: string; label: string; dimensao: string }
export type Modelo = { key: string; label: string; cargos: string[]; dimensoes: string[]; perguntas: Pergunta[] }

/** Monta as perguntas de um modelo: cada dimensão vira 2 perguntas placeholder. */
function mkPerguntas(key: string, dims: Record<string, string[]>): Pergunta[] {
  const out: Pergunta[] = []
  Object.entries(dims).forEach(([dimensao, perguntas]) => {
    perguntas.forEach((label, i) => out.push({ id: `${key}_${slug(dimensao)}_${i}`, label, dimensao }))
  })
  return out
}
function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// ⚠️ Perguntas PLACEHOLDER — trocar pelas oficiais de cada função.
const M = (key: string, label: string, cargos: string[], dims: Record<string, string[]>): Modelo => ({
  key,
  label,
  cargos,
  dimensoes: Object.keys(dims),
  perguntas: mkPerguntas(key, dims),
})

export const MODELOS: Modelo[] = [
  M('comercial', 'Comercial (Assistente)', ['Assistente Comercial'], {
    Comunicação: ['Clareza e cordialidade no atendimento', 'Escuta e entende a necessidade do lead'],
    'Técnica de vendas': ['Conduz a negociação com segurança', 'Contorna objeções e fecha vendas'],
    Relacionamento: ['Constrói vínculo com o cliente', 'Faz follow-up de forma consistente'],
    Organização: ['Mantém o funil/planilha atualizado', 'Cumpre prazos e metas de rotina'],
    'Postura profissional': ['Assiduidade e pontualidade', 'Trabalho em equipe'],
  }),
  M('biomedica', 'Biomédica', ['Biomédica'], {
    'Técnica do procedimento': ['Domínio técnico do protocolo', 'Qualidade e segurança do resultado'],
    'Segurança e protocolo': ['Segue os protocolos de biossegurança', 'Preenche e confere a documentação'],
    'Atendimento ao paciente': ['Acolhe e orienta a paciente', 'Comunica claramente o procedimento'],
    Organização: ['Preparo e conferência dos insumos', 'Cumpre a agenda e horários'],
    'Postura profissional': ['Assiduidade e pontualidade', 'Trabalho em equipe'],
  }),
  M('gerente', 'Gerente', ['Gerente Comercial', 'Gerente de Operações'], {
    Liderança: ['Engaja e desenvolve o time', 'Dá feedback e cobra resultados'],
    'Gestão de resultados': ['Acompanha indicadores e metas', 'Toma decisões baseadas em dados'],
    Comunicação: ['Alinha expectativas com clareza', 'Comunica-se bem com sócios e time'],
    Planejamento: ['Organiza a rotina e as prioridades', 'Antecipa problemas e riscos'],
    'Postura profissional': ['Assiduidade e exemplo', 'Colaboração entre áreas'],
  }),
  M('recepcionista', 'Recepcionista', ['Recepcionista'], {
    Atendimento: ['Cordialidade e simpatia', 'Resolve as demandas com agilidade'],
    Organização: ['Mantém a recepção e agenda em ordem', 'Monta as malas conforme o checklist'],
    Comunicação: ['Repassa informações com precisão', 'Alinha com biomédicas e gestão'],
    Proatividade: ['Antecipa necessidades da operação', 'Sugere melhorias'],
    'Postura profissional': ['Assiduidade e pontualidade', 'Trabalho em equipe'],
  }),
  M('motorista', 'Motorista', ['Motorista'], {
    'Direção segura': ['Respeita as normas de trânsito', 'Conduz com prudência e cuidado'],
    Pontualidade: ['Cumpre os horários da logística', 'Planeja as rotas com antecedência'],
    'Logística e organização': ['Organiza cargas e materiais', 'Confere entregas e retiradas'],
    'Zelo com o veículo': ['Mantém o veículo limpo e revisado', 'Comunica manutenções necessárias'],
    'Postura profissional': ['Assiduidade e responsabilidade', 'Boa comunicação com a equipe'],
  }),
]

export function getModelo(key: string): Modelo {
  return MODELOS.find((m) => m.key === key) ?? MODELOS[0]
}

/** Sugere o modelo a partir do cargo/função da pessoa. */
export function modeloForCargo(cargo: string): Modelo {
  const c = (cargo || '').toLowerCase()
  const hit = MODELOS.find((m) => m.cargos.some((k) => k.toLowerCase() === c))
  if (hit) return hit
  if (c.includes('gerente')) return getModelo('gerente')
  if (c.includes('biom')) return getModelo('biomedica')
  if (c.includes('recep')) return getModelo('recepcionista')
  if (c.includes('motor')) return getModelo('motorista')
  return getModelo('comercial')
}

/** Média por dimensão (eixos do radar). */
export function dimensaoScores(modelo: Modelo, respostas: Respostas): { dimensao: string; score: number }[] {
  return modelo.dimensoes.map((dimensao) => {
    const qs = modelo.perguntas.filter((p) => p.dimensao === dimensao)
    const vals = qs.map((q) => respostas[q.id]).filter((v) => typeof v === 'number')
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { dimensao, score: Math.round(score * 10) / 10 }
  })
}

/** Média geral (0–5) de todas as perguntas respondidas. */
export function mediaGeral(modelo: Modelo, respostas: Respostas): number {
  const vals = modelo.perguntas.map((q) => respostas[q.id]).filter((v) => typeof v === 'number')
  if (!vals.length) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function listAvaliacoes(): Promise<AvaliacaoComPessoa[]> {
  return (await json<{ avaliacoes: AvaliacaoComPessoa[] }>('/api/rh/avaliacoes')).avaliacoes
}

export async function listAvaliacoesByColaborador(colaboradorId: number): Promise<Avaliacao[]> {
  return (await json<{ avaliacoes: Avaliacao[] }>(`/api/colaboradores/${colaboradorId}/avaliacoes`)).avaliacoes
}

export async function createAvaliacao(colaboradorId: number, input: AvaliacaoInput): Promise<Avaliacao> {
  return (
    await json<{ avaliacao: Avaliacao }>(`/api/colaboradores/${colaboradorId}/avaliacoes`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).avaliacao
}

export async function updateAvaliacao(colaboradorId: number, avaliacaoId: number, patch: AvaliacaoInput): Promise<Avaliacao> {
  return (
    await json<{ avaliacao: Avaliacao }>(`/api/colaboradores/${colaboradorId}/avaliacoes/${avaliacaoId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  ).avaliacao
}

export async function deleteAvaliacao(colaboradorId: number, avaliacaoId: number): Promise<void> {
  await json(`/api/colaboradores/${colaboradorId}/avaliacoes/${avaliacaoId}`, { method: 'DELETE' })
}
