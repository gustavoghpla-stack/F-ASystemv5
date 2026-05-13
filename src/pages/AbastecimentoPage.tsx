import { useState, useEffect } from 'react';
import { DB, nextId, fmtMoney, type Veiculo, type Abastecimento, syncEstoqueGS , onSyncComplete } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select , ConfirmModal } from '@/components/ui-custom';

export default function AbastecimentoPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'veiculos' | 'abastecimentos'>('veiculos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [abastModalOpen, setAbastModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => onSyncComplete(refresh), []);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'veiculo' | 'abastecimento'>('veiculo');
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
      <ConfirmModal
        open={confirmDeleteId !== null}
        title={confirmDeleteType === 'veiculo' ? 'Excluir Veículo' : 'Excluir Abastecimento'}
        message={confirmDeleteType === 'veiculo' ? 'Este veículo e todos seus registros serão removidos.' : 'Este registro de abastecimento será removido.'}
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            if (confirmDeleteType === 'veiculo') delVeiculo(confirmDeleteId);
            else delAbast(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}