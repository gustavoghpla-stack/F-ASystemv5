// ============================================================
//  F&A Higienizações — GAS Principal v5 (RH)
//  Funcionários · Bancos · Escalas · Documentos · Usuários
// ============================================================
//  INSTALAÇÃO:
//  1. Cole este código em script.google.com
//  2. Salve (Ctrl+S)
//  3. Execute "instalarSistema" (Menu ⭐ → Configurar Planilha)
//  4. Implantar → Nova implantação
//     • Tipo: Aplicativo da Web
//     • Executar como: Eu
//     • Acesso: Qualquer pessoa
//  5. Copie a URL → cole em Configurações → URL Planilha Funcionários
// ============================================================

var SHEETS = {
  func:        'Funcionários',
  bancos:      'Bancos_PIX',
  escalas:     'Escalas',
  docs:        'Documentos',
  users:       'Usuários',
  fluxo_caixa: 'FluxoCaixa',
};

var HEADERS = {
  func: [
    'id','nome','nasc','sexo','rh','estcivil','natural','uf','escol',
    'pai','mae','end','compl','cep','cidade','bairro','ufend',
    'tel','cel','email','cpf','rg','ufrg','emissrg','pis',
    'ctps','seriectps','emissctps','titulo','secao','zona',
    'cnh','catcnh','venccnh','reserv','empresa','cnpj','primemp','sindical',
    'admissao','demissao','funcao','horario','salario',
    'ticket','valdia','vtransp','valdiat','descvt','descvr',
    'planosaude','exp','banco','agencia','conta','tipoconta',
    'pix','tipopix','foto','cadastrado'
  ],
  bancos:      ['id','funcId','funcNome','banco','codigo','agencia','conta','tipo','tipopix','chavepix','obs','cadastrado'],
  escalas:     ['id','desc','cadastrado'],
  docs:        ['id','desc','obrig'],
  users:       ['id','nome','email','senha','nivel','foto','cadastrado'],
  fluxo_caixa: ['id','tipo','descricao','valor','data','categoria','obs','cadastrado'],
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

// ─── Instalação ───────────────────────────────────────────────────────────────

function instalarSistema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

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

  // Documentos padrão
  var docsSheet = getOrCreateSheet(SHEETS.docs);
  if (docsSheet.getLastRow() <= 1) {
    var docs = [
      [1,'02 Fotos 3x4 recentes','Sim'],
      [2,'Cópia do CPF','Sim'],
      [3,'Cópia do RG (Identidade)','Sim'],
      [4,'Cópia do Título de Eleitor','Sim'],
      [5,'Cópia do Comprovante de Residência','Sim'],
      [6,'Cópia da Certidão de Nascimento ou Casamento','Sim'],
      [7,'Cópia da Carteira de Trabalho (CTPS)','Sim'],
      [8,'Cópia do PIS/PASEP','Sim'],
      [9,'Cópia do Certificado de Reservista (masculino)','Sim'],
      [10,'Atestado de Saúde Ocupacional (ASO)','Sim'],
      [11,'Cópia da CNH (se motorista)','Não'],
      [12,'Certidão de Nascimento dos filhos (menores de 14 anos)','Não'],
      [13,'Comprovante de escolaridade','Não']
    ];
    docsSheet.getRange(2, 1, docs.length, 3).setValues(docs);
  }

  SpreadsheetApp.getUi().alert(
    '✅ Planilha F&A RH configurada!\n\n' +
    'Abas criadas:\n' +
    '• Funcionários\n• Bancos_PIX\n• Escalas\n• Documentos\n• Usuários\n• FluxoCaixa\n\n' +
    'Próximo passo:\n' +
    '1. Implantar → Nova implantação\n' +
    '2. Tipo: Aplicativo da Web\n' +
    '3. Executar como: Eu\n' +
    '4. Acesso: Qualquer pessoa\n' +
    '5. Copie a URL → Configurações no sistema'
  );
}

function formatarTodasAbas() {
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
    .createMenu('⭐ F&A Higienizações')
    .addItem('🔧 Configurar Planilha (criar abas)', 'instalarSistema')
    .addItem('🎨 Atualizar Formatação', 'formatarTodasAbas')
    .addSeparator()
    .addItem('🎂 Aniversariantes do Mês', 'relAniversariantes')
    .addItem('✅ Funcionários Ativos', 'relAtivos')
    .addItem('❌ Funcionários Desligados', 'relDesligados')
    .addItem('💼 Funcionários por Função', 'relPorFuncao')
    .addItem('💰 Resumo de Salários', 'relSalarios')
    .addToUi();
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

function relAniversariantes() {
  var data  = sheetToJson(getOrCreateSheet(SHEETS.func));
  var mes   = new Date().getMonth() + 1;
  var meses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var result = data.filter(function(r) {
    if (!r.nasc) return false;
    return new Date(r.nasc).getMonth() + 1 === mes;
  }).map(function(r) {
    return r.nome + ' — ' + new Date(r.nasc).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
  });
  SpreadsheetApp.getUi().alert('🎂 Aniversariantes de ' + meses[mes] + ':\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}

function relAtivos() {
  var result = sheetToJson(getOrCreateSheet(SHEETS.func))
    .filter(function(r) { return !r.demissao; })
    .map(function(r) { return r.nome + ' | ' + (r.funcao || '—'); });
  SpreadsheetApp.getUi().alert('✅ Ativos (' + result.length + '):\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}

function relDesligados() {
  var result = sheetToJson(getOrCreateSheet(SHEETS.func))
    .filter(function(r) { return r.demissao; })
    .map(function(r) { return r.nome + ' | Demissão: ' + r.demissao; });
  SpreadsheetApp.getUi().alert('❌ Desligados (' + result.length + '):\n\n' + (result.length ? result.join('\n') : 'Nenhum.'));
}

function relPorFuncao() {
  var data = sheetToJson(getOrCreateSheet(SHEETS.func)).filter(function(r) { return !r.demissao; });
  var mapa = {};
  data.forEach(function(r) {
    var f = r.funcao || 'Não definida';
    if (!mapa[f]) mapa[f] = [];
    mapa[f].push(r.nome);
  });
  var linhas = ['💼 Funcionários por Função (' + data.length + ' ativos)\n'];
  Object.keys(mapa).sort().forEach(function(f) {
    linhas.push(f + ' (' + mapa[f].length + '):');
    mapa[f].forEach(function(n) { linhas.push('  • ' + n); });
  });
  SpreadsheetApp.getUi().alert(linhas.join('\n'));
}

function relSalarios() {
  var data  = sheetToJson(getOrCreateSheet(SHEETS.func)).filter(function(r) { return !r.demissao; });
  var total = 0;
  var linhas = [];
  data.forEach(function(r) {
    var s = parseFloat(String(r.salario).replace(',','.')) || 0;
    total += s;
    if (s > 0) linhas.push(r.nome + ': R$ ' + s.toFixed(2));
  });
  SpreadsheetApp.getUi().alert('💰 Resumo de Salários\n\n' + linhas.join('\n') + '\n─────────────\nTotal: R$ ' + total.toFixed(2));
}

// ─── Web App ──────────────────────────────────────────────────────────────────

function doGet(e) {
  var acao = (e && e.parameter) ? (e.parameter.acao || '') : '';
  if (acao === 'ping') return jsonOut({ ok: true, msg: 'FA RH OK', version: 5 });
  if (acao === 'get_all') {
    var result = {};
    Object.keys(SHEETS).forEach(function(key) {
      result[key] = sheetToJson(getOrCreateSheet(SHEETS[key]));
    });
    return jsonOut(result);
  }
  return jsonOut({ ok: true, msg: 'FA RH OK', version: 5 });
}

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonOut({ ok: false, error: 'JSON inválido: ' + err.message }); }

  if (data.acao === 'sync_all') {
    jsonToSheet(getOrCreateSheet(SHEETS.func),        data.func        !== undefined ? data.func        : [], HEADERS.func);
    jsonToSheet(getOrCreateSheet(SHEETS.bancos),      data.bancos      !== undefined ? data.bancos      : [], HEADERS.bancos);
    jsonToSheet(getOrCreateSheet(SHEETS.escalas),     data.escalas     !== undefined ? data.escalas     : [], HEADERS.escalas);
    jsonToSheet(getOrCreateSheet(SHEETS.docs),        data.docs        !== undefined ? data.docs        : [], HEADERS.docs);
    jsonToSheet(getOrCreateSheet(SHEETS.users),       data.users       !== undefined ? data.users       : [], HEADERS.users);
    jsonToSheet(getOrCreateSheet(SHEETS.fluxo_caixa), data.fluxo_caixa !== undefined ? data.fluxo_caixa : [], HEADERS.fluxo_caixa);
    return jsonOut({ ok: true, msg: 'sync_all ok' });
  }

  return jsonOut({ ok: false, error: 'Ação desconhecida: ' + data.acao });
}
