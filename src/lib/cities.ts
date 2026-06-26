/**
 * Coordenadas de cidades brasileiras para o heatmap de agendamentos.
 * Inclui as cidades que aparecem na planilha + grandes cidades (para que novas
 * cidades sejam localizadas automaticamente). Nomes com acento/erro de digitação
 * são resolvidos por similaridade (ex.: "curitba" → Curitiba).
 */
export type City = { name: string; uf: string; lat: number; lng: number }

export const CITY_COORDS: City[] = [
  // Aparecem na planilha
  { name: 'Belo Horizonte', uf: 'MG', lat: -19.9167, lng: -43.9345 },
  { name: 'São Paulo', uf: 'SP', lat: -23.5505, lng: -46.6333 },
  { name: 'Jacareí', uf: 'SP', lat: -23.3053, lng: -45.9658 },
  { name: 'Campinas', uf: 'SP', lat: -22.9056, lng: -47.0608 },
  { name: 'Santos', uf: 'SP', lat: -23.9608, lng: -46.3336 },
  { name: 'Goiânia', uf: 'GO', lat: -16.6864, lng: -49.2643 },
  { name: 'Rio de Janeiro', uf: 'RJ', lat: -22.9068, lng: -43.1729 },
  { name: 'Curitiba', uf: 'PR', lat: -25.4284, lng: -49.2733 },
  { name: 'Taubaté', uf: 'SP', lat: -23.0264, lng: -45.555 },
  { name: 'Caraguatatuba', uf: 'SP', lat: -23.6201, lng: -45.4128 },
  // Grandes cidades (robustez para novas entradas)
  { name: 'Brasília', uf: 'DF', lat: -15.7939, lng: -47.8828 },
  { name: 'Salvador', uf: 'BA', lat: -12.9777, lng: -38.5016 },
  { name: 'Fortaleza', uf: 'CE', lat: -3.7319, lng: -38.5267 },
  { name: 'Recife', uf: 'PE', lat: -8.0476, lng: -34.877 },
  { name: 'Porto Alegre', uf: 'RS', lat: -30.0346, lng: -51.2177 },
  { name: 'Manaus', uf: 'AM', lat: -3.119, lng: -60.0217 },
  { name: 'Belém', uf: 'PA', lat: -1.4558, lng: -48.5039 },
  { name: 'Vitória', uf: 'ES', lat: -20.3155, lng: -40.3128 },
  { name: 'Florianópolis', uf: 'SC', lat: -27.5949, lng: -48.5482 },
  { name: 'Natal', uf: 'RN', lat: -5.7945, lng: -35.211 },
  { name: 'João Pessoa', uf: 'PB', lat: -7.1195, lng: -34.845 },
  { name: 'Maceió', uf: 'AL', lat: -9.6498, lng: -35.7089 },
  { name: 'Aracaju', uf: 'SE', lat: -10.9472, lng: -37.0731 },
  { name: 'Teresina', uf: 'PI', lat: -5.0892, lng: -42.8019 },
  { name: 'São Luís', uf: 'MA', lat: -2.5307, lng: -44.3068 },
  { name: 'Cuiabá', uf: 'MT', lat: -15.6014, lng: -56.0979 },
  { name: 'Campo Grande', uf: 'MS', lat: -20.4697, lng: -54.6201 },
  { name: 'Palmas', uf: 'TO', lat: -10.1842, lng: -48.3336 },
  { name: 'Macapá', uf: 'AP', lat: 0.0349, lng: -51.0694 },
  { name: 'Boa Vista', uf: 'RR', lat: 2.8235, lng: -60.6758 },
  { name: 'Rio Branco', uf: 'AC', lat: -9.9747, lng: -67.81 },
  { name: 'Porto Velho', uf: 'RO', lat: -8.7619, lng: -63.9039 },
  { name: 'Uberlândia', uf: 'MG', lat: -18.9186, lng: -48.2772 },
  { name: 'Ribeirão Preto', uf: 'SP', lat: -21.1775, lng: -47.8103 },
  { name: 'Sorocaba', uf: 'SP', lat: -23.5015, lng: -47.4526 },
  { name: 'São José dos Campos', uf: 'SP', lat: -23.1896, lng: -45.8841 },
  { name: 'Niterói', uf: 'RJ', lat: -22.8833, lng: -43.1036 },
  { name: 'Londrina', uf: 'PR', lat: -23.3045, lng: -51.1696 },
  { name: 'Maringá', uf: 'PR', lat: -23.4253, lng: -51.9386 },
  { name: 'Juiz de Fora', uf: 'MG', lat: -21.7642, lng: -43.3503 },
  { name: 'Guarulhos', uf: 'SP', lat: -23.4543, lng: -46.5337 },
  { name: 'Contagem', uf: 'MG', lat: -19.932, lng: -44.0537 },
  { name: 'Joinville', uf: 'SC', lat: -26.3045, lng: -48.8487 },
  { name: 'Uberaba', uf: 'MG', lat: -19.7472, lng: -47.9381 },
  { name: 'Bauru', uf: 'SP', lat: -22.3147, lng: -49.0606 },
  { name: 'Piracicaba', uf: 'SP', lat: -22.7253, lng: -47.6492 },
  { name: 'São José do Rio Preto', uf: 'SP', lat: -20.8113, lng: -49.3758 },
  { name: 'Anápolis', uf: 'GO', lat: -16.3267, lng: -48.9526 },
  { name: 'Volta Redonda', uf: 'RJ', lat: -22.5202, lng: -44.0996 },
]

/** minúsculas, sem acento, espaços colapsados; remove sufixo " - UF" / "/UF". */
export function normalizeCity(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s,/-]+[a-z]{2}\.?$/, '') // " - sp", "/rj"
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev = new Array(b.length + 1)
  const cur = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let best = cur[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]
  }
  return prev[b.length]
}

const INDEX = new Map(CITY_COORDS.map((c) => [normalizeCity(c.name), c]))

/** Resolve um texto de cidade para uma cidade conhecida (exato ou aproximado). */
export function resolveCity(raw: string): City | null {
  const n = normalizeCity(raw)
  if (!n) return null
  const exact = INDEX.get(n)
  if (exact) return exact
  if (n.length < 4) return null
  let best: City | null = null
  let bestDist = 3
  for (const [key, city] of INDEX) {
    if (Math.abs(key.length - n.length) > 2) continue
    const d = levenshtein(n, key, 2)
    if (d < bestDist) {
      bestDist = d
      best = city
    }
  }
  return bestDist <= 2 ? best : null
}
