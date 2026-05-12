import { useState } from 'react';
import { DB, fmtMoney } from '@/lib/db';
import { PageHeader, FormCard, Field, Input, Btn, CurrencyInput } from '@/components/ui-custom';

interface ItemOrcamento {
  id: number;
  descricao: string;
  qtd: string;
  unidade: string;
  valorUnit: string;
}

const EMPRESA_DEFAULT = {
  nome: 'F&A Higienizações',
  cnpj: '46.649.584/0001-21',
  endereco: 'Informe o endereço da empresa',
  telefone: '(xx) xxxxx-xxxx',
  email: '',
  instagram: 'https://bit.ly/3VfGNMv',
};

let nextItemId = 1;
const newItem = (): ItemOrcamento => ({ id: nextItemId++, descricao: '', qtd: '1', unidade: 'un', valorUnit: '' });

export default function OrcamentoPage() {
  const cfg = DB.getObj('config');
  const savedEmpresa = cfg.empresaConfig;

  const [empresa, setEmpresa] = useState({
    nome: savedEmpresa?.nome || 'F&A Higienizações',
    cnpj: savedEmpresa?.cnpj || '46.649.584/0001-21',
    endereco: savedEmpresa?.endereco || '',
    telefone: savedEmpresa?.telefone || '',
    email: savedEmpresa?.email || '',
    instagram: savedEmpresa?.instagram || 'https://bit.ly/3VfGNMv',
  });
  const [cliente, setCliente] = useState({ nome: '', endereco: '', telefone: '', email: '' });
  const [itens, setItens] = useState<ItemOrcamento[]>([newItem()]);
  const [desconto, setDesconto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [validade, setValidade] = useState('');
  const [condPagamento, setCondPagamento] = useState('');
  const [sujidade, setSujidade] = useState(''); // 'baixa' | 'media' | 'alta' | ''
  const [sujidadePct, setSujidadePct] = useState('');

  const SUJIDADE_OPTIONS = [
    { value: '', label: '— Nenhum —' },
    { value: 'baixa', label: 'Baixa', color: '#6b7280' },
    { value: 'media', label: 'Média', color: '#d97706' },
    { value: 'alta', label: 'Alta', color: '#854d0e' },
  ];

  const setEmp = (k: keyof typeof empresa, v: string) => setEmpresa(prev => ({ ...prev, [k]: v }));
  const setCli = (k: keyof typeof cliente, v: string) => setCliente(prev => ({ ...prev, [k]: v }));

  const updateItem = (id: number, k: keyof ItemOrcamento, v: string) =>
    setItens(prev => prev.map(it => it.id === id ? { ...it, [k]: v } : it));

  const addItem = () => setItens(prev => [...prev, newItem()]);
  const removeItem = (id: number) => setItens(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);

  const subtotal = itens.reduce((s, it) => {
    const q = parseFloat(it.qtd) || 0;
    const v = parseFloat(it.valorUnit) || 0;
    return s + q * v;
  }, 0);

  const descontoPct = parseFloat(desconto) || 0;
  const descontoValor = subtotal * (descontoPct / 100);
  const sujidadePctNum = parseFloat(sujidadePct) || 0;
  const sujidadeValor = subtotal * (sujidadePctNum / 100);
  const total = subtotal - descontoValor + sujidadeValor;

  const exportCSV = () => {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const validadeStr = validade ? new Date(validade + 'T12:00').toLocaleDateString('pt-BR') : '';

    // Header rows (empresa / cliente info)
    const meta: string[][] = [
      ['ORÇAMENTO', '', '', '', ''],
      ['Empresa:', empresa.nome, '', 'Data:', dataHoje],
      ['CNPJ:', empresa.cnpj, '', 'Validade:', validadeStr],
      ['Endereço:', empresa.endereco, '', '', ''],
      ['Telefone:', empresa.telefone, '', '', ''],
      empresa.instagram ? ['Instagram:', empresa.instagram, '', '', ''] : [],
      ['', '', '', '', ''],
      cliente.nome ? ['Cliente:', cliente.nome, '', 'Tel.:', cliente.telefone] : [],
      cliente.endereco ? ['Endereço cliente:', cliente.endereco, '', '', ''] : [],
      ['', '', '', '', ''],
    ].filter(r => r.length > 0);

    const header = ['Descrição / Serviço', 'Qtd', 'Un.', 'Valor Unit. (R$)', 'Total (R$)'];
    const rows = itens.map(it => {
      const q = parseFloat(it.qtd) || 0;
      const v = parseFloat(it.valorUnit) || 0;
      return [it.descricao, it.qtd, it.unidade, fmtMoney(v), fmtMoney(q * v)];
    });
    rows.push(['', '', '', '', '']);
    rows.push(['', '', '', 'Subtotal', fmtMoney(subtotal)]);
    if (sujidade && sujidadePctNum > 0) rows.push(['', '', '', `Nível de Sujidade (${sujidade.charAt(0).toUpperCase() + sujidade.slice(1)} +${sujidadePctNum}%)`, '+ R$ ' + fmtMoney(sujidadeValor)]);
    if (descontoPct > 0) rows.push(['', '', '', `Desconto à vista (${descontoPct}%)`, '- R$ ' + fmtMoney(descontoValor)]);
    rows.push(['', '', '', 'TOTAL', 'R$ ' + fmtMoney(total)]);
    if (condPagamento) rows.push(['', '', '', 'Cond. Pagamento:', condPagamento]);
    if (observacoes) rows.push(['Obs:', observacoes, '', '', '']);

    const allRows = [...meta, header, ...rows];
    const csv = allRows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orcamento_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPDF = () => {
    const win = window.open('', '_blank', 'width=960,height=700');
    if (!win) { alert('Popup bloqueado! Permita popups para imprimir.'); return; }

    const itensTr = itens.filter(it => it.descricao.trim()).map((it, idx) => {
      const q = parseFloat(it.qtd) || 0;
      const v = parseFloat(it.valorUnit) || 0;
      return `<tr>
        <td style="width:40px;text-align:center;color:#888">${idx + 1}</td>
        <td>${it.descricao || '—'}</td>
        <td style="text-align:center;width:55px">${it.qtd}</td>
        <td style="text-align:center;width:50px">${it.unidade}</td>
        <td style="text-align:right;width:110px">R$ ${fmtMoney(v)}</td>
        <td style="text-align:right;width:115px"><b>R$ ${fmtMoney(q * v)}</b></td>
      </tr>`;
    }).join('');

    const numOrc = String(Date.now()).slice(-6);
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const validadeStr = validade ? new Date(validade + 'T12:00').toLocaleDateString('pt-BR') : '—';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Orçamento Nº ${numOrc} — ${empresa.nome}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#1a1a1a; background:#fff; }
  .page { padding:28px 32px; max-width:800px; margin:0 auto; }
  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; margin-bottom:18px; border-bottom:3px solid #1a1a1a; }
  .logo-area { display:flex; flex-direction:column; gap:4px; }
  .company-name { font-size:24px; font-weight:900; letter-spacing:0.5px; color:#1a1a1a; }
  .company-sub { font-size:9px; color:#888; letter-spacing:1px; text-transform:uppercase; margin-top:1px; }
  .company-info { font-size:10px; color:#555; line-height:1.8; margin-top:6px; }
  .badge-area { text-align:right; }
  .badge-title { display:inline-block; background:#1a1a1a; color:#d4a017; padding:6px 18px; font-size:15px; font-weight:900; letter-spacing:2px; border-radius:4px; }
  .orcamento-meta { font-size:10px; color:#666; margin-top:8px; line-height:1.9; }
  .orcamento-meta b { color:#1a1a1a; }
  /* Section */
  .section-bar { background:#1a1a1a; color:#d4a017; padding:4px 12px; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin:14px 0 8px; border-radius:2px; }
  /* Client block */
  .client-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; background:#fafafa; border:1px solid #e8e8e8; border-radius:6px; padding:10px 14px; margin-bottom:4px; }
  .info-row { font-size:10px; line-height:1.8; }
  .info-row b { color:#888; font-weight:600; }
  /* Items table */
  table { width:100%; border-collapse:collapse; }
  thead th { background:#1a1a1a; color:#d4a017; padding:6px 8px; font-size:10px; font-weight:600; letter-spacing:0.5px; }
  tbody td { padding:6px 8px; border-bottom:1px solid #efefef; vertical-align:middle; }
  tbody tr:nth-child(even) td { background:#fafafa; }
  tbody tr:last-child td { border-bottom:2px solid #1a1a1a; }
  /* Totals */
  .totals-wrap { display:flex; justify-content:flex-end; margin-top:10px; }
  .totals { width:260px; border:1px solid #ddd; border-radius:6px; overflow:hidden; }
  .totals-row { display:flex; justify-content:space-between; padding:6px 12px; font-size:11px; border-bottom:1px solid #eee; }
  .totals-row:last-child { background:#1a1a1a; color:#d4a017; font-weight:900; font-size:14px; border-bottom:none; }
  .totals-discount { color:#ef4444; }
  /* Conditions */
  .conditions { margin-top:14px; background:#fafafa; border:1px solid #e8e8e8; border-radius:6px; padding:10px 14px; font-size:10px; line-height:1.8; }
  .conditions b { color:#1a1a1a; }
  /* Footer */
  .footer { text-align:center; margin-top:24px; font-size:9px; color:#aaa; border-top:1px solid #e8e8e8; padding-top:10px; line-height:1.8; }
  @media print { .page { padding:10px; } @page { margin:10mm; size:A4; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <div class="company-name">${empresa.nome}</div>
      <div class="company-sub">Serviços de Higienização Profissional</div>
      <div class="company-info">
        ${empresa.cnpj ? `<span>CNPJ: <b>${empresa.cnpj}</b></span><br>` : ''}
        ${empresa.endereco ? `<span>${empresa.endereco}</span><br>` : ''}
        ${empresa.telefone ? `<span>📞 ${empresa.telefone}</span>` : ''}
        ${empresa.email ? `&nbsp;&nbsp;✉️ ${empresa.email}` : ''}
        ${empresa.instagram ? `<br><span>📷 ${empresa.instagram}</span>` : ''}
      </div>
    </div>
    <div class="badge-area">
      <div class="badge-title">ORÇAMENTO</div>
      <div class="orcamento-meta">
        Nº <b>${numOrc}</b><br>
        Data: <b>${dataHoje}</b><br>
        Validade: <b>${validadeStr}</b>
      </div>
    </div>
  </div>

  ${cliente.nome || cliente.endereco || cliente.telefone || cliente.email ? `
  <div class="section-bar">Cliente / Destinatário</div>
  <div class="client-grid">
    ${cliente.nome ? `<div class="info-row"><b>Nome/Empresa:</b> ${cliente.nome}</div>` : ''}
    ${cliente.telefone ? `<div class="info-row"><b>Telefone:</b> ${cliente.telefone}</div>` : ''}
    ${cliente.endereco ? `<div class="info-row"><b>Endereço:</b> ${cliente.endereco}</div>` : ''}
    ${cliente.email ? `<div class="info-row"><b>E-mail:</b> ${cliente.email}</div>` : ''}
  </div>` : ''}

  <div class="section-bar">Itens do Orçamento</div>
  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">#</th>
        <th style="text-align:left">Descrição / Serviço</th>
        <th style="text-align:center;width:55px">Qtd</th>
        <th style="text-align:center;width:50px">Un.</th>
        <th style="text-align:right;width:110px">Valor Unit.</th>
        <th style="text-align:right;width:115px">Total</th>
      </tr>
    </thead>
    <tbody>${itensTr}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>R$ ${fmtMoney(subtotal)}</span></div>
      ${sujidade && sujidadePctNum > 0 ? `<div class="totals-row" style="color:#854d0e"><span>Sujidade ${sujidade.charAt(0).toUpperCase() + sujidade.slice(1)} (+${sujidadePctNum}%)</span><span>+ R$ ${fmtMoney(sujidadeValor)}</span></div>` : ''}
      ${descontoPct > 0 ? `<div class="totals-row totals-discount"><span>Desconto à vista (${descontoPct}%)</span><span>- R$ ${fmtMoney(descontoValor)}</span></div>` : ''}
      <div class="totals-row"><span>TOTAL</span><span>R$ ${fmtMoney(total)}</span></div>
    </div>
  </div>

  ${condPagamento || observacoes ? `
  <div class="conditions">
    ${condPagamento ? `<div><b>Condições de Pagamento:</b> ${condPagamento}</div>` : ''}
    ${observacoes ? `<div style="margin-top:${condPagamento ? '6px' : '0'}"><b>Observações:</b> ${observacoes}</div>` : ''}
  </div>` : ''}

  <div class="footer">
    ${empresa.nome} &nbsp;|&nbsp; CNPJ ${empresa.cnpj} &nbsp;|&nbsp; ${empresa.instagram}<br>
    Documento gerado em ${new Date().toLocaleString('pt-BR')} &nbsp;·&nbsp; Este orçamento tem validade até ${validadeStr}
  </div>
</div>
<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  };

  return (
    <>
      <PageHeader title="Gerador de Orçamento" icon="📋">
        <Btn variant="outline" onClick={exportCSV}>📊 Exportar Planilha</Btn>
        <Btn onClick={exportPDF}>🖨️ Gerar PDF</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">

        {/* Dados da Empresa */}
        <FormCard title="Dados da Empresa" icon="🏢">
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Nome da Empresa" className="flex-[3] min-w-[200px]">
              <Input value={empresa.nome} onChange={e => setEmp('nome', e.target.value)} />
            </Field>
            <Field label="CNPJ" className="flex-[2] min-w-[140px]">
              <Input value={empresa.cnpj} onChange={e => setEmp('cnpj', e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Endereço" className="flex-[4] min-w-[200px]">
              <Input value={empresa.endereco} onChange={e => setEmp('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </Field>
            <Field label="Telefone" className="flex-[2] min-w-[120px]">
              <Input value={empresa.telefone} onChange={e => setEmp('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </Field>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Field label="E-mail" className="flex-[2] min-w-[160px]">
              <Input value={empresa.email} onChange={e => setEmp('email', e.target.value)} />
            </Field>
            <Field label="Instagram" className="flex-[3] min-w-[200px]">
              <Input value={empresa.instagram} onChange={e => setEmp('instagram', e.target.value)} />
            </Field>
          </div>
        </FormCard>

        {/* Dados do Cliente */}
        <FormCard title="Dados do Cliente" icon="👤">
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Nome / Empresa" className="flex-[3] min-w-[200px]">
              <Input value={cliente.nome} onChange={e => setCli('nome', e.target.value)} placeholder="Nome do cliente ou empresa" />
            </Field>
            <Field label="Telefone" className="flex-[2] min-w-[120px]">
              <Input value={cliente.telefone} onChange={e => setCli('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </Field>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Endereço" className="flex-[3] min-w-[200px]">
              <Input value={cliente.endereco} onChange={e => setCli('endereco', e.target.value)} />
            </Field>
            <Field label="E-mail" className="flex-[2] min-w-[140px]">
              <Input value={cliente.email} onChange={e => setCli('email', e.target.value)} />
            </Field>
          </div>
        </FormCard>

        {/* Itens do Orçamento */}
        <FormCard title="Itens do Orçamento" icon="📝">
          <div className="mb-2">
            <div className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_70px_70px_110px_110px_36px] gap-1.5 items-center text-[9px] font-bold text-muted-foreground uppercase px-1">
                <span>Descrição</span><span className="text-center">Qtd</span><span className="text-center">Un.</span>
                <span className="text-right">Valor Unit. (R$)</span><span className="text-right">Total</span><span />
              </div>
              {itens.map(it => {
                const q = parseFloat(it.qtd) || 0;
                const v = parseFloat(it.valorUnit) || 0;
                const tot = q * v;
                return (
                  <div key={it.id} className="grid grid-cols-[1fr_70px_70px_110px_110px_36px] gap-1.5 items-center">
                    <Input value={it.descricao} onChange={e => updateItem(it.id, 'descricao', e.target.value)} placeholder="Descrição do serviço/produto" />
                    <Input value={it.qtd} onChange={e => updateItem(it.id, 'qtd', e.target.value)} className="text-center" />
                    <Input value={it.unidade} onChange={e => updateItem(it.id, 'unidade', e.target.value)} className="text-center" placeholder="un" />
                    <CurrencyInput value={it.valorUnit} onChange={e => updateItem(it.id, 'valorUnit', e.target.value)} className="text-right" placeholder="0,00" />
                    <div className="p-[8px_10px] bg-secondary border border-border rounded-md text-[11px] font-bold text-primary text-right">
                      R$ {fmtMoney(tot)}
                    </div>
                    <button onClick={() => removeItem(it.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors text-[14px]">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
          <Btn variant="outline" onClick={addItem} className="mt-1">➕ Adicionar Linha</Btn>
        </FormCard>

        {/* Totais */}
        <FormCard title="Totais e Desconto" icon="💰">
          <div className="flex gap-2.5 mb-3 flex-wrap items-end">
            <Field label="Desconto à vista (%)" className="w-[160px]">
              <Input type="number" step="0.1" min="0" max="100" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Validade do Orçamento" className="w-[160px]">
              <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} />
            </Field>
          </div>

          {/* Sujidade level */}
          <div className="mb-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Nível de Sujidade (opcional)</div>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex gap-1.5">
                {SUJIDADE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSujidade(opt.value); if (!opt.value) setSujidadePct(''); }}
                    style={sujidade === opt.value && opt.value ? { background: opt.color + '20', borderColor: opt.color, color: opt.color } : undefined}
                    className={`py-1.5 px-3 rounded-lg text-[11px] font-bold border transition-all
                      ${sujidade === opt.value ? 'font-bold' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {sujidade && (
                <Field label="Adicional (%)" className="w-[120px]">
                  <Input type="number" step="0.1" min="0" max="100" value={sujidadePct}
                    onChange={e => setSujidadePct(e.target.value)} placeholder="Ex: 15" />
                </Field>
              )}
              {sujidade && sujidadePctNum > 0 && (
                <div className="text-[11px] text-muted-foreground pb-1">
                  + R$ {fmtMoney(sujidadeValor)} sobre o subtotal
                </div>
              )}
            </div>
          </div>

          <div className="bg-secondary border border-border rounded-xl p-4 max-w-xs ml-auto">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">R$ {fmtMoney(subtotal)}</span>
            </div>
            {sujidade && sujidadePctNum > 0 && (
              <div className="flex justify-between text-[11px] mb-1.5" style={{ color: SUJIDADE_OPTIONS.find(o => o.value === sujidade)?.color || 'inherit' }}>
                <span>Sujidade {sujidade.charAt(0).toUpperCase() + sujidade.slice(1)} ({sujidadePctNum}%)</span>
                <span className="font-semibold">+ R$ {fmtMoney(sujidadeValor)}</span>
              </div>
            )}
            {descontoPct > 0 && (
              <div className="flex justify-between text-[11px] mb-1.5 text-destructive">
                <span>Desconto ({descontoPct}%)</span>
                <span className="font-semibold">- R$ {fmtMoney(descontoValor)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 mt-1 flex justify-between">
              <span className="text-[13px] font-bold text-primary">TOTAL</span>
              <span className="text-[15px] font-bold text-primary">R$ {fmtMoney(total)}</span>
            </div>
          </div>
        </FormCard>

        {/* Observações */}
        <FormCard title="Condições e Observações" icon="📄">
          <Field label="Condições de Pagamento" className="w-full mb-2.5">
            <Input
              value={condPagamento}
              onChange={e => setCondPagamento(e.target.value)}
              placeholder="Ex: 50% na aprovação, 50% na entrega. Prazo: 3 dias úteis."
            />
          </Field>
          <Field label="Observações Gerais" className="w-full">
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={3}
              className="w-full p-[8px_10px] bg-input border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
              placeholder="Informações adicionais, garantias, itens inclusos/exclusos, etc."
            />
          </Field>
        </FormCard>

        {/* Botões de exportação */}
        <div className="flex gap-3 mt-2 justify-end">
          <Btn variant="outline" onClick={exportCSV}>📊 Exportar Planilha (.csv)</Btn>
          <Btn onClick={exportPDF}>🖨️ Gerar / Imprimir PDF</Btn>
        </div>
      </div>
    </>
  );
}
