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
npm install      # instala as dependências (frontend + backend)
npm run dev      # frontend em http://localhost:5173 (proxy /api → backend)
npm run server   # backend (API + banco) em http://localhost:8787
npm run build    # gera a versão de produção em dist/
npm start        # produção: servidor único (frontend + API) em :8787
```

O Kanban de Contratação depende do backend. Para o passo a passo de deploy
(Railway + PostgreSQL + conta de serviço Google), veja [`DEPLOY.md`](DEPLOY.md).

---

## Módulos e submódulos

O HUB é organizado em **7 módulos** (Comercial, Operações, RH & Desenvolvimento,
Financeiro, Jurídico, Documentos, Meu Perfil), cada um com seus **submódulos**.
Tudo vive em **um único arquivo**: [`src/data/modules.ts`](src/data/modules.ts).
A 2ª sidebar e o roteamento (`#modulo/submodulo`) aparecem sozinhos.

Para adicionar/ajustar um submódulo, edite o array `submodules` do módulo:

```ts
{
  id: 'metas',                 // id único dentro do módulo
  label: 'Metas',
  description: 'Descrição curta, em tom calmo e objetivo.',
  icon: TargetIcon,            // ícone de ../lib/icons
  status: 'ativo',             // ativo | em-breve
  content: { kind: 'placeholder' },
}
```

O campo `content` define o que o submódulo abre:

| `content.kind`  | abre                                                        |
| --------------- | ----------------------------------------------------------- |
| `placeholder`   | tela "Em desenvolvimento" (padrão dos submódulos sem dados) |
| `embed` + `url` | um sistema externo embutido (iframe), ex.: dashboard do CRM |
| `auditoria`     | os gráficos de Auditoria de Leads (`AuditoriaView`)         |
| `contratacao`   | o quadro de Recrutamento (`KanbanBoard`)                    |
| `videos`        | a biblioteca de Treinamentos (`VideosView`)                 |

Submódulos com `status: 'ativo'` ganham um ponto verde-oliva na lista; os
`em-breve`, um ponto areia. As permissões por módulo ficam em
[`src/auth/access.ts`](src/auth/access.ts).

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
├── auth/
│   ├── AuthContext.tsx        # estado de login (usuário, login/logout)
│   ├── api.ts                 # cliente HTTP autenticado + API de auth/usuários
│   └── access.ts              # ← regras de visibilidade por papel
├── components/
│   ├── Sidebar.tsx            # navegação (filtrada por papel) + usuário
│   ├── TopBar.tsx             # barra superior + busca
│   ├── LoginScreen.tsx        # tela de login
│   ├── ChangePasswordModal.tsx# trocar a própria senha
│   ├── WelcomeOverlay.tsx     # animação "Bem-vindo ao HUB"
│   ├── EmbedModal.tsx         # modal com conteúdo embutido (iframe)
│   ├── KanbanBoard.tsx        # quadro de Recrutamento (etapas + cards)
│   ├── CandidateDetailModal.tsx # dados do candidato + troca de etapa
│   ├── DashboardEmbed.tsx     # sistema externo embutido inline (iframe)
│   ├── AppointmentsMap.tsx    # mapa interativo (Leaflet) de agendamentos
│   └── AnoraLogo.tsx          # símbolo + lockup da marca
├── views/
│   ├── HomeView.tsx           # aba Início (central de controle)
│   ├── ModuleWorkspace.tsx    # módulo: 2ª sidebar de submódulos + conteúdo
│   ├── AuditoriaView.tsx      # Comercial › Indicadores (gráficos de leads)
│   ├── VideosView.tsx         # Documentos › Treinamentos
│   └── UsersView.tsx          # aba Usuários (gestão de acessos)
├── data/modules.ts           # ← os 7 módulos e seus submódulos (edite aqui)
├── lib/
│   ├── icons.tsx              # ícones de linha
│   └── candidates.ts          # cliente da API do Kanban
├── navigation.ts              # rotas (módulo + submódulo) via hash da URL
├── types.ts · App.tsx · index.css

server/                        # backend (Node + Express)
├── index.js                   # API + serve o frontend (produção)
├── auth.js                    # hash de senha (bcrypt) + tokens (JWT)
├── users.js                   # usuários e perfis + seed do Administrador
├── db.js                      # PostgreSQL (etapas + fallback memória)
├── sheets.js                  # leitura da planilha via conta de serviço Google
└── stages.js                  # etapas do Kanban (compartilhado)
```

### Navegação

A rota tem um módulo e, opcionalmente, um submódulo, refletidos no hash da URL:
`/#comercial` ou `/#comercial/indicadores` — links são compartilháveis. A tela de
boas-vindas roda a cada carregamento e respeita `prefers-reduced-motion`.

---

## Acessos e perfis

O HUB exige **login**. Cada perfil vê apenas os módulos liberados:

| Perfil                     | Módulos                                              |
| -------------------------- | --------------------------------------------------- |
| **Administrador** (Sócios) | todos + a aba **Usuários**                           |
| **Gerente Comercial**      | **Comercial** + Documentos + Meu Perfil             |
| **Gerente de Operações**   | **Operações** + **RH & Desenvolvimento** + Documentos + Meu Perfil |
| **Financeiro**             | **Financeiro** + **Jurídico** + Documentos + Meu Perfil |
| **Biomédica / Assistente Comercial / Recepcionista** | **Documentos** + **Meu Perfil** |

O Administrador é criado no primeiro boot (senha nos logs ou via `OWNER_PASSWORD`);
papéis antigos são migrados automaticamente.
A gestão de usuários (criar, redefinir senha, papel, ativar/remover) fica na aba
**Usuários**, e cada um troca a própria senha pelo rodapé do menu. As regras de
visibilidade estão em [`src/auth/access.ts`](src/auth/access.ts); os detalhes de
deploy em [`DEPLOY.md`](DEPLOY.md).

---

## Recrutamento (Kanban)

Em **RH & Desenvolvimento → Recrutamento** há um quadro com as etapas _Novo Candidato_,
_Marcando entrevista_, _Entrevistado_ e _Experiência 90 dias_. Cada resposta do
formulário de vagas vira um card; clicar no card abre os dados preenchidos e
permite mover a pessoa de etapa (arraste o card ou use os botões no modal).

**Arquitetura:** um backend Node/Express ([`server/`](server)) lê a planilha
(privada) com uma **conta de serviço** do Google e guarda as movimentações no
**PostgreSQL**. O frontend ([`src/lib/candidates.ts`](src/lib/candidates.ts))
apenas consome a API (`/api/candidates`). Sem credencial do Google, o quadro
mostra dados de exemplo (_modo demonstração_); sem `DATABASE_URL`, as etapas ficam
em memória.

O passo a passo de configuração (Railway, PostgreSQL e conta de serviço) está em
[`DEPLOY.md`](DEPLOY.md).

---

## Stack

**Frontend:** React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3.
**Backend:** Node · Express · PostgreSQL · JWT + bcrypt · Google Sheets API.

> O resultado acompanha o processo.
