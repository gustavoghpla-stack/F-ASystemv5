import { useState } from 'react';
import { DB, nextId, syncGS, isDemitido, type BancoRegistro, type Funcionario, logAcesso } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select, ConfirmModal } from '@/components/ui-custom';

export default function BancosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const funcs = DB.get<Funcionario>('func');
  const demitidosIds = new Set(funcs.filter(isDemitido).map(f => f.id));

  const list = DB.get<BancoRegistro>('bancos').filter(b => {
    if (demitidosIds.has(b.funcId)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.funcNome?.toLowerCase().includes(q) || b.banco?.toLowerCase().includes(q) || b.chavepix?.toLowerCase().includes(q);
  });

  const del = (id: number) => {
    DB.set('bancos', DB.get<BancoRegistro>('bancos').filter(x => x.id !== id));
    logAcesso('Excluiu banco/PIX ID ' + id, session!.name, session!.user);
    syncGS(true);
    refresh();
  };

  return (
    <>
      <PageHeader title="Bancos / PIX por Funcionário" icon="🏦">
        <Btn variant="outline" onClick={() => syncGS()}>📤 Sincronizar Agora</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Registro</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar..." count={list.length + ' registro(s)'}>
          <thead><tr><Th>Funcionário</Th><Th>Banco</Th><Th>Agência</Th><Th>Conta</Th><Th>Tipo</Th><Th>Chave PIX</Th><Th>Tipo PIX</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(b => (
              <tr key={b.id} className="hover:bg-gold-glow transition-colors">
                <Td className="font-bold">{b.funcNome || '—'}</Td>
                <Td>{b.banco}</Td><Td>{b.agencia || '—'}</Td><Td>{b.conta || '—'}</Td>
                <Td><Badge variant="info">{b.tipo || '—'}</Badge></Td>
                <Td className="font-bold text-primary">{b.chavepix}</Td>
                <Td><Badge>{b.tipopix || '—'}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(b.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(b.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="text-center text-muted-foreground p-5">Nenhum registro</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <BancoModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Banco/PIX"
        message="Este registro bancário será removido do sistema e da planilha Google."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

function BancoModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<BancoRegistro>('bancos').find(x => x.id === editId) : null;
  const funcs = DB.get<Funcionario>('func').filter(f => !isDemitido(f)).sort((a, b) => a.nome.localeCompare(b.nome));

  const [funcId, setFuncId] = useState(String(existing?.funcId || ''));
  const [banco, setBanco] = useState(existing?.banco || '');
  const [codigo, setCodigo] = useState(existing?.codigo || '');
  const [agencia, setAgencia] = useState(existing?.agencia || '');
  const [conta, setConta] = useState(existing?.conta || '');
  const [tipo, setTipo] = useState(existing?.tipo || '');
  const [tipopix, setTipopix] = useState(existing?.tipopix || '');
  const [chavepix, setChavepix] = useState(existing?.chavepix || '');
  const [obs, setObs] = useState(existing?.obs || '');

  const save = () => {
    if (!funcId) { alert('Selecione o funcionário!'); return; }
    if (!banco) { alert('Banco é obrigatório!'); return; }
    if (!agencia || !conta) { alert('Agência e conta são obrigatórias!'); return; }
    if (!chavepix) { alert('Chave PIX é obrigatória!'); return; }

    const list = DB.get<BancoRegistro>('bancos');
    const funcIdNum = parseInt(funcId, 10);
    if (isNaN(funcIdNum)) { alert('Funcionário inválido!'); return; }
    const allFuncs = DB.get<Funcionario>('func');
    const func = allFuncs.find(f => f.id === funcIdNum);
    const obj: BancoRegistro = {
      id: editId || nextId('bancos'), funcId: funcIdNum, funcNome: func?.nome || '',
      banco, codigo, agencia, conta, tipo, tipopix, chavepix, obs,
      cadastrado: existing?.cadastrado || new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('bancos', list);
    logAcesso((editId ? 'Editou' : 'Cadastrou') + ' banco: ' + banco, session.name, session.user);
    syncGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Banco/PIX' : '🏦 Novo Registro'} maxWidth="640px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Vínculo com Funcionário">
        <Field label="Funcionário" required className="w-full">
          <Select value={funcId} onChange={e => setFuncId(e.target.value)}>
            <option value="">— Selecione —</option>
            {funcs.map(f => <option key={f.id} value={f.id}>{f.nome}{f.cpf ? ` (${f.cpf})` : ''}</option>)}
          </Select>
        </Field>
      </FormCard>
      <FormCard title="Dados do Banco" icon="🏦">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Banco" required className="flex-[3] min-w-[140px]"><Input value={banco} onChange={e => setBanco(e.target.value)} /></Field>
          <Field label="Código" className="flex-1 min-w-[70px]"><Input value={codigo} onChange={e => setCodigo(e.target.value)} /></Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Agência" required className="flex-[2] min-w-[100px]"><Input value={agencia} onChange={e => setAgencia(e.target.value)} /></Field>
          <Field label="Conta" required className="flex-[3] min-w-[140px]"><Input value={conta} onChange={e => setConta(e.target.value)} /></Field>
          <Field label="Tipo" className="flex-[2] min-w-[100px]">
            <Select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">—</option>{['Corrente','Poupança','Salário','Pagamento'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Tipo Chave PIX" className="flex-[2] min-w-[100px]">
            <Select value={tipopix} onChange={e => setTipopix(e.target.value)}>
              <option value="">—</option>{['CPF','E-mail','Celular','CNPJ','Aleatória (EVP)'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Chave PIX" required className="flex-[3] min-w-[140px]"><Input value={chavepix} onChange={e => setChavepix(e.target.value)} /></Field>
        </div>
        <Field label="Observações" className="w-full"><Input value={obs} onChange={e => setObs(e.target.value)} /></Field>
      </FormCard>
    </Modal>
  );
}
