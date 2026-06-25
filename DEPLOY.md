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
| `GOOGLE_SERVICE_ACCOUNT_JSON` | o JSON da conta de serviço (ver abaixo)          |
| `SHEET_ID` / `SHEET_TAB`      | (opcional) planilha/aba a ler                    |

> Se preferir manter o frontend em um serviço estático separado, defina
> `VITE_API_URL` (no build do frontend) com a URL do backend. O padrão é mesma
> origem, então **não precisa** num serviço único.

---

## Ler a planilha privada (conta de serviço)

Como a planilha é **particular**, o servidor precisa de uma identidade do Google
com permissão de leitura. Isso é feito uma vez:

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

| Método | Rota                          | Descrição                                   |
| ------ | ----------------------------- | ------------------------------------------- |
| GET    | `/api/health`                 | status (`db`, `sheet`)                      |
| GET    | `/api/candidates`             | candidatos da planilha + etapa salva        |
| PATCH  | `/api/candidates/:id/stage`   | salva a etapa de um card (`{ stage }`)      |

Etapas válidas: `novo`, `entrevista`, `entrevistado`, `experiencia`.
