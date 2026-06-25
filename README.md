# HUB Anora

HUB de serviços da **Clínica Anora** — um ponto de acesso central para reunir os
dashboards e sistemas internos desenvolvidos para a clínica.

A interface segue a identidade da marca: paleta terrosa, tipografia _Figtree_, o
símbolo do "espelho desconstruído" e um tom calmo e objetivo.

![Stack](https://img.shields.io/badge/React-18-1f2117?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-3f4429?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-894b36?style=flat-square)

---

## Como rodar

Pré-requisitos: **Node 18+**.

```bash
npm install      # instala as dependências
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
npm run build    # gera a versão de produção em dist/
npm run preview  # serve o build de produção localmente
```

---

## Adicionar um novo sistema ao HUB

Todo o conteúdo do HUB vive em **um único arquivo**:
[`src/data/services.ts`](src/data/services.ts). Não é preciso mexer no layout.

1. Escolha (ou crie) um ícone em [`src/lib/icons.tsx`](src/lib/icons.tsx).
2. Acrescente um objeto ao array `services`:

```ts
{
  id: 'novo-sistema',          // identificador único
  name: 'Novo Sistema',
  description: 'Descrição curta, em tom calmo e objetivo.',
  category: 'gestao',          // analise | atendimento | gestao | marketing | operacao
  status: 'ativo',             // ativo | em-breve | manutencao
  href: 'https://...',         // link de acesso (quando ativo)
  external: true,              // abre em nova aba (sistemas separados)
  icon: BoxIcon,               // ícone importado de ../lib/icons
  keywords: ['palavra', 'busca'], // termos extras para a busca
}
```

O card aparece automaticamente, agrupado pela `category`, e já entra na busca.

### Situações (`status`)

| status        | aparência                         | quando usar                          |
| ------------- | --------------------------------- | ------------------------------------ |
| `ativo`       | card clicável, destaque terracota | sistema no ar, com `href`            |
| `em-breve`    | card esmaecido, sem link          | em desenvolvimento                   |
| `manutencao`  | selo de manutenção                | temporariamente fora                 |

### Link secundário (e modal embutido)

Um serviço pode ter um **link secundário** — útil quando o sistema tem uma
"área de dados" (ex.: a planilha de respostas de um formulário):

```ts
secondary: {
  label: 'Ver respostas',
  href: 'https://docs.google.com/spreadsheets/d/<ID>/edit',     // abre em nova aba
  embedSrc: 'https://docs.google.com/spreadsheets/d/<ID>/preview', // abre num modal
  icon: GoogleSheetsIcon,                                        // ícone do botão
}
```

- Com `embedSrc`, o botão abre um **modal** com o conteúdo embutido (iframe), e o
  modal tem um atalho "Abrir no Google Sheets" como alternativa.
- Sem `embedSrc`, o botão apenas abre o `href` em nova aba.
- Para a planilha embutir, ela precisa estar compartilhada como **"qualquer
  pessoa com o link"** (somente leitura já basta).

### Adicionar uma categoria

No mesmo arquivo, inclua um item em `categories` (com `label`, `description` e
um `icon`) e use o novo `id` no campo `category` dos serviços. O tipo
`CategoryId` em [`src/types.ts`](src/types.ts) também precisa do novo id. A
categoria aparece sozinha na **sidebar**, na busca e na aba Início.

---

## Identidade da marca

Tokens definidos em [`tailwind.config.js`](tailwind.config.js):

| Token          | Hex       | Uso                          |
| -------------- | --------- | ---------------------------- |
| `ink`          | `#1f2117` | base escura / texto          |
| `olive`        | `#3f4429` | secundária                   |
| `cream`        | `#f7f4e8` | fundo claro                  |
| `sand`         | `#bcaf96` | neutro médio                 |
| `linen`        | `#dbd2c6` | superfícies                  |
| `terracotta`   | `#894b36` | destaque principal           |
| `mauve`        | `#937265` | destaque secundário          |

- **Fonte:** Figtree (carregada via Google Fonts em `index.html`).
- **Símbolo:** componente `AnoraMark` em
  [`src/components/AnoraLogo.tsx`](src/components/AnoraLogo.tsx) e
  [`public/favicon.svg`](public/favicon.svg). Usa `currentColor` e tem a estrela
  central vazada, adaptando-se a qualquer fundo. Para trocar pelo arquivo oficial
  do designer, basta substituir esses dois pontos.

---

## Estrutura

O HUB é um **app shell**: sidebar de navegação à esquerda + área de conteúdo que
troca de view conforme a aba ativa.

```
src/
├── components/
│   ├── Sidebar.tsx            # navegação principal (abas) + marca
│   ├── TopBar.tsx             # barra superior + busca
│   ├── WelcomeOverlay.tsx     # animação "Bem-vindo ao HUB"
│   ├── ServiceCard.tsx        # card de um sistema
│   ├── EmbedModal.tsx         # modal com conteúdo embutido (iframe)
│   ├── KanbanBoard.tsx        # quadro de Contratação (etapas + cards)
│   ├── CandidateDetailModal.tsx # dados do candidato + troca de etapa
│   └── AnoraLogo.tsx          # símbolo + lockup da marca
├── views/
│   ├── HomeView.tsx           # aba Início (central de controle)
│   ├── ServicesView.tsx       # "Todos", categoria e resultados de busca
│   └── GestaoWorkspace.tsx    # Gestão: 2ª sidebar de módulos + conteúdo
├── data/
│   └── services.ts            # ← registro de serviços e categorias (edite aqui)
├── lib/
│   ├── icons.tsx              # ícones de linha
│   └── candidates.ts          # ← dados do Kanban (planilha, etapas, exemplos)
├── navigation.ts              # rotas (view + módulo) via hash da URL
├── types.ts                   # tipos (Service, Category, status)
├── App.tsx                    # app shell + troca de views
└── index.css                  # estilos base + tokens + animações
```

### Navegação

A rota tem uma aba e, opcionalmente, um módulo, refletidos no hash da URL:
`/#gestao` ou `/#gestao/contratacao` — links são compartilháveis. A tela de
boas-vindas roda uma vez por sessão e respeita `prefers-reduced-motion`.

---

## Contratação (Kanban)

Em **Gestão → Contratação** há um quadro com as etapas _Novo Candidato_,
_Marcando entrevista_, _Entrevistado_ e _Experiência 90 dias_. Cada resposta do
formulário de vagas vira um card; clicar no card abre os dados preenchidos e
permite mover a pessoa de etapa (arraste o card ou use os botões no modal).

**Origem dos dados** ([`src/lib/candidates.ts`](src/lib/candidates.ts)): a
planilha de respostas é lida como CSV pelo endpoint público do Google (`gviz`).
Para funcionar ao vivo, a planilha precisa estar compartilhada como **"qualquer
pessoa com o link"**. Se a leitura falhar, o quadro usa dados de exemplo e exibe
um aviso de _modo demonstração_. As etapas (mover cards) são guardadas no
**navegador** (`localStorage`); persistência entre dispositivos exige um backend
— próximo passo natural quando o fluxo amadurecer.

Etapas e identificadores da planilha ficam no topo de `candidates.ts`, fáceis de
ajustar.

---

## Stack

React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3.

> O resultado acompanha o processo.
