// ============================================================
//  F&A Higienizações — GAS Financeiro v4
//  FluxoCaixa · CustosFixos
//  Os custos fixos são abatidos do lucro líquido no sistema.
// ============================================================
//  INSTALAÇÃO:
//  1. Cole este código em script.google.com
//  2. Salve (Ctrl+S)
//  3. Execute "instalarSistema" (Menu ⭐ → Configurar Planilha)
//  4. Implantar → Nova implantação
//     • Tipo: Aplicativo da Web
//     • Executar como: Eu
//     • Acesso: Qualquer pessoa
//  5. Copie a URL → cole em Configurações → URL Planilha Financeiro
// ============================================================

var SHEETS = {
  fluxo_caixa:  'FluxoCaixa',
  custos_fixos: 'CustosFixos',
};

var HEADERS = {
  fluxo_caixa:  ['id','tipo','descricao','valor','data','categoria','obs','cadastrado'],
  custos_fixos: ['id','descricao','valor','categoria','obs','cadastrado'],
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
    '✅ Planilha F&A Financeiro configurada!\n\n' +
    'Abas criadas:\n' +
    '• FluxoCaixa\n• CustosFixos\n\n' +
    '⚠️ Os Custos Fixos são abatidos automaticamente\n' +
    'do lucro líquido no sistema.\n\n' +
    'Próximo passo:\n' +
    '1. Implantar → Nova implantação\n' +
    '2. Tipo: Aplicativo da Web\n' +
    '3. Executar como: Eu\n' +
    '4. Acesso: Qualquer pessoa\n' +
    '5. Copie a URL → Configurações → URL Planilha Financeiro'
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
    .createMenu('⭐ F&A Financeiro')
    .addItem('🔧 Configurar Planilha (criar abas)', 'instalarSistema')
    .addItem('🎨 Atualizar Formatação', 'formatarAbas')
    .addSeparator()
    .addItem('💰 Resumo Financeiro do Mês', 'relResumoMes')
    .addItem('📈 Entradas por Categoria', 'relEntradasCategoria')
    .addItem('📉 Saídas por Categoria', 'relSaidasCategoria')
    .addItem('🏦 Custos Fixos Cadastrados', 'relCustosFixos')
    .addToUi();
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

function relResumoMes() {
  var mes = new Date().getMonth() + 1;
  var ano = new Date().getFullYear();
  var meses = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  var fluxo = sheetToJson(getOrCreateSheet(SHEETS.fluxo_caixa)).filter(function(r) {
    if (!r.data) return false;
    var d = new Date(r.data);
    return d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });

  var entradas    = fluxo.filter(function(r){ return r.tipo === 'entrada'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var saidas      = fluxo.filter(function(r){ return r.tipo === 'saida'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var custosFixos = sheetToJson(getOrCreateSheet(SHEETS.custos_fixos)).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var lucro       = entradas - saidas - custosFixos;

  SpreadsheetApp.getUi().alert(
    '💰 Resumo Financeiro — ' + meses[mes] + '/' + ano + '\n\n' +
    '📈 Entradas:     R$ ' + entradas.toFixed(2) + '\n' +
    '📉 Saídas:       R$ ' + saidas.toFixed(2) + '\n' +
    '🏦 Custos Fixos: R$ ' + custosFixos.toFixed(2) + '\n' +
    '─────────────────────\n' +
    '💵 Lucro Líquido: R$ ' + lucro.toFixed(2) + (lucro < 0 ? ' ⚠️ NEGATIVO' : ' ✅')
  );
}

function relEntradasCategoria() { _relCategoria('entrada', '📈 Entradas por Categoria'); }
function relSaidasCategoria()   { _relCategoria('saida',   '📉 Saídas por Categoria'); }

function _relCategoria(tipo, titulo) {
  var data = sheetToJson(getOrCreateSheet(SHEETS.fluxo_caixa)).filter(function(r){ return r.tipo === tipo; });
  var mapa = {};
  data.forEach(function(r) {
    var cat = r.categoria || 'Sem categoria';
    mapa[cat] = (mapa[cat] || 0) + (Number(r.valor) || 0);
  });
  var total  = data.reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var linhas = [titulo + '\n'];
  Object.keys(mapa).sort(function(a,b){ return mapa[b]-mapa[a]; }).forEach(function(cat) {
    linhas.push(cat + ': R$ ' + mapa[cat].toFixed(2));
  });
  linhas.push('─────────────\nTotal: R$ ' + total.toFixed(2));
  SpreadsheetApp.getUi().alert(linhas.join('\n'));
}

function relCustosFixos() {
  var data  = sheetToJson(getOrCreateSheet(SHEETS.custos_fixos));
  var total = data.reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var linhas = data.map(function(r) {
    return r.descricao + ' (' + (r.categoria||'—') + '): R$ ' + Number(r.valor||0).toFixed(2);
  });
  SpreadsheetApp.getUi().alert(
    '🏦 Custos Fixos Cadastrados (' + data.length + ')\n\n' +
    (linhas.length ? linhas.join('\n') : 'Nenhum custo fixo cadastrado.') +
    '\n─────────────\nTotal mensal: R$ ' + total.toFixed(2)
  );
}

// ─── Web App ──────────────────────────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? (e.parameter.acao || '') : '';
  if (acao === 'ping') return jsonOut({ ok: true, msg: 'FA Financeiro OK', version: 4 });
  if (acao === 'get_all') {
    return jsonOut({
      fluxo_caixa:  sheetToJson(getOrCreateSheet(SHEETS.fluxo_caixa)),
      custos_fixos: sheetToJson(getOrCreateSheet(SHEETS.custos_fixos)),
    });
  }
  return jsonOut({ ok: true, msg: 'FA Financeiro OK', version: 4 });
}

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message }); }

  if (data.acao === 'sync_fluxo') {
    jsonToSheet(getOrCreateSheet(SHEETS.fluxo_caixa),  data.fluxo_caixa  !== undefined ? data.fluxo_caixa  : [], HEADERS.fluxo_caixa);
    jsonToSheet(getOrCreateSheet(SHEETS.custos_fixos), data.custos_fixos !== undefined ? data.custos_fixos : [], HEADERS.custos_fixos);
    return jsonOut({ ok: true, msg: 'sync_fluxo ok' });
  }

  if (data.acao === 'delete') {
    var sheetKey = data.sheet;
    if (!SHEETS[sheetKey]) return jsonOut({ ok: false, error: 'Sheet inválido: ' + sheetKey });
    var deleted = deleteRowById(getOrCreateSheet(SHEETS[sheetKey]), data.id);
    return jsonOut({ ok: deleted, deleted: deleted });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
