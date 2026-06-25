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

### Adicionar uma categoria

No mesmo arquivo, inclua um item em `categories` e use o novo `id` no campo
`category` dos serviços. O tipo `CategoryId` em
[`src/types.ts`](src/types.ts) também precisa do novo id.

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

```
src/
├── components/      # Header, Hero, ServiceCard, Footer, AnoraLogo
├── data/
│   └── services.ts  # ← registro de serviços e categorias (edite aqui)
├── lib/
│   └── icons.tsx    # ícones de linha
├── types.ts         # tipos (Service, Category, status)
├── App.tsx          # montagem da página + busca/filtro
└── index.css        # estilos base + tokens
```

---

## Stack

React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3.

> O resultado acompanha o processo.
