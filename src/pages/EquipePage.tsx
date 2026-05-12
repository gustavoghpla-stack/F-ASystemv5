import { useState, useMemo, useEffect, useRef } from 'react';
import { DB, nextId, fmtDate, syncEquipeGS, verifyPassword, type Funcionario, type AvaliacaoRegistro, MESES } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, Btn, Modal, FormCard, Field, Input, Select } from '@/components/ui-custom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOTIVOS = [
  { key: 'mau_odor',  label: 'Mau Odor',      icon: '💨', fill: '#a855f7' },
  { key: 'manchas',   label: 'Manchas',        icon: '🔵', fill: '#3b82f6' },
  { key: 'sujidade',  label: 'Sujidade',       icon: '🟤', fill: '#f97316' },
  { key: 'dano',      label: 'Dano ao Móvel',  icon: '⚠️', fill: '#ef4444' },
  { key: 'outros',    label: 'Outros',         icon: '📌', fill: '#6b7280' },
] as const;
type MotivoKey = typeof MOTIVOS[number]['key'];

function calcStats(funcId: number, avaliacoes: AvaliacaoRegistro[]) {
  const mine = avaliacoes.filter(a => a.funcionarioId === funcId);
  const elogios = mine.filter(a => a.tipo === 'elogio').length;
  const reclamacoes = mine.filter(a => a.tipo === 'reclamacao').length;
  const retrabalhos = mine.filter(a => a.tipo === 'retrabalho').length;
  const totalSat = elogios + reclamacoes;
  const satisfacao = totalSat === 0 ? 10 : parseFloat(((elogios / totalSat) * 10).toFixed(1));
  const qualidade = parseFloat(Math.max(0, 10 - retrabalhos).toFixed(1));
  const motivoCounts: Record<MotivoKey, number> = { mau_odor: 0, manchas: 0, sujidade: 0, dano: 0, outros: 0 };
  mine.filter(a => a.tipo === 'retrabalho' && a.motivo).forEach(a => {
    if (a.motivo) motivoCounts[a.motivo as MotivoKey]++;
  });
  return { elogios, reclamacoes, retrabalhos, satisfacao, qualidade, motivoCounts };
}

function tempoNaEmpresa(admissao: string): string {
  if (!admissao) return '—';
  const dias = Math.floor((Date.now() - new Date(admissao).getTime()) / 86400000);
  if (dias < 0) return '—';
  if (dias < 30) return `${dias} dia(s)`;
  if (dias < 365) return `${Math.floor(dias / 30)} mês(es)`;
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  return meses > 0 ? `${anos}a ${meses}m` : `${anos} ano(s)`;
}

function StarsBar({ value, max = 10, color = 'text-yellow-400' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-[10px] ${i < Math.floor(value) ? color : 'text-muted-foreground/20'}`}>★</span>
      ))}
      <span className="text-[10px] text-muted-foreground ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

export default function EquipePage() {
  const { session } = useAuth();
  const nivel = session?.nivel || 'Operador';
  const isAdminOrMaster = nivel === 'Administrador' || nivel === 'Master';

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState<number | null>(null);
  const [detailFunc, setDetailFunc] = useState<number | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [danoAlertVisible, setDanoAlertVisible] = useState(false);
  const danoAlertShownRef = useRef(false);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;

  const funcionarios = DB.get<Funcionario>('func').filter(f => !f.demissao);
  const allAvaliacoes = DB.get<AvaliacaoRegistro>('equipe_avaliacoes');

  const monthAvaliacoes = useMemo(() => allAvaliacoes.filter(a => {
    const d = new Date(a.data);
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
  }), [allAvaliacoes, filterMonth, filterYear, tick]);

  const years = useMemo(() => {
    const ys = [...new Set(allAvaliacoes.map(a => new Date(a.data).getFullYear()))];
    if (!ys.includes(filterYear)) ys.push(filterYear);
    return ys.sort((a, b) => a - b);
  }, [allAvaliacoes, filterYear]);

  const totalElogios    = monthAvaliacoes.filter(a => a.tipo === 'elogio').length;
  const totalReclamacoes = monthAvaliacoes.filter(a => a.tipo === 'reclamacao').length;
  const totalRetrabalhos = monthAvaliacoes.filter(a => a.tipo === 'retrabalho').length;

  const danoAlert = monthAvaliacoes.filter(a => a.tipo === 'retrabalho' && a.motivo === 'dano');

  // Show dano alert only once per session, only if funcionários exist
  useEffect(() => {
    if (danoAlert.length > 0 && funcionarios.length > 0 && !danoAlertShownRef.current) {
      danoAlertShownRef.current = true;
      setDanoAlertVisible(true);
      const t = setTimeout(() => setDanoAlertVisible(false), 8000);
      return () => clearTimeout(t);
    }
    if (danoAlert.length === 0) {
      danoAlertShownRef.current = false;
      setDanoAlertVisible(false);
    }
  }, [danoAlert.length, funcionarios.length]);

  const motivoChartData = MOTIVOS.map(m => ({
    ...m,
    valor: allAvaliacoes.filter(a => a.tipo === 'retrabalho' && a.motivo === m.key).length,
  })).filter(d => d.valor > 0);

  return (
    <>
      <PageHeader title="Controle de Equipe" icon="⭐">
        {isAdminOrMaster && (
          <Btn variant="danger" onClick={() => setDeleteAllOpen(true)}>🗑 Apagar Tudo</Btn>
        )}
        <Btn variant="outline" onClick={() => syncEquipeGS()}>📤 Sincronizar</Btn>
        <Btn
          onClick={() => { setSelectedFunc(null); setModalOpen(true); }}
          className={!funcionarios.length ? 'opacity-50 cursor-not-allowed' : ''}
        >
          ➕ Novo Registro
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Dano alert — shows once, auto-dismisses after 8s */}
        {danoAlertVisible && funcionarios.length > 0 && (
          <div className="bg-destructive/15 border border-destructive rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-up">
            <span className="text-[22px]">⚠️</span>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-destructive">
                ATENÇÃO — Dano ao Móvel em {MESES[filterMonth]}/{filterYear}
              </div>
              <div className="text-[10px] text-destructive/80">
                {danoAlert.length} ocorrência(s): {[...new Set(danoAlert.map(a => a.funcionarioNome))].join(', ')}
              </div>
            </div>
            <button onClick={() => setDanoAlertVisible(false)}
              className="text-destructive/60 hover:text-destructive text-[16px] font-bold ml-2">✕</button>
          </div>
        )}

        {/* No funcionários warning */}
        {!funcionarios.length && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-[11px] text-yellow-500 font-semibold">
            ⚠️ Nenhum funcionário ativo cadastrado. Cadastre funcionários antes de registrar avaliações.
          </div>
        )}

        {/* Filter + Stats */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            className="p-[6px_10px] bg-secondary border border-border rounded-md text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="p-[6px_10px] bg-secondary border border-border rounded-md text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div className="flex gap-2 ml-auto flex-wrap">
            {[
              { label: 'Elogios', val: totalElogios, icon: '👍', cls: 'bg-success/10 border-success/30 text-success' },
              { label: 'Reclamações', val: totalReclamacoes, icon: '👎', cls: 'bg-destructive/10 border-destructive/30 text-destructive' },
              { label: 'Retrabalhos', val: totalRetrabalhos, icon: '🔁', cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl px-4 py-2 text-center ${s.cls}`}>
                <div className="text-[20px] font-bold">{s.val}</div>
                <div className="text-[9px] font-semibold">{s.icon} {s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
          {funcionarios.map(func => {
            const statsAll = calcStats(func.id, allAvaliacoes);
            const statsMes = calcStats(func.id, monthAvaliacoes);
            const topMotivo = MOTIVOS.map(m => ({ ...m, count: statsAll.motivoCounts[m.key] }))
              .filter(m => m.count > 0).sort((a, b) => b.count - a.count)[0];

            return (
              <div key={func.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all">
                <div className="bg-secondary px-3.5 py-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center text-[16px] font-bold text-primary-foreground shrink-0 overflow-hidden border-2 border-primary/20">
                    {func.foto ? <img src={func.foto} className="w-full h-full object-cover" alt="" /> : (func.nome?.[0]?.toUpperCase() || '👤')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold truncate">{func.nome}</div>
                    <div className="text-[9px] text-muted-foreground">{func.funcao || '—'}</div>
                    <div className="text-[9px] text-muted-foreground/70 mt-0.5">🏢 {tempoNaEmpresa(func.admissao)}</div>
                  </div>
                  <button onClick={() => setDetailFunc(func.id)}
                    className="text-[10px] text-muted-foreground hover:text-primary px-2 py-1 rounded border border-border hover:border-primary/40 transition-all shrink-0">
                    Ver +
                  </button>
                </div>

                <div className="px-3.5 py-2 border-b border-border/50 grid grid-cols-2 gap-2">
                  <div><div className="text-[8px] text-muted-foreground uppercase mb-0.5">Satisfação</div><StarsBar value={statsAll.satisfacao} color="text-yellow-400" /></div>
                  <div><div className="text-[8px] text-muted-foreground uppercase mb-0.5">Qualidade</div><StarsBar value={statsAll.qualidade} color="text-primary" /></div>
                </div>

                <div className="px-3.5 py-2.5">
                  <div className="text-[8px] font-bold text-muted-foreground uppercase mb-1.5">{MESES[filterMonth]}/{filterYear}</div>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {[
                      { val: statsMes.elogios, icon: '👍', cls: 'text-success bg-success/10' },
                      { val: statsMes.reclamacoes, icon: '👎', cls: 'text-destructive bg-destructive/10' },
                      { val: statsMes.retrabalhos, icon: '🔁', cls: statsMes.retrabalhos > 0 ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground bg-secondary' },
                    ].map((s, i) => (
                      <div key={i} className={`rounded-lg p-1.5 text-center ${s.cls}`}>
                        <div className="text-[16px] font-bold">{s.val}</div>
                        <div className="text-[8px]">{s.icon}</div>
                      </div>
                    ))}
                  </div>
                  {topMotivo && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold ${topMotivo.key === 'dano' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                      <span>{topMotivo.icon}</span>
                      <span className="flex-1">Falha: {topMotivo.label}</span>
                      <span className="font-bold">{topMotivo.count}×</span>
                      {topMotivo.key === 'dano' && <span>⚠️</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-px bg-border">
                  {[
                    { label: '👍 Elogio', cls: 'text-success hover:bg-success/10' },
                    { label: '👎 Reclamação', cls: 'text-destructive hover:bg-destructive/10' },
                    { label: '🔁 Retrabalho', cls: 'text-yellow-500 hover:bg-yellow-500/10' },
                  ].map(btn => (
                    <button key={btn.label} onClick={() => { setSelectedFunc(func.id); setModalOpen(true); }}
                      className={`bg-card py-2 text-[9px] font-bold transition-colors ${btn.cls}`}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!funcionarios.length && (
            <div className="col-span-full text-center text-muted-foreground p-10 bg-card border border-border rounded-xl text-[12px]">
              Cadastre funcionários para visualizar os cards de equipe.
            </div>
          )}
        </div>

        {/* Charts */}
        {motivoChartData.length > 0 && (
          <div className="grid grid-cols-[1fr_220px] gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[12px] font-bold text-primary mb-3">📊 Retrabalhos por Causa (Geral)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={motivoChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {motivoChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[12px] font-bold text-primary mb-3">🏆 Ranking por Motivo</div>
              <div className="space-y-1.5">
                {[...motivoChartData].sort((a, b) => b.valor - a.valor).map((m, i) => (
                  <div key={m.key} className={`flex items-center gap-2 p-2 rounded-lg text-[10px] ${m.key === 'dano' ? 'bg-destructive/10 border border-destructive/30' : 'bg-secondary'}`}>
                    <span className="text-[10px] font-bold text-muted-foreground w-3">{i + 1}.</span>
                    <span>{m.icon}</span>
                    <span className="flex-1 font-semibold truncate">{m.label}</span>
                    <span className={`font-bold ${m.key === 'dano' ? 'text-destructive' : 'text-primary'}`}>{m.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Ranking de Funcionários ── */}
        {funcionarios.length > 0 && monthAvaliacoes.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mt-4">
            <div className="text-[12px] font-bold text-primary mb-3">🌟 Ranking de Funcionários ({MESES[viewMonth - 1]})</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Top Elogios */}
              <div>
                <div className="text-[10px] font-bold text-success mb-2 uppercase tracking-wide">👍 Mais Elogios</div>
                <div className="space-y-1.5">
                  {funcionarios.map(f => ({ func: f, count: monthAvaliacoes.filter(a => a.funcionarioId === f.id && a.tipo === 'elogio').length }))
                    .filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5).map((x, i) => (
                      <div key={x.func.id} className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/30 text-[10px]">
                        <span className="font-bold text-muted-foreground w-3">{i + 1}.</span>
                        <span className="flex-1 font-semibold truncate">{x.func.nome}</span>
                        <span className="font-bold text-success">{x.count}</span>
                      </div>
                    ))}
                  {!funcionarios.some(f => monthAvaliacoes.some(a => a.funcionarioId === f.id && a.tipo === 'elogio')) && (
                    <div className="text-[10px] text-muted-foreground italic p-2">Nenhum elogio neste mês</div>
                  )}
                </div>
              </div>
              {/* Top Reclamações */}
              <div>
                <div className="text-[10px] font-bold text-destructive mb-2 uppercase tracking-wide">👎 Mais Reclamações</div>
                <div className="space-y-1.5">
                  {funcionarios.map(f => ({ func: f, count: monthAvaliacoes.filter(a => a.funcionarioId === f.id && a.tipo === 'reclamacao').length }))
                    .filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5).map((x, i) => (
                      <div key={x.func.id} className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-[10px]">
                        <span className="font-bold text-muted-foreground w-3">{i + 1}.</span>
                        <span className="flex-1 font-semibold truncate">{x.func.nome}</span>
                        <span className="font-bold text-destructive">{x.count}</span>
                      </div>
                    ))}
                  {!funcionarios.some(f => monthAvaliacoes.some(a => a.funcionarioId === f.id && a.tipo === 'reclamacao')) && (
                    <div className="text-[10px] text-muted-foreground italic p-2">Nenhuma reclamação neste mês</div>
                  )}
                </div>
              </div>
              {/* Top Retrabalhos */}
              <div>
                <div className="text-[10px] font-bold text-yellow-500 mb-2 uppercase tracking-wide">🔁 Mais Retrabalhos</div>
                <div className="space-y-1.5">
                  {funcionarios.map(f => ({ func: f, count: monthAvaliacoes.filter(a => a.funcionarioId === f.id && a.tipo === 'retrabalho').length }))
                    .filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5).map((x, i) => (
                      <div key={x.func.id} className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-[10px]">
                        <span className="font-bold text-muted-foreground w-3">{i + 1}.</span>
                        <span className="flex-1 font-semibold truncate">{x.func.nome}</span>
                        <span className="font-bold text-yellow-500">{x.count}</span>
                      </div>
                    ))}
                  {!funcionarios.some(f => monthAvaliacoes.some(a => a.funcionarioId === f.id && a.tipo === 'retrabalho')) && (
                    <div className="text-[10px] text-muted-foreground italic p-2">Nenhum retrabalho neste mês</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOpen && funcionarios.length > 0 && (
        <AvaliacaoModal funcIdInicial={selectedFunc} funcionarios={funcionarios}
          onClose={() => { setModalOpen(false); setSelectedFunc(null); refresh(); }} session={session!} />
      )}
      {detailFunc !== null && (
        <DetailModal funcId={detailFunc} func={funcionarios.find(f => f.id === detailFunc)!}
          avaliacoes={allAvaliacoes.filter(a => a.funcionarioId === detailFunc)}
          onClose={() => setDetailFunc(null)}
          onNewReg={() => { setSelectedFunc(detailFunc); setDetailFunc(null); setModalOpen(true); }}
          session={session!} onRefresh={refresh} />
      )}
      {deleteAllOpen && (
        <DeleteAllModal onClose={() => setDeleteAllOpen(false)} session={session!} onRefresh={refresh} />
      )}
    </>
  );
}

// ─── Delete All Modal (Admin/Master only) ─────────────────────────────────────
function DeleteAllModal({ onClose, session, onRefresh }: {
  onClose: () => void; session: { name: string; user: string; nivel: string }; onRefresh: () => void;
}) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!senha.trim()) { setErro('Digite a senha mestra.'); return; }
    setLoading(true);
    try {
      const cfg = DB.getObj('config');
      const ok = cfg.masterPasswordHash
        ? await verifyPassword(senha, cfg.masterPasswordHash)
        : false;
      if (!ok) { setErro('Senha mestra incorreta!'); setLoading(false); return; }
      DB.set('equipe_avaliacoes', []);
      logAcesso('Apagou todos os dados de Controle de Equipe', session.name, session.user);
      await syncEquipeGS(true);
      onRefresh();
      onClose();
    } catch (e: any) {
      setErro('Erro: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="🗑 Apagar Dados de Controle de Equipe" maxWidth="420px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn variant="danger" onClick={confirm}>{loading ? 'Aguarde...' : '⚠️ Apagar Tudo'}</Btn></>}>
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-[11px] text-destructive">
        <p className="font-bold mb-1">⚠️ Esta ação é irreversível!</p>
        <p>Todos os registros de elogios, reclamações e retrabalhos serão apagados permanentemente do sistema e da planilha Google Sheets.</p>
      </div>
      <Field label="Senha Mestra para confirmar" required className="w-full">
        <Input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro(''); }}
          onKeyDown={e => e.key === 'Enter' && confirm()} placeholder="Digite a senha mestra..." autoFocus />
      </Field>
      {erro && <p className="text-destructive text-[11px] mt-2">{erro}</p>}
    </Modal>
  );
}

// ─── Registration Modal ────────────────────────────────────────────────────────
function AvaliacaoModal({ funcIdInicial, funcionarios, onClose, session }: {
  funcIdInicial: number | null; funcionarios: Funcionario[];
  onClose: () => void; session: { name: string; user: string };
}) {
  const [funcId, setFuncId] = useState(String(funcIdInicial ?? ''));
  const [tipo, setTipo] = useState<'elogio' | 'reclamacao' | 'retrabalho'>('elogio');
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ordemServico, setOrdemServico] = useState('');
  const [origem, setOrigem] = useState<'cliente' | 'interno' | 'supervisor'>('cliente');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const isRet = tipo === 'retrabalho';

  const save = () => {
    if (!funcId) { alert('Selecione o funcionário!'); return; }
    if (isRet && !motivo) { alert('Motivo é obrigatório para retrabalho!'); return; }
    if (isRet && !ordemServico.trim()) { alert('Ordem de serviço é obrigatória para retrabalho!'); return; }
    const func = funcionarios.find(f => f.id === Number(funcId));
    const obj: AvaliacaoRegistro = {
      id: nextId('equipe_avaliacoes'), funcionarioId: Number(funcId),
      funcionarioNome: func?.nome || '', tipo,
      motivo: isRet ? motivo as AvaliacaoRegistro['motivo'] : undefined,
      descricao: descricao.trim() || undefined,
      ordemServico: isRet ? ordemServico.trim() : undefined,
      origem: tipo !== 'elogio' ? origem : undefined,
      data, cadastrado: new Date().toLocaleString('pt-BR'),
    };
    const list = DB.get<AvaliacaoRegistro>('equipe_avaliacoes');
    list.unshift(obj);
    DB.set('equipe_avaliacoes', list);
    logAcesso(`Equipe: ${tipo}${motivo ? ' (' + motivo + ')' : ''} - ${func?.nome}`, session.name, session.user);
    syncEquipeGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="📋 Novo Registro" maxWidth="500px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Registrar</Btn></>}>
      <FormCard title="Dados do Registro">
        <div className="flex gap-2.5 mb-3 flex-wrap">
          <Field label="Funcionário" required className="flex-[2] min-w-[160px]">
            <Select value={funcId} onChange={e => setFuncId(e.target.value)}>
              <option value="">— Selecione —</option>
              {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </Select>
          </Field>
          <Field label="Data" className="flex-1 min-w-[120px]">
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </Field>
        </div>

        <div className="mb-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Tipo *</div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['elogio',     '👍 Elogio',     'text-success',     'bg-success/10 border-success/40'],
              ['reclamacao', '👎 Reclamação', 'text-destructive', 'bg-destructive/10 border-destructive/40'],
              ['retrabalho', '🔁 Retrabalho', 'text-yellow-500',  'bg-yellow-500/10 border-yellow-500/40'],
            ] as const).map(([t, lbl, tc, ac]) => (
              <button key={t} onClick={() => { setTipo(t); setMotivo(''); }}
                className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${tipo === t ? `${ac} ${tc}` : 'border-border text-muted-foreground'}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {isRet && (
          <>
            <div className="mb-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Motivo *</div>
              <div className="grid grid-cols-2 gap-1.5">
                {MOTIVOS.map(m => (
                  <button key={m.key} onClick={() => setMotivo(m.key)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg text-[10px] font-semibold border transition-all text-left
                      ${motivo === m.key ? (m.key === 'dano' ? 'border-destructive bg-destructive/15 text-destructive' : 'border-primary bg-primary/10 text-primary') : 'border-border text-muted-foreground'}`}>
                    <span>{m.icon}</span> {m.label}
                    {m.key === 'dano' && <span className="ml-auto text-[8px] font-bold text-destructive">GRAVE</span>}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Ordem de Serviço *" required className="w-full mb-2.5">
              <Input value={ordemServico} onChange={e => setOrdemServico(e.target.value)} placeholder="Nº da OS" />
            </Field>
          </>
        )}

        {tipo !== 'elogio' && (
          <div className="mb-2.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Origem</div>
            <div className="flex gap-1.5">
              {(['cliente', 'interno', 'supervisor'] as const).map(o => (
                <button key={o} onClick={() => setOrigem(o)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${origem === o ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                  {o === 'cliente' ? '👤 Cliente' : o === 'interno' ? '🏢 Interno' : '👔 Supervisor'}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Descrição (opcional)" className="w-full">
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
            className="w-full p-[8px_10px] bg-input border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
            placeholder={isRet ? 'Detalhes do problema (opcional)' : 'Descrição (opcional)'} />
        </Field>
      </FormCard>
    </Modal>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ funcId, func, avaliacoes, onClose, onNewReg, session, onRefresh }: {
  funcId: number; func: Funcionario; avaliacoes: AvaliacaoRegistro[];
  onClose: () => void; onNewReg: () => void;
  session: { name: string; user: string }; onRefresh: () => void;
}) {
  const stats = calcStats(funcId, avaliacoes);
  const sorted = [...avaliacoes].sort((a, b) => b.data.localeCompare(a.data));
  const motivosComDados = MOTIVOS.filter(m => stats.motivoCounts[m.key] > 0)
    .sort((a, b) => stats.motivoCounts[b.key] - stats.motivoCounts[a.key]);

  const del = (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    DB.set('equipe_avaliacoes', DB.get<AvaliacaoRegistro>('equipe_avaliacoes').filter(a => a.id !== id));
    syncEquipeGS(true);
    onRefresh();
    onClose();
  };

  if (!func) return null;

  return (
    <Modal open onClose={onClose} title={`📋 ${func.nome}`} maxWidth="580px"
      footer={<div className="flex justify-between w-full"><Btn onClick={onNewReg}>➕ Novo Registro</Btn><Btn variant="outline" onClick={onClose}>Fechar</Btn></div>}>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-secondary rounded-xl p-3 space-y-2">
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Avaliação Geral</div>
          <div><div className="text-[9px] text-muted-foreground mb-0.5">⭐ Satisfação</div><StarsBar value={stats.satisfacao} color="text-yellow-400" /></div>
          <div><div className="text-[9px] text-muted-foreground mb-0.5">🛠 Qualidade</div><StarsBar value={stats.qualidade} color="text-primary" /></div>
          <div className="text-[9px] text-muted-foreground">🏢 {tempoNaEmpresa(func.admissao)}</div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { val: stats.elogios, icon: '👍', cls: 'bg-success/10 border-success/20 text-success' },
            { val: stats.reclamacoes, icon: '👎', cls: 'bg-destructive/10 border-destructive/20 text-destructive' },
            { val: stats.retrabalhos, icon: '🔁', cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' },
          ].map((s, i) => (
            <div key={i} className={`border rounded-xl p-2 text-center ${s.cls}`}>
              <div className="text-[20px] font-bold">{s.val}</div>
              <div className="text-[9px]">{s.icon}</div>
            </div>
          ))}
        </div>
      </div>

      {motivosComDados.length > 0 && (
        <div className="bg-secondary rounded-xl p-3 mb-3">
          <div className="text-[9px] font-bold text-muted-foreground uppercase mb-2">📊 Retrabalhos por Causa</div>
          <div className="grid grid-cols-2 gap-1.5">
            {motivosComDados.map(m => (
              <div key={m.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold ${m.key === 'dano' ? 'bg-destructive/15 border border-destructive/30 text-destructive' : 'bg-card'}`}>
                <span>{m.icon}</span><span className="flex-1">{m.label}</span>
                <span className={`font-bold ${m.key === 'dano' ? 'text-destructive' : 'text-primary'}`}>{stats.motivoCounts[m.key]}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[9px] font-bold text-muted-foreground uppercase mb-2">📜 Histórico</div>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {!sorted.length && <div className="text-center text-muted-foreground p-4 text-[11px]">Nenhum registro</div>}
        {sorted.map(a => {
          const mInfo = MOTIVOS.find(m => m.key === a.motivo);
          return (
            <div key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-[10px]
              ${a.tipo === 'elogio' ? 'bg-success/5 border-success/20'
                : a.tipo === 'reclamacao' ? 'bg-destructive/5 border-destructive/20'
                : a.motivo === 'dano' ? 'bg-destructive/10 border-destructive/30'
                : 'bg-yellow-500/5 border-yellow-500/20'}`}>
              <span className="text-[14px] mt-0.5 shrink-0">
                {a.tipo === 'elogio' ? '👍' : a.tipo === 'reclamacao' ? '👎' : mInfo?.icon || '🔁'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">
                    {a.tipo === 'elogio' ? 'Elogio' : a.tipo === 'reclamacao' ? 'Reclamação' : `Retrabalho${mInfo ? ' — ' + mInfo.label : ''}`}
                  </span>
                  {a.origem && <span className="text-[8px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground capitalize">{a.origem}</span>}
                  {a.ordemServico && <span className="text-[8px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">OS: {a.ordemServico}</span>}
                </div>
                {a.descricao && <div className="text-muted-foreground mt-0.5 truncate">{a.descricao}</div>}
                <div className="text-muted-foreground/70 mt-0.5">{fmtDate(a.data)} · {a.cadastrado}</div>
              </div>
              <button onClick={() => del(a.id)} className="text-destructive/40 hover:text-destructive shrink-0">🗑</button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
