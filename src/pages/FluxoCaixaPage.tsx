import { useState } from 'react';
import { DB, nextId, fmtMoney, type FluxoCaixaRegistro, type FluxoMeta, type CustoFixo, MESES, syncFluxoGS, loadFromFluxoGS } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select, CurrencyInput } from '@/components/ui-custom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

export default function FluxoCaixaPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'mensal' | 'comparativo' | 'custos'>('mensal');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const allData = DB.get<FluxoCaixaRegistro>('fluxo_caixa');
  const config = DB.getObj('config');
  const metas = config.fluxoMetas || [];
  const [receitaTotal, setReceitaTotal] = useState(String(config.receitaTotal ?? ''));
  const [receitaEditando, setReceitaEditando] = useState(false);

  const saveReceita = () => {
    const cfg = DB.getObj('config');
    cfg.receitaTotal = Number(receitaTotal) || 0;
    DB.setObj('config', cfg);
    syncFluxoGS(true);
    setReceitaEditando(false);
    refresh();
  };

  // Filter by month/year
  const monthData = allData.filter(r => {
    const d = new Date(r.data);
    return d.getFullYear() === viewYear && (d.getMonth() + 1) === viewMonth;
  }).filter(r => !search || r.descricao?.toLowerCase().includes(search.toLowerCase()));

  const totalEntradas = monthData.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0);
  const totalSaidas = monthData.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0);
  // Custos fixos abatem do lucro líquido
  const custosFixosList = DB.get<CustoFixo>('custos_fixos');
  const totalCustosFixos = custosFixosList.reduce((s, c) => s + (c.valor || 0), 0);
  const saldo = totalEntradas - totalSaidas - totalCustosFixos;

  // Get meta for current month
  const currentMeta = metas.find(m => m.mes === viewMonth && m.ano === viewYear);
  const metaValue = currentMeta?.meta || 0;
  const metaPct = metaValue > 0 ? Math.min((saldo / metaValue) * 100, 100) : 0;

  // Previous month net value
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const prevData = allData.filter(r => {
    const d = new Date(r.data);
    return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
  });
  const prevSaldo = prevData.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0)
    - prevData.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0)
    - totalCustosFixos;

  // Annual chart data
  const annualData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mData = allData.filter(r => { const d = new Date(r.data); return d.getFullYear() === viewYear && (d.getMonth() + 1) === m; });
    const ent = mData.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0);
    const sai = mData.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0);
    return { mes: MESES[m]?.slice(0, 3), entradas: ent, saidas: sai, liquido: ent - sai };
  });

  const del = (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    DB.set('fluxo_caixa', allData.filter(x => x.id !== id));
    logAcesso('Excluiu registro fluxo de caixa ID ' + id, session!.name, session!.user);
    syncFluxoGS(true);
    refresh();
  };

  const exportPDF = () => {
    const win = window.open('', '_blank', 'width=1000,height=700');
    if (!win) { alert('Popup bloqueado!'); return; }
    const custosFixos = DB.get<CustoFixo>('custos_fixos');
    const totalCustos = custosFixos.reduce((s, c) => s + c.valor, 0);
    const recTotal = Number(receitaTotal) || 0;
    const lucro = recTotal - totalCustos - totalSaidas;

    const linhasFluxo = monthData.sort((a, b) => b.data.localeCompare(a.data)).map(r =>
      `<tr><td>${r.data.split('-').reverse().join('/')}</td>
       <td><span style="color:${r.tipo === 'entrada' ? '#16a34a' : '#dc2626'}">${r.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}</span></td>
       <td><b>${r.descricao}</b></td><td>${r.categoria || '—'}</td>
       <td style="text-align:right;color:${r.tipo === 'entrada' ? '#16a34a' : '#dc2626'};font-weight:bold">
         ${r.tipo === 'entrada' ? '+' : '-'} R$ ${fmtMoney(r.valor)}</td></tr>`
    ).join('');

    const linhasCustos = custosFixos.map(c =>
      `<tr><td><b>${c.descricao}</b></td><td>${c.categoria || '—'}</td>
       <td style="text-align:right;color:#dc2626;font-weight:bold">R$ ${fmtMoney(c.valor)}</td>
       <td>${c.obs || '—'}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Fluxo de Caixa — ${MESES[viewMonth]}/${viewYear}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
  h1{font-size:18px;font-weight:900;border-bottom:3px solid #1a1a1a;padding-bottom:10px;margin-bottom:16px}
  h2{font-size:12px;font-weight:700;background:#1a1a1a;color:#d4a017;padding:4px 10px;margin:16px 0 8px;border-radius:2px;letter-spacing:1px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
  .card{border:1px solid #e0e0e0;border-radius:6px;padding:10px;text-align:center}
  .card .val{font-size:16px;font-weight:900}.card .lbl{font-size:9px;color:#888;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th{background:#1a1a1a;color:#d4a017;padding:5px 8px;font-size:10px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #efefef;font-size:10.5px}
  tr:nth-child(even) td{background:#fafafa}
  .footer{text-align:center;margin-top:20px;font-size:9px;color:#aaa;border-top:1px solid #e0e0e0;padding-top:8px}
  @media print{body{padding:10px} @page{margin:10mm;size:A4 landscape}}
</style></head><body>
<h1>💰 Fluxo de Caixa — ${MESES[viewMonth]} / ${viewYear}</h1>
<div class="cards">
  ${recTotal > 0 ? `<div class="card"><div class="val" style="color:#1a1a1a">R$ ${fmtMoney(recTotal)}</div><div class="lbl">Receita Total</div></div>` : ''}
  <div class="card"><div class="val" style="color:#16a34a">R$ ${fmtMoney(totalEntradas)}</div><div class="lbl">Entradas</div></div>
  <div class="card"><div class="val" style="color:#dc2626">R$ ${fmtMoney(totalSaidas)}</div><div class="lbl">Saídas</div></div>
  ${totalCustos > 0 ? `<div class="card"><div class="val" style="color:#dc2626">R$ ${fmtMoney(totalCustos)}</div><div class="lbl">Custos Fixos</div></div>` : ''}
  <div class="card"><div class="val" style="color:${saldo >= 0 ? '#1a1a1a' : '#dc2626'}">R$ ${fmtMoney(saldo)}</div><div class="lbl">Saldo Líquido</div></div>
  ${recTotal > 0 ? `<div class="card"><div class="val" style="color:${lucro >= 0 ? '#16a34a' : '#dc2626'}">R$ ${fmtMoney(lucro)}</div><div class="lbl">Resultado Final</div></div>` : ''}
</div>
${linhasFluxo ? `<h2>REGISTROS DO MÊS</h2>
<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
<tbody>${linhasFluxo}</tbody></table>` : ''}
${linhasCustos ? `<h2>CUSTOS FIXOS</h2>
<table><thead><tr><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th><th>Obs</th></tr></thead>
<tbody>${linhasCustos}</tbody>
<tfoot><tr><td colspan="2" style="text-align:right;font-weight:bold">TOTAL CUSTOS FIXOS</td>
<td style="text-align:right;font-weight:bold;color:#dc2626">R$ ${fmtMoney(totalCustos)}</td><td></td></tr></tfoot></table>` : ''}
<div class="footer">F&A Higienizações · Relatório gerado em ${new Date().toLocaleString('pt-BR')}</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const years = [...new Set(allData.map(r => new Date(r.data).getFullYear()))];
  if (!years.includes(viewYear)) years.push(viewYear);
  years.sort();

  return (
    <>
      <PageHeader title="Fluxo de Caixa" icon="💰">
        <Btn variant="outline" onClick={() => setMetaModalOpen(true)}>🎯 Meta do Mês</Btn>
        <Btn variant="outline" onClick={() => syncFluxoGS()}>📤 Sincronizar</Btn>
        <Btn variant="outline" onClick={exportPDF}>🖨️ PDF</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Registro</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Btn variant={activeTab === 'mensal' ? 'gold' : 'outline'} onClick={() => setActiveTab('mensal')}>📊 Mensal</Btn>
          <Btn variant={activeTab === 'comparativo' ? 'gold' : 'outline'} onClick={() => setActiveTab('comparativo')}>📈 Comparativo</Btn>
          <Btn variant={activeTab === 'custos' ? 'gold' : 'outline'} onClick={() => setActiveTab('custos')}>🧾 Custos Fixos</Btn>
        </div>

        {activeTab === 'comparativo' && <ComparativoTab allData={allData} />}
        {activeTab === 'custos' && <CustosFixosTab session={session!} onRefresh={refresh} />}
        {activeTab === 'mensal' && <>
        {/* Receita Total Editável */}
        <div className="bg-card border border-border rounded-xl p-3.5 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-muted-foreground">💵 Receita Total do Mês:</span>
          {receitaEditando ? (
            <>
              <CurrencyInput value={receitaTotal} onChange={e => setReceitaTotal(e.target.value)} className="w-[160px]" placeholder="0,00" />
              <Btn size="sm" onClick={saveReceita}>💾 Salvar</Btn>
              <Btn size="sm" variant="outline" onClick={() => setReceitaEditando(false)}>Cancelar</Btn>
            </>
          ) : (
            <>
              <span className="text-[16px] font-bold text-primary">R$ {fmtMoney(Number(receitaTotal) || 0)}</span>
              <Btn size="sm" variant="outline" onClick={() => setReceitaEditando(true)}>✏️ Editar</Btn>
            </>
          )}
        </div>
        {/* Filtros */}
        <div className="flex gap-2.5 mb-4 flex-wrap items-end">
          <Field label="Mês" className="w-[140px]">
            <Select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}>
              {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Ano" className="w-[100px]">
            <Select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 mb-4">
          <StatCard value={'R$ ' + fmtMoney(totalEntradas)} label="Entradas" color="text-success" />
          <StatCard value={'R$ ' + fmtMoney(totalSaidas)} label="Saídas" color="text-destructive" />
          <StatCard value={'R$ ' + fmtMoney(saldo)} label="Saldo Líquido" color={saldo >= 0 ? 'text-primary' : 'text-destructive'} />
          <StatCard value={'R$ ' + fmtMoney(prevSaldo)} label={`Líquido ${MESES[prevMonth]?.slice(0, 3)}`} color="text-muted-foreground" />
        </div>

        {/* Meta Progress */}
        {metaValue > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-muted-foreground">🎯 Meta do Mês: R$ {fmtMoney(metaValue)}</span>
              <span className="text-[11px] font-bold text-primary">{metaPct.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${metaPct >= 100 ? 'bg-success' : metaPct >= 50 ? 'bg-primary' : 'bg-yellow-500'}`}
                style={{ width: metaPct + '%' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">Atual: R$ {fmtMoney(saldo)}</span>
              <span className="text-[9px] text-muted-foreground">Faltam: R$ {fmtMoney(Math.max(metaValue - saldo, 0))}</span>
            </div>
          </div>
        )}

        {/* Annual Chart */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h3 className="font-heading text-sm font-bold text-primary mb-3">📊 Comparativo Anual — {viewYear}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={annualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="entradas" fill="hsl(var(--success))" name="Entradas" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(var(--destructive))" name="Saídas" radius={[3, 3, 0, 0]} />
              <Bar dataKey="liquido" fill="hsl(var(--primary))" name="Líquido" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar..." count={monthData.length + ' registro(s)'}>
          <thead><tr><Th>Data</Th><Th>Tipo</Th><Th>Descrição</Th><Th>Categoria</Th><Th>Valor</Th><Th>Obs</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {monthData.sort((a, b) => b.data.localeCompare(a.data)).map(r => (
              <tr key={r.id} className="hover:bg-gold-glow transition-colors">
                <Td>{r.data?.split('-').reverse().join('/')}</Td>
                <Td><Badge variant={r.tipo === 'entrada' ? 'success' : 'danger'}>{r.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}</Badge></Td>
                <Td className="font-bold">{r.descricao}</Td>
                <Td>{r.categoria || '—'}</Td>
                <Td className={`font-bold ${r.tipo === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                  {r.tipo === 'entrada' ? '+' : '-'} R$ {fmtMoney(r.valor)}
                </Td>
                <Td>{r.obs || '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(r.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => del(r.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!monthData.length && <tr><td colSpan={7} className="text-center text-muted-foreground p-5">Nenhum registro neste mês</td></tr>}
          </tbody>
        </TableWrapper>
        </>}
      </div>

      {modalOpen && <FluxoModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} />}
      {metaModalOpen && <MetaModal month={viewMonth} year={viewYear} onClose={() => { setMetaModalOpen(false); refresh(); }} />}
    </>
  );
}

function FluxoModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<FluxoCaixaRegistro>('fluxo_caixa').find(x => x.id === editId) : null;
  const [tipo, setTipo] = useState<'entrada' | 'saida'>(existing?.tipo || 'entrada');
  const [descricao, setDescricao] = useState(existing?.descricao || '');
  const [valor, setValor] = useState(String(existing?.valor ?? ''));
  const [data, setData] = useState(existing?.data || new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState(existing?.categoria || '');
  const [obs, setObs] = useState(existing?.obs || '');

  const save = () => {
    if (!descricao.trim() || !valor || Number(valor) <= 0) { alert('Descrição e valor são obrigatórios!'); return; }
    const list = DB.get<FluxoCaixaRegistro>('fluxo_caixa');
    const obj: FluxoCaixaRegistro = {
      id: editId || nextId('fluxo_caixa'), tipo, descricao: descricao.trim(),
      valor: Number(valor), data, categoria, obs,
      cadastrado: new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.unshift(obj);
    DB.set('fluxo_caixa', list);
    logAcesso(`Fluxo caixa: ${tipo} R$${fmtMoney(Number(valor))} - ${descricao}`, session.name, session.user);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Registro' : '💰 Novo Registro'} maxWidth="520px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados do Registro">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Tipo" required className="flex-1 min-w-[120px]">
            <Select value={tipo} onChange={e => setTipo(e.target.value as 'entrada' | 'saida')}>
              <option value="entrada">📥 Entrada</option>
              <option value="saida">📤 Saída</option>
            </Select>
          </Field>
          <Field label="Data" required className="flex-1 min-w-[120px]"><Input type="date" value={data} onChange={e => setData(e.target.value)} /></Field>
          <Field label="Valor (R$)" required className="flex-1 min-w-[100px]"><CurrencyInput value={valor} onChange={e => setValor(e.target.value)} /></Field>
        </div>
        <Field label="Descrição" required className="w-full mb-2.5"><Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento de serviço" /></Field>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Categoria" className="flex-1 min-w-[120px]">
            <Select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">—</option>
              {['Serviços','Produtos','Salários','Aluguel','Transporte','Material','Combustível','Impostos','Manutenção','Outros'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Observação" className="flex-[2] min-w-[150px]"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
        </div>
      </FormCard>
    </Modal>
  );
}

function MetaModal({ month, year, onClose }: { month: number; year: number; onClose: () => void }) {
  const config = DB.getObj('config');
  const metas = config.fluxoMetas || [];
  const existing = metas.find(m => m.mes === month && m.ano === year);
  const [meta, setMeta] = useState(String(existing?.meta ?? ''));

  const save = () => {
    const cfg = DB.getObj('config');
    const ms = cfg.fluxoMetas || [];
    const idx = ms.findIndex(m => m.mes === month && m.ano === year);
    const obj: FluxoMeta = { mes: month, ano: year, meta: Number(meta) || 0 };
    if (idx >= 0) ms[idx] = obj; else ms.push(obj);
    cfg.fluxoMetas = ms;
    DB.setObj('config', cfg);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`🎯 Meta — ${MESES[month]} ${year}`} maxWidth="380px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Definir Meta">
        <Field label="Valor Meta (R$)" className="w-full">
          <CurrencyInput value={meta} onChange={e => setMeta(e.target.value)} placeholder="Ex: 15.000,00" />
        </Field>
        <p className="text-[10px] text-muted-foreground mt-2">Meta de saldo líquido (entradas - saídas) para este mês.</p>
      </FormCard>
    </Modal>
  );
}

function ComparativoTab({ allData }: { allData: FluxoCaixaRegistro[] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [mesA, setMesA] = useState(currentMonth === 1 ? 12 : currentMonth - 1);
  const [anoA, setAnoA] = useState(currentMonth === 1 ? currentYear - 1 : currentYear);
  const [mesB, setMesB] = useState(currentMonth);
  const [anoB, setAnoB] = useState(currentYear);

  const years = [...new Set(allData.map(r => new Date(r.data).getFullYear()))];
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort();

  const getMonthData = (mes: number, ano: number) => {
    const data = allData.filter(r => {
      const d = new Date(r.data);
      return d.getFullYear() === ano && (d.getMonth() + 1) === mes;
    });
    const ent = data.filter(r => r.tipo === 'entrada').reduce((s, r) => s + r.valor, 0);
    const sai = data.filter(r => r.tipo === 'saida').reduce((s, r) => s + r.valor, 0);
    return { entradas: ent, saidas: sai, liquido: ent - sai };
  };

  const dadosA = getMonthData(mesA, anoA);
  const dadosB = getMonthData(mesB, anoB);

  const labelA = `${MESES[mesA]}/${anoA}`;
  const labelB = `${MESES[mesB]}/${anoB}`;

  const chartData = [
    { name: 'Entradas', [labelA]: dadosA.entradas, [labelB]: dadosB.entradas },
    { name: 'Saídas', [labelA]: dadosA.saidas, [labelB]: dadosB.saidas },
    { name: 'Líquido', [labelA]: dadosA.liquido, [labelB]: dadosB.liquido },
  ];

  const progData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const d = getMonthData(m, anoB);
    return { mes: MESES[m]?.slice(0, 3), entradas: d.entradas, saidas: d.saidas, liquido: d.liquido };
  });

  const varEntradas = dadosA.entradas > 0 ? ((dadosB.entradas - dadosA.entradas) / dadosA.entradas * 100) : 0;
  const varSaidas = dadosA.saidas > 0 ? ((dadosB.saidas - dadosA.saidas) / dadosA.saidas * 100) : 0;
  const varLiquido = dadosA.liquido !== 0 ? ((dadosB.liquido - dadosA.liquido) / Math.abs(dadosA.liquido) * 100) : 0;

  return (
    <>
      {/* Seletores de meses */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="font-heading text-sm font-bold text-primary mb-3">📅 Selecione os Meses para Comparar</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Mês A</span>
            <div className="flex gap-2">
              <Field label="Mês" className="w-[120px]">
                <Select value={mesA} onChange={e => setMesA(Number(e.target.value))}>
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Ano" className="w-[90px]">
                <Select value={anoA} onChange={e => setAnoA(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </Field>
            </div>
          </div>
          <div className="flex items-end pb-2 text-2xl text-muted-foreground">⇄</div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Mês B</span>
            <div className="flex gap-2">
              <Field label="Mês" className="w-[120px]">
                <Select value={mesB} onChange={e => setMesB(Number(e.target.value))}>
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Ano" className="w-[90px]">
                <Select value={anoB} onChange={e => setAnoB(Number(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Cards comparativos */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mb-4">
        {[
          { label: 'Entradas', a: dadosA.entradas, b: dadosB.entradas, pct: varEntradas, color: 'text-success' },
          { label: 'Saídas', a: dadosA.saidas, b: dadosB.saidas, pct: varSaidas, color: 'text-destructive' },
          { label: 'Saldo Líquido', a: dadosA.liquido, b: dadosB.liquido, pct: varLiquido, color: 'text-primary' },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{item.label}</div>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-[9px] text-muted-foreground">{labelA}</div>
                <div className={`text-[13px] font-bold ${item.color}`}>R$ {fmtMoney(item.a)}</div>
              </div>
              <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.pct >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {item.pct >= 0 ? '▲' : '▼'} {Math.abs(item.pct).toFixed(1)}%
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground">{labelB}</div>
                <div className={`text-[13px] font-bold ${item.color}`}>R$ {fmtMoney(item.b)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico comparativo */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h3 className="font-heading text-sm font-bold text-primary mb-3">📊 Comparativo: {labelA} vs {labelB}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip formatter={(v: number) => 'R$ ' + fmtMoney(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey={labelA} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            <Bar dataKey={labelB} fill="hsl(var(--gold-deep, #b8860b))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Progresso mensal do ano selecionado */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading text-sm font-bold text-primary mb-3">📈 Progresso Mensal — {anoB}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={progData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip formatter={(v: number) => 'R$ ' + fmtMoney(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="entradas" stroke="hsl(var(--success))" name="Entradas" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" name="Saídas" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="liquido" stroke="hsl(var(--primary))" name="Líquido" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function CustosFixosTab({ session, onRefresh }: { session: { name: string; user: string }; onRefresh: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onRefresh(); };
  void tick;

  const list = DB.get<CustoFixo>('custos_fixos');
  const total = list.reduce((s, c) => s + c.valor, 0);

  const del = (id: number) => {
    if (!confirm('Excluir este custo fixo?')) return;
    DB.set('custos_fixos', list.filter(c => c.id !== id));
    logAcesso('Excluiu custo fixo ID ' + id, session.name, session.user);
    syncFluxoGS(true);
    refresh();
  };

  const CATEGORIAS = ['Vale Alimentação (Ticket)', 'Vale Transporte (Passagem)', 'Plano de Saúde', 'Plano Dentário', 'Aluguel', 'Água/Luz/Internet', 'Folha de Pagamento', 'Combustível', 'Manutenção', 'Material de Limpeza', 'Outros'];

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[12px] font-bold text-muted-foreground">Total de Custos Fixos: <span className="text-destructive text-[15px]">R$ {fmtMoney(total)}</span></div>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Custo Fixo</Btn>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
        {CATEGORIAS.filter(cat => list.some(c => c.categoria === cat)).map(cat => {
          const catTotal = list.filter(c => c.categoria === cat).reduce((s, c) => s + c.valor, 0);
          return <StatCard key={cat} value={'R$ ' + fmtMoney(catTotal)} label={cat} color="text-destructive" />;
        })}
      </div>
      <TableWrapper count={list.length + ' custo(s)'}>
        <thead><tr><Th>Descrição</Th><Th>Categoria</Th><Th>Valor</Th><Th>Obs</Th><Th>Ações</Th></tr></thead>
        <tbody>
          {list.map(c => (
            <tr key={c.id} className="hover:bg-gold-glow transition-colors">
              <Td className="font-bold">{c.descricao}</Td>
              <Td><Badge variant="info">{c.categoria || '—'}</Badge></Td>
              <Td className="font-bold text-destructive">R$ {fmtMoney(c.valor)}</Td>
              <Td>{c.obs || '—'}</Td>
              <Td>
                <div className="flex gap-1">
                  <Btn size="sm" variant="outline" onClick={() => { setEditId(c.id); setModalOpen(true); }}>✏️</Btn>
                  <Btn size="sm" variant="danger" onClick={() => del(c.id)}>🗑</Btn>
                </div>
              </Td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={5} className="text-center text-muted-foreground p-5">Nenhum custo fixo cadastrado</td></tr>}
        </tbody>
      </TableWrapper>

      {modalOpen && (
        <CustoFixoModal
          editId={editId}
          categorias={CATEGORIAS}
          onClose={() => { setModalOpen(false); refresh(); }}
          session={session}
        />
      )}
    </>
  );
}

function CustoFixoModal({ editId, categorias, onClose, session }: {
  editId: number | null; categorias: string[];
  onClose: () => void; session: { name: string; user: string };
}) {
  const existing = editId ? DB.get<CustoFixo>('custos_fixos').find(c => c.id === editId) : null;
  const [descricao, setDescricao] = useState(existing?.descricao || '');
  const [valor, setValor] = useState(String(existing?.valor ?? ''));
  const [categoria, setCategoria] = useState(existing?.categoria || '');
  const [obs, setObs] = useState(existing?.obs || '');

  const save = () => {
    if (!descricao.trim()) { alert('Descrição obrigatória!'); return; }
    if (!valor || Number(valor) <= 0) { alert('Valor deve ser maior que zero!'); return; }
    const list = DB.get<CustoFixo>('custos_fixos');
    const obj: CustoFixo = {
      id: editId || nextId('custos_fixos'),
      descricao: descricao.trim(), valor: Number(valor), categoria, obs,
      cadastrado: new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(c => c.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('custos_fixos', list);
    logAcesso(`Custo fixo: ${descricao} R$${fmtMoney(Number(valor))}`, session.name, session.user);
    syncFluxoGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Custo Fixo' : '🧾 Novo Custo Fixo'} maxWidth="480px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados do Custo Fixo">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Descrição" required className="flex-[3] min-w-[160px]">
            <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Vale Alimentação" autoFocus />
          </Field>
          <Field label="Valor (R$)" required className="flex-1 min-w-[110px]">
            <CurrencyInput value={valor} onChange={e => setValor(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Categoria" className="flex-[2] min-w-[160px]">
            <Select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">— Selecione —</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Observação" className="flex-[2] min-w-[150px]">
            <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
          </Field>
        </div>
      </FormCard>
    </Modal>
  );
}
