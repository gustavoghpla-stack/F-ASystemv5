import { useState, useEffect } from 'react';
import { DB, nextId, type EstoqueItem, type EstoqueMovimento, syncEstoqueGS , onSyncComplete } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select , ConfirmModal } from '@/components/ui-custom';

function StatusBar({ current, min }: { current: number; min: number }) {
  const pct = min > 0 ? Math.min((current / (min * 3)) * 100, 100) : (current > 0 ? 100 : 0);
  const color = current <= 0 ? 'bg-destructive' : current <= min ? 'bg-yellow-500' : 'bg-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: pct + '%' }} />
      </div>
      <span className="text-[10px] font-bold whitespace-nowrap">{current}</span>
    </div>
  );
}

export default function EstoquePage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [movItemId, setMovItemId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  useEffect(() => onSyncComplete(refresh), []);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const list = DB.get<EstoqueItem>('estoque').filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.nome?.toLowerCase().includes(q) || e.categoria?.toLowerCase().includes(q);
  });

  const totalItens = list.length;
  const baixoEstoque = list.filter(e => e.qtdAtual <= e.qtdMinima && e.qtdAtual > 0).length;
  const semEstoque = list.filter(e => e.qtdAtual <= 0).length;

  const del = (id: number) => {
        DB.set('estoque', DB.get<EstoqueItem>('estoque').filter(x => x.id !== id));
    logAcesso('Excluiu item estoque ID ' + id, session!.name, session!.user);
    refresh();
  };

  return (
    <>
      <PageHeader title="Controle de Estoque" icon="📦">
        <Btn variant="outline" onClick={() => syncEstoqueGS()}>📤 Sincronizar</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Item</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
          <StatCard value={totalItens} label="Total de Itens" />
          <StatCard value={baixoEstoque} label="Estoque Baixo" color="text-yellow-500" />
          <StatCard value={semEstoque} label="Sem Estoque" color="text-destructive" />
        </div>

        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar item..." count={list.length + ' item(ns)'}>
          <thead><tr><Th>ID</Th><Th>Item</Th><Th>Categoria</Th><Th>Unidade</Th><Th>Estoque</Th><Th>Mín.</Th><Th>Status</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id} className="hover:bg-gold-glow transition-colors">
                <Td><Badge>{e.id}</Badge></Td>
                <Td className="font-bold">{e.nome}</Td>
                <Td>{e.categoria || '—'}</Td>
                <Td>{e.unidade || '—'}</Td>
                <Td className="font-bold">{e.qtdAtual}</Td>
                <Td>{e.qtdMinima}</Td>
                <Td className="min-w-[120px]"><StatusBar current={e.qtdAtual} min={e.qtdMinima} /></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="success" onClick={() => { setMovItemId(e.id); setMovModalOpen(true); }}>📥</Btn>
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(e.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(e.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="text-center text-muted-foreground p-5">Nenhum item no estoque</td></tr>}
          </tbody>
        </TableWrapper>

        {/* Últimos movimentos */}
        <div className="mt-5">
          <h3 className="font-heading text-sm font-bold text-primary mb-2">📋 Últimas Movimentações</h3>
          <MovimentosTable />
        </div>
      </div>
      {modalOpen && <ItemModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} />}
      {movModalOpen && movItemId && <MovimentoModal itemId={movItemId} onClose={() => { setMovModalOpen(false); refresh(); }} session={session!} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Item de Estoque"
        message="Este item será removido do estoque e da planilha."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}