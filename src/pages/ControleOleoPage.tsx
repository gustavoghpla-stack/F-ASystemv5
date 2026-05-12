import { useState, useMemo, useEffect } from 'react';
import { DB, nextId, syncEstoqueGS, type Veiculo , onSyncComplete } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, TableWrapper, Th, Td, Btn, Modal, FormCard, Field, Input, Select, ConfirmModal } from '@/components/ui-custom';

export interface TrocaOleo {
  id: number;
  veiculoId: number; veiculoPlaca: string; veiculoModelo: string;
  hodometro: number; litros: number; valorLitro: number; valorTotal: number;
  motorista: string; obs: string; data: string; cadastrado: string;
}

// ── Cálculo de status ────────────────────────────────────────────────────────

function calcStatus(v: Veiculo) {
  const meta    = v.metaKmOleo || 0;
  const hodAtual = v.hodometroAtual || 0;
  const hodTroca = v.hodometroUltimaTroca || 0;
  const kmFeito  = hodAtual - hodTroca;
  const kmRestante = meta > 0 ? Math.max(0, meta - kmFeito) : 0;
  const pctHod     = meta > 0 ? Math.min(100, (kmFeito / meta) * 100) : 0;

  let diasRestantes: number | null = null;
  let pctData = 0;
  if (v.dataProximaTroca) {
    diasRestantes = Math.ceil((new Date(v.dataProximaTroca).getTime() - Date.now()) / 86400000);
    pctData = Math.min(100, Math.max(0, ((30 - diasRestantes) / 30) * 100));
  }

  const pct = Math.max(pctHod, pctData);
  const cor: 'success' | 'warning' | 'danger' = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success';
  const label = pct >= 90 ? 'Troca urgente!' : pct >= 70 ? 'Próximo da troca' : 'Regular';
  return { pct, kmRestante, diasRestantes, cor, label };
}

const C = {
  success: { bar: 'bg-success',     text: 'text-success',     badge: 'bg-success/20 text-success border-success/40' },
  warning: { bar: 'bg-yellow-500',  text: 'text-yellow-500',  badge: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40' },
  danger:  { bar: 'bg-destructive', text: 'text-destructive', badge: 'bg-destructive/20 text-destructive border-destructive/40' },
};

function StatusBar({ pct, cor }: { pct: number; cor: 'success' | 'warning' | 'danger' }) {
  return (
    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${C[cor].bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Página Principal ─────────────────────────────────────────────────────────

export default function ControleOleoPage() {
  const { session } = useAuth();
  const [search, setSearch]             = useState('');
  const [tab, setTab]                   = useState<'status' | 'historico'>('status');
  // Modal de registro de troca
  const [trocaOpen, setTrocaOpen]       = useState(false);
  const [trocaVeiculoId, setTrocaVeiculoId] = useState<number | null>(null);
  // Modal de configurar meta
  const [metaOpen, setMetaOpen]         = useState(false);
  const [metaVeiculoId, setMetaVeiculoId] = useState<number | null>(null);
  // Confirmar exclusão
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => onSyncComplete(refresh), []);

  const veiculos = DB.get<Veiculo>('veiculos');
  const trocas   = DB.get<TrocaOleo>('trocas_oleo');

  const filteredVeiculos = useMemo(() =>
    veiculos.filter(v => !search || v.placa.toLowerCase().includes(search.toLowerCase()) || v.modelo.toLowerCase().includes(search.toLowerCase())),
    [veiculos, search, trocas.length]
  );

  const filteredTrocas = useMemo(() =>
    [...trocas].sort((a, b) => b.data.localeCompare(a.data))
      .filter(t => !search || t.veiculoPlaca.toLowerCase().includes(search.toLowerCase()) || t.veiculoModelo.toLowerCase().includes(search.toLowerCase())),
    [trocas, search]
  );

  const openTroca = (veiculoId?: number) => {
    setTrocaVeiculoId(veiculoId ?? null);
    setTrocaOpen(true);
  };

  const openMeta = (veiculoId: number) => {
    setMetaVeiculoId(veiculoId);
    setMetaOpen(true);
  };

  const closeTroca = () => { setTrocaOpen(false); setTrocaVeiculoId(null); refresh(); };
  const closeMeta  = () => { setMetaOpen(false);  setMetaVeiculoId(null);  refresh(); };

  const deleteTroca = (id: number) => {
    DB.set('trocas_oleo', trocas.filter(t => t.id !== id));
    syncEstoqueGS(true);
    refresh();
  };

  const urgentes  = veiculos.filter(v => calcStatus(v).cor === 'danger').length;
  const proximos  = veiculos.filter(v => calcStatus(v).cor === 'warning').length;
  const regulares = veiculos.filter(v => calcStatus(v).cor === 'success').length;

  return (
    <>
      <PageHeader title="Controle de Óleo" icon="🛢️">
        <Btn variant="outline" onClick={() => syncEstoqueGS()}>📤 Sincronizar</Btn>
        <Btn onClick={() => openTroca()}>➕ Registrar Troca</Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold text-destructive">{urgentes}</div>
            <div className="text-[10px] text-muted-foreground">Troca urgente</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold text-yellow-500">{proximos}</div>
            <div className="text-[10px] text-muted-foreground">Próximos</div>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center">
            <div className="text-[22px] font-bold text-success">{regulares}</div>
            <div className="text-[10px] text-muted-foreground">Regulares</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary p-1 rounded-xl">
          {([['status','🚗 Status por Veículo'],['historico','📋 Histórico']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all ${tab === t ? 'bg-card text-primary shadow' : 'text-muted-foreground'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── STATUS ── */}
        {tab === 'status' && (
          <div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar veículo..." className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[12px] text-foreground outline-none focus:border-primary/60 mb-3" />

            {!veiculos.length && (
              <div className="text-center text-muted-foreground p-8 text-[12px]">
                Nenhum veículo cadastrado.<br />Cadastre em <b>Abastecimento → Veículos</b>.
              </div>
            )}

            <div className="space-y-3">
              {filteredVeiculos.map(v => {
                const st = calcStatus(v);
                const c = C[st.cor];
                return (
                  <div key={v.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-bold text-[14px]">{v.placa} — {v.modelo}</div>
                        <div className="text-[11px] text-muted-foreground">{v.ano} · {v.combustivel}</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.badge}`}>{st.label}</span>
                        <Btn size="sm" onClick={() => openTroca(v.id)}>🛢 Registrar Troca</Btn>
                        <Btn size="sm" variant="outline" onClick={() => openMeta(v.id)}>⚙️ Meta</Btn>
                      </div>
                    </div>

                    {(v.metaKmOleo > 0 || v.dataProximaTroca) ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Desgaste do óleo</span>
                          <span className={`font-bold ${c.text}`}>{Math.round(st.pct)}%</span>
                        </div>
                        <StatusBar pct={st.pct} cor={st.cor} />
                        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mt-1">
                          {v.metaKmOleo > 0 && <span>🛣 Atual: <b className="text-foreground">{(v.hodometroAtual||0).toLocaleString('pt-BR')} km</b></span>}
                          {v.metaKmOleo > 0 && <span>⚙ Restam: <b className={c.text}>{st.kmRestante.toLocaleString('pt-BR')} km</b></span>}
                          {v.dataProximaTroca && (
                            <span>📅 Próxima: <b className={st.diasRestantes !== null && st.diasRestantes <= 7 ? 'text-destructive' : 'text-foreground'}>
                              {new Date(v.dataProximaTroca).toLocaleDateString('pt-BR')}
                              {st.diasRestantes !== null && ` (${st.diasRestantes > 0 ? `em ${st.diasRestantes}d` : 'VENCIDO'})`}
                            </b></span>
                          )}
                          {v.dataUltimaTroca && <span>🔧 Última: <b className="text-foreground">{new Date(v.dataUltimaTroca).toLocaleDateString('pt-BR')}</b></span>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic">Configure a meta em ⚙️ Meta para ver o status.</div>
                    )}

                    <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                      {v.metaKmOleo > 0 && <span>Meta: <b className="text-foreground">{v.metaKmOleo.toLocaleString('pt-BR')} km/troca</b></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {tab === 'historico' && (
          <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar..." count={filteredTrocas.length + ' registro(s)'}>
            <thead>
              <tr><Th>Data</Th><Th>Veículo</Th><Th>Hodômetro</Th><Th>Litros</Th><Th>R$/L</Th><Th>Total</Th><Th>Motorista</Th><Th>Ações</Th></tr>
            </thead>
            <tbody>
              {filteredTrocas.map(t => (
                <tr key={t.id} className="hover:bg-gold-glow transition-colors">
                  <Td>{t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '—'}</Td>
                  <Td><b>{t.veiculoPlaca}</b><br /><span className="text-[10px] text-muted-foreground">{t.veiculoModelo}</span></Td>
                  <Td>{(t.hodometro||0).toLocaleString('pt-BR')} km</Td>
                  <Td>{(t.litros||0).toFixed(2)} L</Td>
                  <Td>R$ {(t.valorLitro||0).toFixed(2)}</Td>
                  <Td><b className="text-primary">R$ {(t.valorTotal||0).toFixed(2)}</b></Td>
                  <Td>{t.motorista || '—'}</Td>
                  <Td><Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(t.id)}>🗑</Btn></Td>
                </tr>
              ))}
              {!filteredTrocas.length && (
                <tr><td colSpan={8} className="text-center text-muted-foreground p-5 text-[12px]">Nenhum registro</td></tr>
              )}
            </tbody>
          </TableWrapper>
        )}
      </div>

      {/* Modais */}
      {trocaOpen && (
        <TrocaOleoModal veiculoId={trocaVeiculoId} veiculos={veiculos} onClose={closeTroca} session={session!} />
      )}
      {metaOpen && metaVeiculoId !== null && (
        <MetaOleoModal veiculoId={metaVeiculoId} onClose={closeMeta} />
      )}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Registro"
        message="Este registro de troca de óleo será removido do histórico."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { deleteTroca(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

// ── Modal: Registrar Troca ────────────────────────────────────────────────────

function TrocaOleoModal({ veiculoId, veiculos, onClose, session }: {
  veiculoId: number | null; veiculos: Veiculo[];
  onClose: () => void; session: { name: string; user: string };
}) {
  const [vId, setVId]               = useState(veiculoId !== null ? String(veiculoId) : (veiculos[0]?.id ? String(veiculos[0].id) : ''));
  const [hodometro, setHodometro]   = useState('');
  const [litros, setLitros]         = useState('');
  const [valorLitro, setValorLitro] = useState('');
  const [motorista, setMotorista]   = useState('');
  const [data, setData]             = useState(new Date().toISOString().slice(0, 10));
  const [dataProxima, setDataProxima] = useState('');
  const [obs, setObs]               = useState('');

  const veiculo = veiculos.find(v => v.id === Number(vId));
  const total   = (Number(litros) || 0) * (Number(valorLitro) || 0);

  const save = () => {
    if (!vId)       { alert('Selecione o veículo!'); return; }
    if (!hodometro) { alert('Informe o hodômetro!'); return; }
    if (!litros)    { alert('Informe a quantidade de litros!'); return; }
    if (!valorLitro){ alert('Informe o valor por litro!'); return; }

    const troca: TrocaOleo = {
      id: nextId('trocas_oleo'),
      veiculoId: Number(vId), veiculoPlaca: veiculo?.placa || '', veiculoModelo: veiculo?.modelo || '',
      hodometro: Number(hodometro), litros: Number(litros), valorLitro: Number(valorLitro),
      valorTotal: total, motorista, obs, data,
      cadastrado: new Date().toLocaleString('pt-BR'),
    };

    const list = DB.get<TrocaOleo>('trocas_oleo');
    list.push(troca);
    DB.set('trocas_oleo', list);

    // Atualiza hodômetro e datas no veículo
    const veiculosList = DB.get<Veiculo>('veiculos');
    const idx = veiculosList.findIndex(v => v.id === Number(vId));
    if (idx >= 0) {
      veiculosList[idx] = {
        ...veiculosList[idx],
        hodometroAtual:      Math.max(veiculosList[idx].hodometroAtual || 0, Number(hodometro)),
        hodometroUltimaTroca: Number(hodometro),
        dataUltimaTroca:     data,
        dataProximaTroca:    dataProxima || veiculosList[idx].dataProximaTroca || '',
      };
      DB.set('veiculos', veiculosList);
    }
    syncEstoqueGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="🛢️ Registrar Troca de Óleo" maxWidth="560px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <div className="space-y-4">
        <FormCard title="Veículo e Data">
          <Field label="Veículo" required>
            <Select value={vId} onChange={e => setVId(e.target.value)}>
              <option value="">— Selecione —</option>
              {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
            </Select>
          </Field>
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Data da Troca" required className="flex-1 min-w-[120px]">
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </Field>
            <Field label="Data Prevista Próxima Troca" className="flex-1 min-w-[150px]">
              <Input type="date" value={dataProxima} onChange={e => setDataProxima(e.target.value)} />
            </Field>
          </div>
        </FormCard>
        <FormCard title="Dados do Óleo">
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Hodômetro Atual (km)" required className="flex-[2] min-w-[120px]">
              <Input type="number" value={hodometro} onChange={e => setHodometro(e.target.value)}
                placeholder={veiculo ? String(veiculo.hodometroAtual || '') : ''} />
            </Field>
            <Field label="Motorista" className="flex-[3] min-w-[140px]">
              <Input value={motorista} onChange={e => setMotorista(e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Field label="Litros" required className="flex-1 min-w-[80px]">
              <Input type="number" step="0.1" value={litros} onChange={e => setLitros(e.target.value)} placeholder="ex: 4.5" />
            </Field>
            <Field label="R$ / Litro" required className="flex-1 min-w-[80px]">
              <Input type="number" step="0.01" value={valorLitro} onChange={e => setValorLitro(e.target.value)} placeholder="ex: 38.90" />
            </Field>
            <Field label="Total" className="flex-1 min-w-[80px]">
              <div className="h-[38px] flex items-center px-3 bg-primary/10 border border-primary/30 rounded-xl text-[13px] font-bold text-primary">
                R$ {total.toFixed(2)}
              </div>
            </Field>
          </div>
          <Field label="Observações">
            <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Tipo de óleo, marca..." />
          </Field>
        </FormCard>
        {veiculo && (
          <div className="bg-secondary rounded-xl p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">📊 Status atual do veículo</div>
            <div>Hodômetro: <b className="text-foreground">{(veiculo.hodometroAtual||0).toLocaleString('pt-BR')} km</b></div>
            {veiculo.dataUltimaTroca && <div>Última troca: <b className="text-foreground">{new Date(veiculo.dataUltimaTroca).toLocaleDateString('pt-BR')}</b></div>}
            {veiculo.metaKmOleo > 0 && <div>Meta: <b className="text-foreground">{veiculo.metaKmOleo.toLocaleString('pt-BR')} km/troca</b></div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Modal: Configurar Meta ───────────────────────────────────────────────────

function MetaOleoModal({ veiculoId, onClose }: { veiculoId: number; onClose: () => void }) {
  const veiculos  = DB.get<Veiculo>('veiculos');
  const v = veiculos.find(x => x.id === veiculoId);

  const [metaKm,          setMetaKm]          = useState(String(v?.metaKmOleo || ''));
  const [hodAtual,        setHodAtual]         = useState(String(v?.hodometroAtual || ''));
  const [hodUltimaTroca,  setHodUltimaTroca]   = useState(String(v?.hodometroUltimaTroca || ''));
  const [dataUltimaTroca, setDataUltimaTroca]  = useState(v?.dataUltimaTroca || '');
  const [dataProxima,     setDataProxima]      = useState(v?.dataProximaTroca || '');

  const save = () => {
    const list = DB.get<Veiculo>('veiculos');
    const idx  = list.findIndex(x => x.id === veiculoId);
    if (idx < 0) { onClose(); return; }
    list[idx] = {
      ...list[idx],
      metaKmOleo:           Number(metaKm)         || 0,
      hodometroAtual:       Number(hodAtual)        || list[idx].hodometroAtual       || 0,
      hodometroUltimaTroca: Number(hodUltimaTroca)  || list[idx].hodometroUltimaTroca || 0,
      dataUltimaTroca, dataProximaTroca: dataProxima,
    };
    DB.set('veiculos', list);
    syncEstoqueGS(true);
    onClose();
  };

  if (!v) return null;

  return (
    <Modal open onClose={onClose} title={`⚙️ Meta de Óleo — ${v.placa}`} maxWidth="440px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <div className="space-y-3">
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-[11px] text-muted-foreground">
          <b className="text-primary">💡 Dica:</b> Configure a meta de km (ex: 1.000 para moto, 5.000 para carro) e/ou a data prevista. A barra de status usa o critério mais próximo da troca.
        </div>
        <Field label="Meta de km para troca de óleo">
          <Input type="number" value={metaKm} onChange={e => setMetaKm(e.target.value)} placeholder="Ex: 1000 moto / 5000 carro" />
        </Field>
        <Field label="Hodômetro atual (km)">
          <Input type="number" value={hodAtual} onChange={e => setHodAtual(e.target.value)} />
        </Field>
        <Field label="Hodômetro na última troca (km)">
          <Input type="number" value={hodUltimaTroca} onChange={e => setHodUltimaTroca(e.target.value)} />
        </Field>
        <Field label="Data da última troca">
          <Input type="date" value={dataUltimaTroca} onChange={e => setDataUltimaTroca(e.target.value)} />
        </Field>
        <Field label="Data prevista próxima troca">
          <Input type="date" value={dataProxima} onChange={e => setDataProxima(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
