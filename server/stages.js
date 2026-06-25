// Etapas do Kanban de Contratação (espelha src/lib/candidates.ts no frontend).
export const STAGES = [
  { id: 'novo', label: 'Novo Candidato' },
  { id: 'entrevista', label: 'Marcando entrevista' },
  { id: 'entrevistado', label: 'Entrevistado' },
  { id: 'experiencia', label: 'Experiência 90 dias' },
]

export const STAGE_IDS = new Set(STAGES.map((s) => s.id))
