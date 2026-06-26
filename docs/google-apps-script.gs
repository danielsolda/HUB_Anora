/**
 * HUB Anora — leitura da planilha de candidatos (Contratação).
 *
 * COMO USAR
 * 1. Abra a planilha de respostas → menu Extensões → Apps Script.
 * 2. Apague o conteúdo e cole este arquivo.
 * 3. Troque o TOKEN abaixo por um texto secreto (qualquer coisa difícil).
 * 4. (Opcional) ajuste VAGA_POR_ABA com os nomes EXATOS das suas abas.
 * 5. Implantar → Nova implantação → tipo "App da Web":
 *      - Executar como: Eu
 *      - Quem pode acessar: Qualquer pessoa
 *    Copie a URL que termina em /exec.
 * 6. No Railway, defina:
 *      APPS_SCRIPT_URL   = a URL /exec
 *      APPS_SCRIPT_TOKEN = o mesmo TOKEN deste arquivo
 *
 * Teste no navegador:  SUA_URL/exec?token=SEU_TOKEN
 * Deve devolver um JSON com { candidates: [...], abas: [...] }.
 */

const TOKEN = 'TROQUE-ESTE-TOKEN'

// Nome EXATO da aba → nome da vaga exibido no quadro.
// Se uma aba não estiver aqui, usamos o próprio nome dela como vaga.
const VAGA_POR_ABA = {
  // 'Respostas Gestora': 'Gestora Comercial',
  // 'Respostas Assistente': 'Assistente',
}

// Abas a ignorar (ex.: uma aba de configuração/auxiliar).
const IGNORAR_ABAS = []

function doGet(e) {
  if (!e || (e.parameter.token || '') !== TOKEN) {
    return json({ error: 'unauthorized' })
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const tz = ss.getSpreadsheetTimeZone()
  const candidates = []

  ss.getSheets().forEach(function (sheet) {
    const nome = sheet.getName()
    if (IGNORAR_ABAS.indexOf(nome) !== -1) return

    const vaga = VAGA_POR_ABA[nome] || nome
    const values = sheet.getDataRange().getValues()
    if (values.length < 2) return

    const headers = values[0].map(function (h) {
      return String(h).trim()
    })

    for (var i = 1; i < values.length; i++) {
      const row = values[i]
      const vazia = row.every(function (c) {
        return String(c).trim() === ''
      })
      if (vazia) continue

      const fields = {}
      headers.forEach(function (h, idx) {
        if (h) fields[h] = cellToString(row[idx], tz)
      })
      candidates.push({ vaga: vaga, fields: fields })
    }
  })

  return json({
    candidates: candidates,
    abas: ss.getSheets().map(function (s) {
      return s.getName()
    }),
  })
}

function cellToString(v, tz) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, tz, 'dd/MM/yyyy HH:mm')
  }
  return v === '' || v === null ? '' : String(v)
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
