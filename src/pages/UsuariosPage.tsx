import { useState } from 'react';
import { DB, nextId, hashPassword, isPasswordHash, syncGS, loadFromGS, type Usuario, logAcesso } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, ConfirmModal } from '@/components/ui-custom';

const CARGOS_PREDEFINIDOS = ['Operador', 'Estoquista', 'Administrador'];

export default function UsuariosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const isMaster = session?.nivel === 'Master';

  const list = DB.get<Usuario>('users').filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const del = (id: number) => {
    DB.set('users', DB.get<Usuario>('users').filter(x => x.id !== id));
    logAcesso('Excluiu usuário ID ' + id, session!.name, session!.user);
    syncGS(true);
    refresh();
  };

  return (
    <>
      <PageHeader title="Usuários do Sistema" icon="👥">
        <Btn variant="outline" onClick={() => syncGS()}>📤 Enviar para Planilha</Btn>
        <Btn variant="outline" onClick={() => loadFromGS()}>📥 Carregar da Planilha</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Usuário</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-secondary border border-border rounded-xl px-4 py-2.5 mb-4 text-[10px] text-muted-foreground">
          ℹ️ O <b className="text-foreground">Cargo</b> é apenas informativo e não controla permissões.
          O acesso a cada módulo é gerenciado em <b className="text-primary">Configurações → Permissões</b>.
          Por padrão, todo usuário tem acesso a todos os módulos.
        </div>
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar usuário..." count={list.length + ' usuário(s)'}>
          <thead><tr><Th>ID</Th><Th>Foto</Th><Th>Nome</Th><Th>E-mail</Th><Th>Cargo</Th><Th>Cadastrado</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="hover:bg-gold-glow transition-colors">
                <Td><Badge>{u.id}</Badge></Td>
                <Td>
                  <div className="w-7 h-7 rounded-full bg-gold-deep flex items-center justify-center text-[10px] font-bold text-primary-foreground overflow-hidden">
                    {u.foto ? <img src={u.foto} className="w-full h-full object-cover" alt="" /> : u.nome?.[0]?.toUpperCase()}
                  </div>
                </Td>
                <Td className="font-bold">{u.nome}</Td>
                <Td>{u.email}</Td>
                <Td><Badge variant="info">{u.nivel}</Badge></Td>
                <Td>{u.cadastrado || '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(u.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(u.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="text-center text-muted-foreground p-5">Nenhum usuário</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <UserModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} session={session!} isMaster={isMaster} />}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Usuário"
        message="Este usuário será removido do sistema e da planilha Google. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { del(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

function UserModal({ editId, onClose, session, isMaster }: {
  editId: number | null; onClose: () => void;
  session: { name: string; user: string }; isMaster: boolean;
}) {
  const existing = editId ? DB.get<Usuario>('users').find(x => x.id === editId) : null;
  const [nome, setNome] = useState(existing?.nome || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [senha, setSenha] = useState(existing?.senha || '');
  const [foto, setFoto] = useState(existing?.foto || '');

  // Cargo logic
  const existingNivel = existing?.nivel || 'Operador';
  const isCustom = !CARGOS_PREDEFINIDOS.includes(existingNivel) && existingNivel !== 'Master';
  const [cargoSelecionado, setCargoSelecionado] = useState(isCustom ? '__custom__' : existingNivel);
  const [cargoCustom, setCargoCustom] = useState(isCustom ? existingNivel : '');

  const cargoFinal = cargoSelecionado === '__custom__' ? cargoCustom.trim() : cargoSelecionado;

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert('Imagem muito grande! Máximo 500KB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setFoto(ev.target?.result as string);
    reader.onerror = () => alert('Erro ao ler o arquivo de imagem.');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      alert('Nome, e-mail e senha são obrigatórios!'); return;
    }
    if (!cargoFinal) { alert('Informe o cargo!'); return; }
    const list = DB.get<Usuario>('users');
    if (!editId && list.find(x => x.email.toLowerCase() === email.toLowerCase())) {
      alert('E-mail já cadastrado!'); return;
    }
    const senhaToStore = isPasswordHash(senha) ? senha : await hashPassword(senha);
    const obj: Usuario = {
      id: editId || nextId('users'), nome: nome.trim(), email: email.trim(),
      senha: senhaToStore, nivel: cargoFinal, foto,
      cadastrado: existing?.cadastrado || new Date().toLocaleString('pt-BR'),
    };
    if (editId) {
      const i = list.findIndex(x => x.id === editId);
      if (i >= 0) list[i] = obj; else list.push(obj);
    } else {
      list.push(obj);
    }
    DB.set('users', list);
    logAcesso((editId ? 'Editou' : 'Cadastrou') + ' usuário: ' + email, session.name, session.user);
    syncGS(true);
    onClose();
  };

  const cargos = [...CARGOS_PREDEFINIDOS, ...(isMaster ? ['Master'] : [])];

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Usuário' : '👥 Novo Usuário'} maxWidth="540px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados do Usuário">
        <div className="flex gap-4 items-start mb-3">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="w-16 h-16 rounded-full bg-gold-deep flex items-center justify-center text-xl font-bold text-primary-foreground overflow-hidden border-2 border-primary">
              {foto ? <img src={foto} className="w-full h-full object-cover" alt="" /> : nome?.[0]?.toUpperCase() || '?'}
            </div>
            <label className="text-[9px] text-primary cursor-pointer hover:underline">
              📷 Alterar foto
              <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            </label>
          </div>
          {/* Fields */}
          <div className="flex-1 space-y-2.5">
            <Field label="Nome Completo" required className="w-full">
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            </Field>
            <div className="flex gap-2.5 flex-wrap">
              <Field label="E-mail (login)" required className="flex-[2] min-w-[160px]">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
              <Field label="Senha" required className="flex-[1] min-w-[120px]">
                <Input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-secondary rounded-xl p-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
            Cargo <span className="font-normal text-muted-foreground/60">(apenas informativo — não afeta permissões)</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {cargos.map(c => (
              <button key={c} onClick={() => setCargoSelecionado(c)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all
                  ${cargoSelecionado === c
                    ? c === 'Master' ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                {c}
              </button>
            ))}
            <button onClick={() => setCargoSelecionado('__custom__')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all
                ${cargoSelecionado === '__custom__' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
              ✏️ Outro cargo
            </button>
          </div>
          {cargoSelecionado === '__custom__' && (
            <Input
              value={cargoCustom}
              onChange={e => setCargoCustom(e.target.value)}
              placeholder="Ex: Supervisor, Técnico, Motorista, Gerente..."
              className="mt-1"
            />
          )}
          <p className="text-[9px] text-muted-foreground/70 mt-2">
            Para controlar o acesso deste usuário, acesse <b>Configurações → Permissões por Usuário</b>.
          </p>
        </div>
      </FormCard>
    </Modal>
  );
}
