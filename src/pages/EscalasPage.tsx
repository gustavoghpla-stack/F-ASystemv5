import { useState } from 'react';
import { DB, nextId, syncGS, type Escala } from '@/lib/db';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, ConfirmModal } from '@/components/ui-custom';

export default function EscalasPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const list = DB.get<Escala>('escalas').filter(e => !search || e.desc?.toLowerCase().includes(search.toLowerCase()));

  const del = (id: number) => {
    DB.set('escalas', DB.get<Escala>('escalas').filter(x => x.id !== id));
    syncGS(true);
    refresh();
  };

  return (
    <>
      <PageHeader title="Escalas de Serviço" icon="📅">
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Nova Escala</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar escala..." count={list.length + ' escala(s)'}>
          <thead><tr><Th>ID</Th><Th>Descrição da Escala</Th><Th>Cadastrado em</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id} className="hover:bg-gold-glow transition-colors">
                <Td><Badge>{e.id}</Badge></Td>
                <Td>{e.desc}</Td>
                <Td>{e.cadastrado || '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(e.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(e.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="text-center text-muted-foreground p-5">Nenhuma escala</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <EscalaModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Escala"
        message="Esta escala será removida do sistema e da planilha."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

function EscalaModal({ editId, onClose }: { editId: number | null; onClose: () => void }) {
  const existing = editId ? DB.get<Escala>('escalas').find(x => x.id === editId) : null;
  const [desc, setDesc] = useState(existing?.desc || '');

  const save = () => {
    if (!desc.trim()) { alert('Descrição obrigatória!'); return; }
    const list = DB.get<Escala>('escalas');
    const obj: Escala = { id: editId || nextId('escalas'), desc: desc.trim(), cadastrado: new Date().toLocaleString('pt-BR') };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('escalas', list);
    syncGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Escala' : '📅 Nova Escala'} maxWidth="500px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados da Escala">
        <Field label="Descrição da Escala" required className="w-full">
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: SEG/SEX 07:00–17:00 | SAB 07:00–12:00" />
        </Field>
      </FormCard>
    </Modal>
  );
}
