// ============================================================
//  F&A Higienizações — GAS Controle de Equipe v4
// ============================================================
//  INSTALAÇÃO:
//  1. Cole este código em script.google.com
//  2. Salve (Ctrl+S)
//  3. Execute "instalarSistema" uma vez (cria as abas)
//  4. Implantar → Nova implantação
//     • Tipo: Aplicativo da Web
//     • Executar como: Eu (você)
//     • Quem tem acesso: Qualquer pessoa
//  5. Copie a URL → cole em Configurações → URL Planilha Equipe
// ============================================================

var SHEETS = {
  equipe_avaliacoes: 'EquipeAvaliacoes',
};

var HEADERS = {
  equipe_avaliacoes: [
    'id', 'funcionarioId', 'funcionarioNome',
    'tipo', 'motivo', 'descricao',
    'ordemServico', 'origem', 'data', 'cadastrado'
  ],
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); }).filter(Boolean);
  return data.slice(1)
    .filter(function(row) { return row[0] !== '' && row[0] !== null && row[0] !== undefined; })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
}

function jsonToSheet(sheet, rows, headerDef) {
  sheet.clearContents();
  var headers = (rows && rows.length > 0) ? Object.keys(rows[0]) : (headerDef || null);
  if (!headers) return;

  // Cabeçalho
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  if (!rows || rows.length === 0) {
    try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
    return;
  }

  var values = rows.map(function(r) {
    return headers.map(function(h) { return (r[h] !== undefined && r[h] !== null) ? r[h] : ''; });
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
}

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var idCol = data[0].map(function(h) { return String(h).toLowerCase(); }).indexOf('id');
  if (idCol < 0) return false;
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === String(id)) {
      sheet.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

// ─── Instalação / Menu ────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⭐ F&A Equipe')
    .addItem('🔧 Configurar Planilha (criar abas)', 'instalarSistema')
    .addSeparator()
    .addItem('📊 Ver Total de Avaliações', 'relTotais')
    .addItem('🏆 Ranking do Mês', 'relRankingMes')
    .addItem('🎂 Funcionários com mais elogios', 'relElogios')
    .addItem('❌ Funcionários com mais reclamações', 'relReclamacoes')
    .addToUi();
}

function instalarSistema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Cria aba EquipeAvaliacoes se não existir
  var sheet = getOrCreateSheet(SHEETS.equipe_avaliacoes);
  if (sheet.getLastRow() === 0 || sheet.getRange(1,1).getValue() === '') {
    sheet.getRange(1, 1, 1, HEADERS.equipe_avaliacoes.length)
      .setValues([HEADERS.equipe_avaliacoes]);
    sheet.getRange(1, 1, 1, HEADERS.equipe_avaliacoes.length)
      .setBackground('#1a1a2e')
      .setFontColor('#d4af37')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    try { sheet.autoResizeColumns(1, HEADERS.equipe_avaliacoes.length); } catch(e) {}
  }

  SpreadsheetApp.getUi().alert(
    '✅ Planilha F&A Equipe configurada!\n\n' +
    'Aba criada: EquipeAvaliacoes\n\n' +
    'Próximo passo:\n' +
    '1. Implantar → Nova implantação\n' +
    '2. Tipo: Aplicativo da Web\n' +
    '3. Executar como: Eu\n' +
    '4. Acesso: Qualquer pessoa\n' +
    '5. Copie a URL → cole em Configurações → URL Planilha Equipe'
  );
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

function relTotais() {
  var sheet = getOrCreateSheet(SHEETS.equipe_avaliacoes);
  var data = sheetToJson(sheet);
  var elogios     = data.filter(function(r){ return r.tipo === 'elogio'; }).length;
  var reclamacoes = data.filter(function(r){ return r.tipo === 'reclamacao'; }).length;
  var retrabalhos = data.filter(function(r){ return r.tipo === 'retrabalho'; }).length;
  SpreadsheetApp.getUi().alert(
    '📊 Total de Avaliações\n\n' +
    '👍 Elogios: ' + elogios + '\n' +
    '👎 Reclamações: ' + reclamacoes + '\n' +
    '🔁 Retrabalhos: ' + retrabalhos + '\n' +
    '─────────────────\n' +
    'Total: ' + data.length
  );
}

function relRankingMes() {
  var sheet = getOrCreateSheet(SHEETS.equipe_avaliacoes);
  var data  = sheetToJson(sheet);
  var mes   = new Date().getMonth() + 1;
  var ano   = new Date().getFullYear();

  // Filtra mês atual
  var doMes = data.filter(function(r) {
    if (!r.data) return false;
    var d = new Date(r.data);
    return d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });

  // Agrupa por funcionário
  var mapa = {};
  doMes.forEach(function(r) {
    var nome = r.funcionarioNome || 'Desconhecido';
    if (!mapa[nome]) mapa[nome] = { elogios: 0, reclamacoes: 0, retrabalhos: 0 };
    if (r.tipo === 'elogio')      mapa[nome].elogios++;
    if (r.tipo === 'reclamacao')  mapa[nome].reclamacoes++;
    if (r.tipo === 'retrabalho')  mapa[nome].retrabalhos++;
  });

  var meses = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var linhas = ['🏆 Ranking de ' + meses[mes] + '/' + ano + '\n'];
  Object.keys(mapa).forEach(function(nome) {
    var r = mapa[nome];
    linhas.push(nome + ': 👍' + r.elogios + ' 👎' + r.reclamacoes + ' 🔁' + r.retrabalhos);
  });
  if (linhas.length === 1) linhas.push('Nenhuma avaliação neste mês.');

  SpreadsheetApp.getUi().alert(linhas.join('\n'));
}

function relElogios() {
  _relTipo('elogio', '👍 Mais Elogios (total)');
}

function relReclamacoes() {
  _relTipo('reclamacao', '👎 Mais Reclamações (total)');
}

function _relTipo(tipo, titulo) {
  var data = sheetToJson(getOrCreateSheet(SHEETS.equipe_avaliacoes));
  var mapa = {};
  data.filter(function(r){ return r.tipo === tipo; }).forEach(function(r) {
    var n = r.funcionarioNome || 'Desconhecido';
    mapa[n] = (mapa[n] || 0) + 1;
  });
  var sorted = Object.keys(mapa).sort(function(a,b){ return mapa[b] - mapa[a]; });
  var linhas = [titulo + '\n'];
  sorted.slice(0, 10).forEach(function(n, i) {
    linhas.push((i+1) + '. ' + n + ': ' + mapa[n]);
  });
  if (!sorted.length) linhas.push('Nenhum registro.');
  SpreadsheetApp.getUi().alert(linhas.join('\n'));
}

// ─── Web App ──────────────────────────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? (e.parameter.acao || '') : '';

  if (acao === 'ping') {
    return jsonOut({ ok: true, msg: 'FA Equipe OK', version: 4 });
  }

  if (acao === 'get_all') {
    return jsonOut({
      equipe_avaliacoes: sheetToJson(getOrCreateSheet(SHEETS.equipe_avaliacoes)),
    });
  }

  return jsonOut({ ok: true, msg: 'FA Equipe OK', version: 4 });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  // ── Sync completo (array vazio = limpa planilha, funciona para delete) ────
  if (data.acao === 'sync_equipe') {
    var rows = data.equipe_avaliacoes !== undefined ? data.equipe_avaliacoes : [];
    jsonToSheet(getOrCreateSheet(SHEETS.equipe_avaliacoes), rows, HEADERS.equipe_avaliacoes);
    return jsonOut({ ok: true, msg: 'sync_equipe ok', total: rows.length });
  }

  // ── Delete por ID (operação pontual) ──────────────────────────────────────
  if (data.acao === 'delete') {
    var sheetKey = data.sheet;
    if (!SHEETS[sheetKey]) return jsonOut({ ok: false, error: 'Sheet inválido: ' + sheetKey });
    var deleted = deleteRowById(getOrCreateSheet(SHEETS[sheetKey]), data.id);
    return jsonOut({ ok: deleted, deleted: deleted });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
