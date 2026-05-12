import { fmtDate, fmtMoney, type Funcionario } from './db';

function esc(s: string | undefined): string {
  if (!s) return '—';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function printFuncionarioPDF(f: Funcionario) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    // Mobile fallback: open in same tab
    const fallbackWin = window.open() as Window;
    if (!fallbackWin) { alert('Não foi possível abrir o PDF. Permita popups no navegador.'); return; }
    const html = getPrintHtml(f);
    fallbackWin.document.write(html);
    fallbackWin.document.close();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha - ${esc(f.nome)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
  .header { text-align: center; border-bottom: 3px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 15px; }
  .header h1 { font-size: 18px; letter-spacing: 2px; }
  .header p { font-size: 11px; color: #555; margin-top: 3px; }
  .section { margin-bottom: 12px; }
  .section-title { background: #1a1a1a; color: #d4a017; padding: 4px 10px; font-size: 12px; font-weight: bold; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 6px; border: 1px solid #ccc; vertical-align: top; }
  td.label { background: #f0f0f0; font-weight: bold; width: 140px; white-space: nowrap; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
  .badge-ativo { background: #22c55e; color: #fff; }
  .badge-demitido { background: #ef4444; color: #fff; }
  .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print {
    body { padding: 10px; }
    @page { margin: 15mm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>F&A HIGIENIZAÇÕES</h1>
  <p>FICHA CADASTRAL DO FUNCIONÁRIO</p>
</div>

<div class="section">
  <div class="section-title">👤 DADOS PESSOAIS</div>
  <table>
    <tr><td class="label">ID</td><td>${f.id}</td><td class="label">Situação</td><td><span class="badge ${f.demissao ? 'badge-demitido' : 'badge-ativo'}">${f.demissao ? 'DEMITIDO' : 'ATIVO'}</span></td></tr>
    <tr><td class="label">Nome Completo</td><td colspan="3">${esc(f.nome)}</td></tr>
    <tr><td class="label">Nascimento</td><td>${fmtDate(f.nasc)}</td><td class="label">Sexo</td><td>${esc(f.sexo)}</td></tr>
    <tr><td class="label">Fator RH</td><td>${esc(f.rh)}</td><td class="label">Estado Civil</td><td>${esc(f.estcivil)}</td></tr>
    <tr><td class="label">Naturalidade</td><td>${esc(f.natural)}</td><td class="label">UF</td><td>${esc(f.uf)}</td></tr>
    <tr><td class="label">Escolaridade</td><td colspan="3">${esc(f.escol)}</td></tr>
    <tr><td class="label">Pai</td><td colspan="3">${esc(f.pai)}</td></tr>
    <tr><td class="label">Mãe</td><td colspan="3">${esc(f.mae)}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">📍 ENDEREÇO E CONTATO</div>
  <table>
    <tr><td class="label">Endereço</td><td colspan="3">${esc(f.end)}${f.compl ? ', ' + esc(f.compl) : ''}</td></tr>
    <tr><td class="label">CEP</td><td>${esc(f.cep)}</td><td class="label">Bairro</td><td>${esc(f.bairro)}</td></tr>
    <tr><td class="label">Cidade</td><td>${esc(f.cidade)}</td><td class="label">UF</td><td>${esc(f.ufend)}</td></tr>
    <tr><td class="label">Telefone</td><td>${esc(f.tel)}</td><td class="label">Celular</td><td>${esc(f.cel)}</td></tr>
    <tr><td class="label">E-mail</td><td colspan="3">${esc(f.email)}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">📋 DOCUMENTAÇÃO</div>
  <table>
    <tr><td class="label">CPF</td><td>${esc(f.cpf)}</td><td class="label">RG</td><td>${esc(f.rg)} ${f.ufrg ? '(' + esc(f.ufrg) + ')' : ''}</td></tr>
    <tr><td class="label">Emissão RG</td><td>${fmtDate(f.emissrg)}</td><td class="label">PIS/PASEP</td><td>${esc(f.pis)}</td></tr>
    <tr><td class="label">CTPS</td><td>${esc(f.ctps)}</td><td class="label">Série</td><td>${esc(f.seriectps)}</td></tr>
    <tr><td class="label">Emissão CTPS</td><td>${fmtDate(f.emissctps)}</td><td class="label">Título Eleitor</td><td>${esc(f.titulo)}</td></tr>
    <tr><td class="label">Seção / Zona</td><td>${esc(f.secao)} / ${esc(f.zona)}</td><td class="label">CNH</td><td>${esc(f.cnh)} ${f.catcnh ? 'Cat. ' + esc(f.catcnh) : ''}</td></tr>
    <tr><td class="label">Venc. CNH</td><td>${fmtDate(f.venccnh)}</td><td class="label">Reservista</td><td>${esc(f.reserv)}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">🏢 EMPRESA E CONTRATO</div>
  <table>
    <tr><td class="label">Empresa</td><td>${esc(f.empresa)}</td><td class="label">CNPJ</td><td>${esc(f.cnpj)}</td></tr>
    <tr><td class="label">Admissão</td><td>${fmtDate(f.admissao)}</td><td class="label">Demissão</td><td>${fmtDate(f.demissao)}</td></tr>
    <tr><td class="label">Função</td><td>${esc(f.funcao)}</td><td class="label">Horário</td><td>${esc(f.horario)}</td></tr>
    <tr><td class="label">Salário</td><td>R$ ${fmtMoney(f.salario)}</td><td class="label">1º Emprego</td><td>${esc(f.primemp)}</td></tr>
    <tr><td class="label">Ticket Alim.</td><td>${esc(f.ticket)} ${f.valdia ? '(R$ ' + fmtMoney(f.valdia) + '/dia)' : ''}</td><td class="label">V. Transporte</td><td>${esc(f.vtransp)} ${f.valdiat ? '(R$ ' + fmtMoney(f.valdiat) + '/dia)' : ''}</td></tr>
    <tr><td class="label">Plano Saúde</td><td>${esc(f.planosaude)}</td><td class="label">Contrib. Sindical</td><td>${esc(f.sindical)}</td></tr>
    <tr><td class="label">Observações</td><td colspan="3">${esc(f.exp)}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-title">🏦 DADOS BANCÁRIOS E PIX</div>
  <table>
    <tr><td class="label">Banco</td><td>${esc(f.banco)}</td><td class="label">Agência</td><td>${esc(f.agencia)}</td></tr>
    <tr><td class="label">Conta</td><td>${esc(f.conta)}</td><td class="label">Tipo</td><td>${esc(f.tipoconta)}</td></tr>
    <tr><td class="label">Chave PIX</td><td>${esc(f.pix)}</td><td class="label">Tipo PIX</td><td>${esc(f.tipopix)}</td></tr>
  </table>
</div>

<div class="footer">
  F&A Higienizações — Ficha gerada em ${new Date().toLocaleString('pt-BR')} | Cadastrado em: ${esc(f.cadastrado)}
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export function printListaFuncionarios(lista: Funcionario[]) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Popup bloqueado!'); return; }

  const rows = lista.map(f => `
    <tr>
      <td style="text-align:center">${f.id}</td>
      <td>${esc(f.nome)}</td>
      <td>${esc(f.cpf)}</td>
      <td>${esc(f.funcao)}</td>
      <td>${esc(f.cel)}</td>
      <td>${fmtDate(f.admissao)}</td>
      <td style="text-align:center"><span class="badge ${f.demissao ? 'badge-demitido' : 'badge-ativo'}">${f.demissao ? 'Demitido' : 'Ativo'}</span></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Lista de Funcionários</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; padding: 15px; }
  .header { text-align: center; border-bottom: 3px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: 16px; }
  .header p { font-size: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a1a; color: #d4a017; padding: 5px 6px; text-align: left; font-size: 10px; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) { background: #f8f8f8; }
  .badge { padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; }
  .badge-ativo { background: #22c55e; color: #fff; }
  .badge-demitido { background: #ef4444; color: #fff; }
  .footer { text-align: center; margin-top: 15px; font-size: 9px; color: #888; }
  @media print { @page { margin: 10mm; size: A4 landscape; } }
</style>
</head>
<body>
<div class="header">
  <h1>F&A HIGIENIZAÇÕES</h1>
  <p>LISTA DE FUNCIONÁRIOS — ${lista.length} registro(s)</p>
</div>
<table>
  <thead><tr><th>ID</th><th>Nome</th><th>CPF</th><th>Função</th><th>Celular</th><th>Admissão</th><th>Situação</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
