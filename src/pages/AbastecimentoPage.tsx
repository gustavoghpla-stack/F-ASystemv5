import { useState } from 'react';
import { DB, nextId, fmtMoney, type Veiculo, type Abastecimento, syncEstoqueGS } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select } from '@/components/ui-custom';

export default function AbastecimentoPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'veiculos' | 'abastecimentos'>('veiculos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [abastModalOpen, setAbastModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  void tick;

  return (
    <>
      <PageHeader title="Controle de Abastecimento" icon="⛽">
        <Btn variant="outline" onClick={() => syncEstoqueGS()}>📤 Sincronizar</Btn>
        {tab === 'veiculos'
          ? <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Veículo</Btn>
          : <Btn onClick={() => { setEditId(null); setAbastModalOpen(true); }}>➕ Novo Abastecimento</Btn>
        }
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex gap-2 mb-4">
          <Btn variant={tab === 'veiculos' ? 'gold' : 'outline'} onClick={() => { setTab('veiculos'); setSearch(''); }}>🚗 Veículos</Btn>
          <Btn variant={tab === 'abastecimentos' ? 'gold' : 'outline'} onClick={() => { setTab('abastecimentos'); setSearch(''); }}>⛽ Abastecimentos</Btn>
        </div>

        {tab === 'veiculos'
          ? <VeiculosTab search={search} setSearch={setSearch} onEdit={(id) => { setEditId(id); setModalOpen(true); }} onRefresh={refresh} session={session!} />
          : <AbastecimentosTab search={search} setSearch={setSearch} onEdit={(id) => { setEditId(id); setAbastModalOpen(true); }} onRefresh={refresh} session={session!} />
        }
      </div>
      {modalOpen && <VeiculoModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} />}
      {abastModalOpen && <AbastecimentoModal editId={editId} onClose={() => { setAbastModalOpen(false); refresh(); }} session={session!} />}
    </>
  );
}

function VeiculosTab({ search, setSearch, onEdit, onRefresh, session }: any) {
  const list = DB.get<Veiculo>('veiculos').filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.placa?.toLowerCase().includes(q) || v.modelo?.toLowerCase().includes(q);
  });

  const del = (id: number) => {
    if (!confirm('Excluir este veículo?')) return;
    DB.set('veiculos', DB.get<Veiculo>('veiculos').filter(x => x.id !== id));
    logAcesso('Excluiu veículo ID ' + id, session.name, session.user);
    onRefresh();
  };

  return (
    <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar veículo..." count={list.length + ' veículo(s)'}>
      <thead><tr><Th>ID</Th><Th>Placa</Th><Th>Modelo</Th><Th>Ano</Th><Th>Cor</Th><Th>Combustível</Th><Th>Hodômetro</Th><Th>Ações</Th></tr></thead>
      <tbody>
        {list.map(v => (
          <tr key={v.id} className="hover:bg-gold-glow transition-colors">
            <Td><Badge>{v.id}</Badge></Td>
            <Td className="font-bold text-primary">{v.placa}</Td>
            <Td>{v.modelo}</Td>
            <Td>{v.ano || '—'}</Td>
            <Td>{v.cor || '—'}</Td>
            <Td><Badge variant="info">{v.combustivel || '—'}</Badge></Td>
            <Td className="font-bold">{v.hodometroAtual ? v.hodometroAtual.toLocaleString() + ' km' : '—'}</Td>
            <Td>
              <div className="flex gap-1">
                <Btn size="sm" variant="outline" onClick={() => onEdit(v.id)}>✏️</Btn>
                <Btn size="sm" variant="danger" onClick={() => del(v.id)}>🗑</Btn>
              </div>
            </Td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={8} className="text-center text-muted-foreground p-5">Nenhum veículo</td></tr>}
      </tbody>
    </TableWrapper>
  );
}

function AbastecimentosTab({ search, setSearch, onEdit, onRefresh, session }: any) {
  const list = DB.get<Abastecimento>('abastecimentos').filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.veiculoPlaca?.toLowerCase().includes(q) || a.motorista?.toLowerCase().includes(q) || a.posto?.toLowerCase().includes(q);
  });

  const totalGasto = list.reduce((s, a) => s + (a.valorTotal || 0), 0);
  const totalLitros = list.reduce((s, a) => s + (a.litros || 0), 0);

  const del = (id: number) => {
    if (!confirm('Excluir este registro?')) return;
    DB.set('abastecimentos', DB.get<Abastecimento>('abastecimentos').filter(x => x.id !== id));
    logAcesso('Excluiu abastecimento ID ' + id, session.name, session.user);
    onRefresh();
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
        <StatCard value={list.length} label="Total Registros" />
        <StatCard value={totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' L'} label="Total Litros" />
        <StatCard value={'R$ ' + fmtMoney(totalGasto)} label="Total Gasto" color="text-destructive" />
      </div>
      <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar..." count={list.length + ' registro(s)'}>
        <thead><tr><Th>Data</Th><Th>Hora</Th><Th>Veículo</Th><Th>Hodômetro</Th><Th>Litros</Th><Th>R$/L</Th><Th>Total</Th><Th>Combustível</Th><Th>Posto</Th><Th>Motorista</Th><Th>Ações</Th></tr></thead>
        <tbody>
          {list.map(a => (
            <tr key={a.id} className="hover:bg-gold-glow transition-colors">
              <Td>{a.data}</Td>
              <Td>{a.horario || '—'}</Td>
              <Td className="font-bold">{a.veiculoPlaca} <span className="text-muted-foreground text-[10px]">{a.veiculoModelo}</span></Td>
              <Td className="font-bold">{a.hodometro ? a.hodometro.toLocaleString() + ' km' : '—'}</Td>
              <Td>{a.litros}</Td>
              <Td>{a.valorLitro ? 'R$ ' + fmtMoney(a.valorLitro) : '—'}</Td>
              <Td className="font-bold text-primary">R$ {fmtMoney(a.valorTotal)}</Td>
              <Td><Badge variant="info">{a.combustivel}</Badge></Td>
              <Td>{a.posto || '—'}</Td>
              <Td>{a.motorista || '—'}</Td>
              <Td>
                <div className="flex gap-1">
                  <Btn size="sm" variant="outline" onClick={() => onEdit(a.id)}>✏️</Btn>
                  <Btn size="sm" variant="danger" onClick={() => del(a.id)}>🗑</Btn>
                </div>
              </Td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={11} className="text-center text-muted-foreground p-5">Nenhum abastecimento</td></tr>}
        </tbody>
      </TableWrapper>
    </>
  );
}

function VeiculoModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<Veiculo>('veiculos').find(x => x.id === editId) : null;
  const [placa, setPlaca] = useState(existing?.placa || '');
  const [modelo, setModelo] = useState(existing?.modelo || '');
  const [ano, setAno] = useState(existing?.ano || '');
  const [cor, setCor] = useState(existing?.cor || '');
  const [combustivel, setCombustivel] = useState(existing?.combustivel || 'Flex');
  const [hodometro, setHodometro] = useState(String(existing?.hodometroAtual ?? ''));

  const save = () => {
    if (!placa.trim() || !modelo.trim()) { alert('Placa e modelo são obrigatórios!'); return; }
    const list = DB.get<Veiculo>('veiculos');
    const obj: Veiculo = {
      id: editId || nextId('veiculos'), placa: placa.trim().toUpperCase(), modelo: modelo.trim(),
      ano, cor, combustivel, hodometroAtual: Number(hodometro) || 0,
      cadastrado: new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('veiculos', list);
    logAcesso('Salvou veículo: ' + placa, session.name, session.user);
    syncEstoqueGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Veículo' : '🚗 Novo Veículo'} maxWidth="560px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados do Veículo">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Placa" required className="flex-1 min-w-[100px]"><Input value={placa} onChange={e => setPlaca(e.target.value)} placeholder="ABC-1234" /></Field>
          <Field label="Modelo" required className="flex-[2] min-w-[150px]"><Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ex: Fiat Uno" /></Field>
          <Field label="Ano" className="flex-1 min-w-[70px]"><Input value={ano} onChange={e => setAno(e.target.value)} placeholder="2023" /></Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Cor" className="flex-1 min-w-[80px]"><Input value={cor} onChange={e => setCor(e.target.value)} /></Field>
          <Field label="Combustível" className="flex-1 min-w-[100px]">
            <Select value={combustivel} onChange={e => setCombustivel(e.target.value)}>
              {['Flex','Gasolina','Etanol','Diesel','GNV'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Hodômetro (km)" className="flex-1 min-w-[100px]"><Input type="number" value={hodometro} onChange={e => setHodometro(e.target.value)} /></Field>
        </div>
      </FormCard>
    </Modal>
  );
}

function AbastecimentoModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<Abastecimento>('abastecimentos').find(x => x.id === editId) : null;
  // Always read fresh from DB so newly registered vehicles appear immediately
  const veiculos = DB.get<Veiculo>('veiculos');

  const [veiculoId, setVeiculoId] = useState(String(existing?.veiculoId || ''));
  const [data, setData] = useState(existing?.data || new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState(existing?.horario || new Date().toTimeString().slice(0, 5));
  const [hodometro, setHodometro] = useState(String(existing?.hodometro ?? ''));
  const [litros, setLitros] = useState(String(existing?.litros ?? ''));
  const [valorLitro, setValorLitro] = useState(String(existing?.valorLitro ?? ''));
  const [combustivel, setCombustivel] = useState(existing?.combustivel || 'Gasolina');
  const [posto, setPosto] = useState(existing?.posto || '');
  const [motorista, setMotorista] = useState(existing?.motorista || session.name);
  const [obs, setObs] = useState(existing?.obs || '');

  const valorTotal = (Number(litros) || 0) * (Number(valorLitro) || 0);

  const save = () => {
    if (!veiculoId) { alert('Selecione o veículo!'); return; }
    if (!litros || Number(litros) <= 0) { alert('Litros é obrigatório!'); return; }

    const veiculo = veiculos.find(v => v.id === parseInt(veiculoId));
    const list = DB.get<Abastecimento>('abastecimentos');
    const obj: Abastecimento = {
      id: editId || nextId('abastecimentos'),
      veiculoId: parseInt(veiculoId), veiculoPlaca: veiculo?.placa || '', veiculoModelo: veiculo?.modelo || '',
      data, horario, hodometro: Number(hodometro) || 0,
      litros: Number(litros), valorLitro: Number(valorLitro) || 0, valorTotal,
      combustivel, posto, motorista, obs,
      cadastrado: new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.unshift(obj);
    DB.set('abastecimentos', list);

    // Update vehicle odometer
    if (Number(hodometro) > 0 && veiculo) {
      const vs = DB.get<Veiculo>('veiculos');
      const vi = vs.findIndex(x => x.id === veiculo.id);
      if (vi >= 0 && Number(hodometro) > vs[vi].hodometroAtual) {
        vs[vi].hodometroAtual = Number(hodometro);
        DB.set('veiculos', vs);
      }
    }

    logAcesso('Abastecimento: ' + veiculo?.placa + ' ' + litros + 'L', session.name, session.user);
    syncEstoqueGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Abastecimento' : '⛽ Novo Abastecimento'} maxWidth="640px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Veículo">
        <Field label="Veículo" required className="w-full">
          <Select value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
            <option value="">— Selecione —</option>
            {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
          </Select>
        </Field>
      </FormCard>
      <FormCard title="Dados do Abastecimento" icon="⛽">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Data" required className="flex-1 min-w-[120px]"><Input type="date" value={data} onChange={e => setData(e.target.value)} /></Field>
          <Field label="Horário" className="flex-1 min-w-[80px]"><Input type="time" value={horario} onChange={e => setHorario(e.target.value)} /></Field>
          <Field label="Hodômetro (km)" className="flex-1 min-w-[100px]"><Input type="number" value={hodometro} onChange={e => setHodometro(e.target.value)} /></Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Litros" required className="flex-1 min-w-[80px]"><Input type="number" step="0.01" value={litros} onChange={e => setLitros(e.target.value)} /></Field>
          <Field label="Valor/Litro (R$)" className="flex-1 min-w-[100px]"><Input type="number" step="0.01" value={valorLitro} onChange={e => setValorLitro(e.target.value)} /></Field>
          <Field label="Total (R$)" className="flex-1 min-w-[100px]">
            <div className="p-[8px_10px] bg-secondary border border-border rounded-md text-[12px] font-bold text-primary">R$ {fmtMoney(valorTotal)}</div>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Combustível" className="flex-1 min-w-[100px]">
            <Select value={combustivel} onChange={e => setCombustivel(e.target.value)}>
              {['Gasolina','Etanol','Diesel','GNV','Gasolina Aditivada'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Posto" className="flex-[2] min-w-[140px]"><Input value={posto} onChange={e => setPosto(e.target.value)} /></Field>
          <Field label="Motorista" className="flex-[2] min-w-[140px]"><Input value={motorista} onChange={e => setMotorista(e.target.value)} /></Field>
        </div>
        <Field label="Observações" className="w-full"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
      </FormCard>
    </Modal>
  );
}
