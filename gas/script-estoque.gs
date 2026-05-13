// ============================================================
//  F&A Higienizações — GAS Estoque v4
//  Estoque · Movimentos · Veículos · Abastecimentos · Controle de Óleo
// ============================================================
//  INSTALAÇÃO:
//  1. Cole este código em script.google.com
//  2. Salve (Ctrl+S)
//  3. Execute "instalarSistema" (Menu ⭐ → Configurar Planilha)
//  4. Implantar → Nova implantação
//     • Tipo: Aplicativo da Web
//     • Executar como: Eu
//     • Acesso: Qualquer pessoa
//  5. Copie a URL → cole em Configurações → URL Planilha Estoque
// ============================================================

var SHEETS = {
  estoque:        'Estoque',
  estoque_mov:    'EstoqueMovimentos',
  veiculos:       'Veiculos',
  abastecimentos: 'Abastecimentos',
  trocas_oleo:    'TrocasOleo',          // ← novo: controle de óleo
};

var HEADERS = {
  estoque: ['id','nome','categoria','unidade','qtdAtual','qtdMinima','localizacao','cadastrado'],
  estoque_mov: ['id','itemId','itemNome','tipo','qtd','motivo','responsavel','data','cadastrado'],
  // veiculos agora inclui campos de controle de óleo
  veiculos: [
    'id','placa','modelo','ano','cor','combustivel','hodometroAtual','cadastrado',
    'metaKmOleo','hodometroUltimaTroca','dataUltimaTroca','dataProximaTroca'
  ],
  abastecimentos: [
    'id','veiculoId','veiculoPlaca','veiculoModelo',
    'data','horario','hodometro','litros','valorLitro','valorTotal',
    'combustivel','posto','motorista','obs','cadastrado'
  ],
  trocas_oleo: [
    'id','veiculoId','veiculoPlaca','veiculoModelo',
    'hodometro','litros','valorLitro','valorTotal',
    'motorista','obs','data','cadastrado'
  ],
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonToSheet(sheet, rows, headerDef) {
  sheet.clearContents();
  var headers = (rows && rows.length > 0) ? Object.keys(rows[0]) : (headerDef || null);
  if (!headers) return;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');
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

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  var idCol = data[0].map(function(h) { return String(h).toLowerCase(); }).indexOf('id');
  if (idCol < 0) return false;
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === String(id)) { sheet.deleteRow(r + 1); return true; }
  }
  return false;
}

// ─── Instalação ───────────────────────────────────────────────────────────────

function instalarSistema() {
  Object.keys(SHEETS).forEach(function(key) {
    var sheet = getOrCreateSheet(SHEETS[key]);
    if (sheet.getLastRow() === 0 || sheet.getRange(1,1).getValue() === '') {
      sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
      sheet.getRange(1, 1, 1, HEADERS[key].length)
        .setBackground('#1a1a2e').setFontColor('#d4af37')
        .setFontWeight('bold').setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
      try { sheet.autoResizeColumns(1, HEADERS[key].length); } catch(e) {}
    }
  });

  SpreadsheetApp.getUi().alert(
    '✅ Planilha F&A Estoque configurada!\n\n' +
    'Abas criadas:\n' +
    '• Estoque\n• EstoqueMovimentos\n• Veiculos\n• Abastecimentos\n• TrocasOleo\n\n' +
    'Próximo passo:\n' +
    '1. Implantar → Nova implantação\n' +
    '2. Tipo: Aplicativo da Web\n' +
    '3. Executar como: Eu\n' +
    '4. Acesso: Qualquer pessoa\n' +
    '5. Copie a URL → Configurações → URL Planilha Estoque'
  );
}

function formatarAbas() {
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      sheet.getRange(1, 1, 1, lastCol)
        .setBackground('#1a1a2e').setFontColor('#d4af37')
        .setFontWeight('bold').setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  });
  SpreadsheetApp.getUi().alert('✅ Formatação aplicada!');
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⭐ F&A Estoque')
    .addItem('🔧 Configurar Planilha (criar abas)', 'instalarSistema')
    .addItem('🎨 Atualizar Formatação', 'formatarAbas')
    .addSeparator()
    .addItem('📦 Itens abaixo do mínimo', 'relAbaixoMinimo')
    .addItem('🚗 Status de Óleo dos Veículos', 'relStatusOleo')
    .addItem('⛽ Resumo de Abastecimentos', 'relAbastecimentos')
    .addItem('🛢 Histórico de Trocas de Óleo', 'relTrocasOleo')
    .addToUi();
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

function relAbaixoMinimo() {
  var items = sheetToJson(getOrCreateSheet(SHEETS.estoque))
    .filter(function(r) { return Number(r.qtdAtual) < Number(r.qtdMinima); });
  var linhas = items.map(function(r) {
    return r.nome + ' | Atual: ' + r.qtdAtual + ' ' + r.unidade + ' | Mínimo: ' + r.qtdMinima;
  });
  SpreadsheetApp.getUi().alert('📦 Itens abaixo do mínimo (' + items.length + '):\n\n' + (linhas.length ? linhas.join('\n') : 'Todos os itens estão OK.'));
}

function relStatusOleo() {
  var veiculos = sheetToJson(getOrCreateSheet(SHEETS.veiculos));
  if (!veiculos.length) { SpreadsheetApp.getUi().alert('Nenhum veículo cadastrado.'); return; }
  var linhas = ['🛢 Status de Óleo dos Veículos\n'];
  veiculos.forEach(function(v) {
    var meta    = Number(v.metaKmOleo) || 0;
    var hodAtual = Number(v.hodometroAtual) || 0;
    var hodTroca = Number(v.hodometroUltimaTroca) || 0;
    var kmFeito  = hodAtual - hodTroca;
    var pct      = meta > 0 ? Math.min(100, Math.round((kmFeito / meta) * 100)) : 0;
    var status   = pct >= 90 ? '🔴 URGENTE' : pct >= 70 ? '🟡 Próximo' : '🟢 OK';
    linhas.push(v.placa + ' — ' + v.modelo + ': ' + status + ' (' + pct + '%)');
    if (meta > 0) linhas.push('  Km restantes: ' + Math.max(0, meta - kmFeito));
    if (v.dataProximaTroca) linhas.push('  Próxima troca: ' + v.dataProximaTroca);
  });
  SpreadsheetApp.getUi().alert(linhas.join('\n'));
}

function relAbastecimentos() {
  var data  = sheetToJson(getOrCreateSheet(SHEETS.abastecimentos));
  var total = data.reduce(function(s, r) { return s + (Number(r.valorTotal) || 0); }, 0);
  var litros = data.reduce(function(s, r) { return s + (Number(r.litros) || 0); }, 0);
  SpreadsheetApp.getUi().alert(
    '⛽ Resumo de Abastecimentos\n\n' +
    'Total de registros: ' + data.length + '\n' +
    'Total de litros: ' + litros.toFixed(2) + ' L\n' +
    'Total gasto: R$ ' + total.toFixed(2)
  );
}

function relTrocasOleo() {
  var data  = sheetToJson(getOrCreateSheet(SHEETS.trocas_oleo));
  var total = data.reduce(function(s, r) { return s + (Number(r.valorTotal) || 0); }, 0);
  var linhas = data.map(function(r) {
    return r.veiculoPlaca + ' — ' + (r.data || '') + ' | R$ ' + Number(r.valorTotal || 0).toFixed(2);
  });
  SpreadsheetApp.getUi().alert(
    '🛢 Histórico de Trocas de Óleo (' + data.length + ')\n\n' +
    (linhas.length ? linhas.join('\n') : 'Nenhuma troca registrada.') +
    '\n─────────────\nTotal gasto: R$ ' + total.toFixed(2)
  );
}

// ─── Web App ──────────────────────────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? (e.parameter.acao || '') : '';
  if (acao === 'ping') return jsonOut({ ok: true, msg: 'FA Estoque OK', version: 4 });
  if (acao === 'get_all') {
    var result = {};
    Object.keys(SHEETS).forEach(function(key) {
      result[key] = sheetToJson(getOrCreateSheet(SHEETS[key]));
    });
    return jsonOut(result);
  }
  return jsonOut({ ok: true, msg: 'FA Estoque OK', version: 4 });
}

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message }); }

  if (data.acao === 'sync_estoque') {
    jsonToSheet(getOrCreateSheet(SHEETS.estoque),        data.estoque        !== undefined ? data.estoque        : [], HEADERS.estoque);
    jsonToSheet(getOrCreateSheet(SHEETS.estoque_mov),    data.estoque_mov    !== undefined ? data.estoque_mov    : [], HEADERS.estoque_mov);
    jsonToSheet(getOrCreateSheet(SHEETS.veiculos),       data.veiculos       !== undefined ? data.veiculos       : [], HEADERS.veiculos);
    jsonToSheet(getOrCreateSheet(SHEETS.abastecimentos), data.abastecimentos !== undefined ? data.abastecimentos : [], HEADERS.abastecimentos);
    jsonToSheet(getOrCreateSheet(SHEETS.trocas_oleo),    data.trocas_oleo    !== undefined ? data.trocas_oleo    : [], HEADERS.trocas_oleo);
    return jsonOut({ ok: true, msg: 'sync_estoque ok' });
  }

  if (data.acao === 'delete') {
    var sheetKey = data.sheet;
    if (!SHEETS[sheetKey]) return jsonOut({ ok: false, error: 'Sheet inválido: ' + sheetKey });
    var deleted = deleteRowById(getOrCreateSheet(SHEETS[sheetKey]), data.id);
    return jsonOut({ ok: deleted, deleted: deleted });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
