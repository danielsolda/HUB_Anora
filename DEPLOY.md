# Deploy — HUB Anora

O HUB agora é um **serviço único**: um servidor Node (Express) que serve o
frontend (build do Vite) e a API do Kanban na mesma URL. As movimentações dos
cards ficam no **PostgreSQL**, e a planilha (privada) é lida no servidor por uma
**conta de serviço** do Google.

```
Navegador ──▶ Node/Express ──▶ PostgreSQL (etapas dos cards)
                          └──▶ Google Sheets API (planilha de vagas, leitura)
```

---

## Rodando localmente

```bash
npm install

# Opção A — dois processos (hot reload do frontend):
npm run server      # backend em http://localhost:8787
npm run dev         # frontend em http://localhost:5173 (proxy /api → 8787)

# Opção B — como em produção (servidor serve o build):
npm run build
npm start           # http://localhost:8787 (frontend + API)
```

Sem `DATABASE_URL`, o servidor usa memória (não persiste). Sem
`GOOGLE_SERVICE_ACCOUNT_JSON`, o Kanban mostra dados de exemplo.

Variáveis: copie [`.env.example`](.env.example) e ajuste (ou exporte no shell).

---

## Deploy no Railway

### 1. Banco de dados

No projeto do Railway: **New → Database → PostgreSQL**. O Railway injeta a
variável `DATABASE_URL` no serviço automaticamente. A tabela é criada sozinha no
primeiro boot.

### 2. Serviço do HUB

Aponte o serviço para este repositório e use:

- **Build:** `npm run build`
- **Start:** `npm start`

(O Nixpacks do Railway geralmente detecta isso sozinho a partir do
`package.json`.)

### 3. Variáveis de ambiente

| Variável                      | Valor                                            |
| ----------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                | injetada pelo plugin PostgreSQL                  |
| `JWT_SECRET`                  | segredo longo p/ assinar logins (defina!)        |
| `APPS_SCRIPT_URL` / `_TOKEN`  | ler a planilha via Apps Script (opção A, abaixo) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ler a planilha via conta de serviço (opção B)    |
| `OWNER_PASSWORD`              | (opcional) senha inicial do dono                 |
| `SHEET_ID` / `SHEET_TAB`      | (opcional) planilha/aba a ler                    |

> Se preferir manter o frontend em um serviço estático separado, defina
> `VITE_API_URL` (no build do frontend) com a URL do backend. O padrão é mesma
> origem, então **não precisa** num serviço único.

---

## Login e usuários

O acesso ao HUB exige login. Os perfis seguem a estrutura da plataforma
(módulos Comercial, Operações/RH, Financeiro, Documentos…):

| Perfil                     | O que enxerga                                    |
| -------------------------- | ------------------------------------------------ |
| **Administrador** (Sócios) | tudo, incluindo a aba **Usuários**               |
| **Gerente Comercial**      | **Análise** e **Auditoria** (Comercial) + Vídeos |
| **Gerente de Operações**   | **Gestão/Contratação** (RH) + Vídeos             |
| **Financeiro**             | **Financeiro** + Vídeos                          |
| **Biomédica / Assistente Comercial / Recepcionista** | apenas **Vídeos** (Documentos) |

> A reorganização visual em módulos/submódulos (Comercial, Operações, RH &
> Desenvolvimento, Financeiro, Jurídico, Documentos, Meu Perfil) virá numa
> próxima etapa; a matriz de permissões acima já foi escrita pensando nela.

**Primeiro acesso (Administrador).** No primeiro boot, o sistema cria o usuário
`contatodanielsolda@gmail.com` com papel Administrador. Papéis antigos
(`dono`/`gestor`/`vendedor`) são migrados automaticamente no boot. A senha:

- se você definir `OWNER_PASSWORD`, é essa;
- senão, é **aleatória e aparece nos logs do serviço** (Railway → Deployments →
  View logs), num bloco `=== USUÁRIO DONO CRIADO ===`.

Entre com ela e troque em **Trocar senha** (no rodapé do menu). Defina também
`JWT_SECRET` para que os logins não caiam a cada deploy.

> **Recuperação de acesso.** Se o dono já existe e você não sabe a senha, defina
> `OWNER_PASSWORD` e faça um novo deploy: a senha do dono é **sincronizada com
> esse valor a cada boot** (e o acesso é reativado). Depois de entrar, **remova a
> variável `OWNER_PASSWORD`** — senão a troca de senha pelo app volta atrás no
> próximo deploy.

**Recriar senha.** Cada um pode trocar a própria senha logado. O Administrador
redefine a senha de qualquer usuário na aba **Usuários** (gera uma senha nova para
repassar). Novos usuários também são criados ali.

---

## Ler a planilha privada

Como a planilha é **particular**, o servidor precisa de permissão para lê-la. Há
dois caminhos — escolha **um**.

### Opção A — Google Apps Script (mais simples)

1. Abra a planilha → **Extensões → Apps Script**.
2. Cole o conteúdo de [`docs/google-apps-script.gs`](docs/google-apps-script.gs)
   e troque o `TOKEN` por um texto secreto.
3. **Implantar → Nova implantação → App da Web** (executar como: você; acesso:
   qualquer pessoa). Copie a URL que termina em `/exec`.
4. No Railway, defina `APPS_SCRIPT_URL` (a URL) e `APPS_SCRIPT_TOKEN` (o mesmo
   token do script).

O script lê **todas as abas** e marca a **vaga** de cada candidato pelo nome da
aba (ajustável no `VAGA_POR_ABA`). A planilha continua privada (o script roda
como você).

### Opção B — Conta de serviço (Sheets API)

Outra forma: criar uma identidade do Google com permissão de leitura. Feito uma
vez:

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie (ou
   selecione) um projeto.
2. Em **APIs e serviços → Biblioteca**, ative a **Google Sheets API**.
3. Em **APIs e serviços → Credenciais → Criar credenciais → Conta de serviço**.
   Crie a conta.
4. Na conta de serviço, aba **Chaves → Adicionar chave → JSON**. Baixe o arquivo.
5. Copie o e-mail da conta de serviço (algo como
   `nome@projeto.iam.gserviceaccount.com`).
6. Na **planilha de respostas**, clique em **Compartilhar** e adicione esse
   e-mail como **Leitor**. (A planilha continua privada para o resto.)
7. No Railway, defina `GOOGLE_SERVICE_ACCOUNT_JSON` com o **conteúdo do JSON**
   baixado (em uma linha; também aceita base64).

Pronto: o servidor passa a ler os candidatos reais. Cada nova resposta do
formulário aparece como card; mover um card grava a etapa no PostgreSQL.

---

## API

| Método | Rota                            | Descrição                                 |
| ------ | ------------------------------- | ----------------------------------------- |
| GET    | `/api/health`                   | status (`db`, `dbConnected`, `sheet`)     |
| POST   | `/api/auth/login`               | login (`{ email, password }`) → token     |
| GET    | `/api/auth/me`                  | usuário do token                          |
| POST   | `/api/auth/change-password`     | troca a própria senha                     |
| GET    | `/api/users`                    | lista usuários (admin)                    |
| POST   | `/api/users`                    | cria usuário (admin)                      |
| PATCH  | `/api/users/:id`                | papel/nome/ativo (admin)                  |
| POST   | `/api/users/:id/reset-password` | redefine senha (admin)                    |
| DELETE | `/api/users/:id`                | remove usuário (admin)                    |
| GET    | `/api/stages`                  | lista as etapas do quadro (admin/operações) |
| POST/PATCH/DELETE | `/api/stages…`      | cria/edita/remove etapas (admin/operações) |
| PUT    | `/api/stages/order`            | reordena as etapas (admin/operações)       |
| GET    | `/api/audit`                   | auditoria: série mensal + linhas (admin/comercial) |
| GET    | `/api/candidates`              | candidatos + etapa salva (admin/operações) |
| PATCH  | `/api/candidates/:id/stage`    | salva a etapa de um card (admin/operações) |
| GET    | `/api/candidates/seen`         | ids já vistos por este usuário (admin/operações) |
| POST   | `/api/candidates/:id/seen`     | marca um card como visto (admin/operações) |
| GET    | `/api/colaboradores`           | lista colaboradores (admin/operações)      |
| POST   | `/api/colaboradores`           | cria colaborador (admin/operações)         |
| GET/PATCH/DELETE | `/api/colaboradores/:id` | lê/edita/remove colaborador (admin/operações) |
| GET/POST | `/api/colaboradores/:id/registros` | registros da ficha por tipo (admin/operações) |
| PATCH/DELETE | `/api/colaboradores/:id/registros/:rid` | edita/remove registro (admin/operações) |
| GET/POST | `/api/financeiro/lancamentos` | contas a pagar/receber por tipo (admin/financeiro) |
| GET/PATCH/DELETE | `/api/financeiro/lancamentos/:id` | lê/edita/remove lançamento (admin/financeiro) |
| GET    | `/api/financeiro/fluxo`        | fluxo de caixa mensal: realizado/previsto (admin/financeiro) |

As etapas do Kanban são configuráveis (engrenagem do quadro) e ficam no banco
(`kanban_stages`), começando com as quatro padrão. Os colaboradores ficam na
tabela `colaboradores`, e os registros da ficha (advertências, suspensões,
férias, avaliações…) na `colaborador_registros` (RH & Desenvolvimento). As
contas a pagar/receber ficam em `financeiro_lancamentos` (valores em centavos).
Perfis: `admin`, `gerente_comercial`, `gerente_operacoes`, `financeiro`,
`biomedica`, `assistente_comercial`, `recepcionista`.
