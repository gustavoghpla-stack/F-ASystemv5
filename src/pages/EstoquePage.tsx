import { useState } from 'react';
import { DB, nextId, type EstoqueItem, type EstoqueMovimento, syncEstoqueGS } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select } from '@/components/ui-custom';

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

  const list = DB.get<EstoqueItem>('estoque').filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.nome?.toLowerCase().includes(q) || e.categoria?.toLowerCase().includes(q);
  });

  const totalItens = list.length;
  const baixoEstoque = list.filter(e => e.qtdAtual <= e.qtdMinima && e.qtdAtual > 0).length;
  const semEstoque = list.filter(e => e.qtdAtual <= 0).length;

  const del = (id: number) => {
    if (!confirm('Excluir este item do estoque?')) return;
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
                    <Btn size="sm" variant="danger" onClick={() => del(e.id)}>🗑</Btn>
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
    </>
  );
}

function MovimentosTable() {
  const movs = DB.get<EstoqueMovimento>('estoque_mov').slice(0, 20);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr><Th>Data</Th><Th>Item</Th><Th>Tipo</Th><Th>Qtd</Th><Th>Motivo</Th><Th>Responsável</Th></tr></thead>
          <tbody>
            {movs.map(m => (
              <tr key={m.id} className="hover:bg-gold-glow transition-colors">
                <Td>{m.data}</Td>
                <Td className="font-bold">{m.itemNome}</Td>
                <Td><Badge variant={m.tipo === 'entrada' ? 'success' : 'danger'}>{m.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}</Badge></Td>
                <Td className="font-bold">{m.qtd}</Td>
                <Td>{m.motivo || '—'}</Td>
                <Td>{m.responsavel}</Td>
              </tr>
            ))}
            {!movs.length && <tr><td colSpan={6} className="text-center text-muted-foreground p-5">Nenhuma movimentação</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<EstoqueItem>('estoque').find(x => x.id === editId) : null;
  const [nome, setNome] = useState(existing?.nome || '');
  const [categoria, setCategoria] = useState(existing?.categoria || '');
  const [unidade, setUnidade] = useState(existing?.unidade || 'un');
  const [qtdAtual, setQtdAtual] = useState(String(existing?.qtdAtual ?? 0));
  const [qtdMinima, setQtdMinima] = useState(String(existing?.qtdMinima ?? 5));
  const [localizacao, setLocalizacao] = useState(existing?.localizacao || '');

  const save = () => {
    if (!nome.trim()) { alert('Nome do item é obrigatório!'); return; }
    const list = DB.get<EstoqueItem>('estoque');
    const obj: EstoqueItem = {
      id: editId || nextId('estoque'), nome: nome.trim(), categoria, unidade,
      qtdAtual: Number(qtdAtual) || 0, qtdMinima: Number(qtdMinima) || 0,
      localizacao, cadastrado: new Date().toLocaleString('pt-BR'),
    };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('estoque', list);
    logAcesso('Salvou item estoque: ' + nome, session.name, session.user);
    syncEstoqueGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Item' : '📦 Novo Item de Estoque'} maxWidth="560px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Dados do Item">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Nome do Item" required className="flex-[4] min-w-[200px]"><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Detergente neutro" /></Field>
          <Field label="Categoria" className="flex-[2] min-w-[120px]">
            <Select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="">—</option>
              {['Limpeza','Químicos','EPI','Ferramentas','Escritório','Descartáveis','Outros'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Unidade" className="flex-1 min-w-[80px]">
            <Select value={unidade} onChange={e => setUnidade(e.target.value)}>
              {['un','kg','L','ml','cx','pct','rolo','par','galão'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Qtd. Atual" className="flex-1 min-w-[80px]"><Input type="number" value={qtdAtual} onChange={e => setQtdAtual(e.target.value)} /></Field>
          <Field label="Qtd. Mínima" className="flex-1 min-w-[80px]"><Input type="number" value={qtdMinima} onChange={e => setQtdMinima(e.target.value)} /></Field>
        </div>
        <Field label="Localização" className="w-full"><Input value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Ex: Almoxarifado A" /></Field>
      </FormCard>
    </Modal>
  );
}

function MovimentoModal({ itemId, onClose, session }: { itemId: number; onClose: () => void; session: { name: string; user: string } }) {
  const item = DB.get<EstoqueItem>('estoque').find(x => x.id === itemId);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');

  const save = () => {
    if (!qtd || Number(qtd) <= 0) { alert('Quantidade deve ser maior que zero!'); return; }
    const q = Number(qtd);
    if (tipo === 'saida' && item && q > item.qtdAtual) { alert('Estoque insuficiente! Disponível: ' + item.qtdAtual); return; }

    // Update item quantity
    const items = DB.get<EstoqueItem>('estoque');
    const idx = items.findIndex(x => x.id === itemId);
    if (idx >= 0) {
      items[idx].qtdAtual = tipo === 'entrada' ? items[idx].qtdAtual + q : items[idx].qtdAtual - q;
      DB.set('estoque', items);
    }

    // Record movement
    const movs = DB.get<EstoqueMovimento>('estoque_mov');
    movs.unshift({
      id: Date.now(), itemId, itemNome: item?.nome || '', tipo, qtd: q,
      motivo, responsavel: session.name,
      data: new Date().toLocaleString('pt-BR'),
      cadastrado: new Date().toLocaleString('pt-BR'),
    });
    if (movs.length > 1000) movs.splice(1000);
    DB.set('estoque_mov', movs);

    logAcesso(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} estoque: ${q}x ${item?.nome}`, session.name, session.user);
    syncEstoqueGS(true);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`📥 Movimentação: ${item?.nome || ''}`} maxWidth="450px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Registrar</Btn></>}>
      <FormCard title="Registrar Movimento">
        <p className="text-[11px] text-muted-foreground mb-3">Estoque atual: <strong className="text-primary">{item?.qtdAtual} {item?.unidade}</strong></p>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Tipo" className="flex-1 min-w-[100px]">
            <Select value={tipo} onChange={e => setTipo(e.target.value as 'entrada' | 'saida')}>
              <option value="entrada">📥 Entrada</option>
              <option value="saida">📤 Saída</option>
            </Select>
          </Field>
          <Field label="Quantidade" required className="flex-1 min-w-[100px]"><Input type="number" min="1" value={qtd} onChange={e => setQtd(e.target.value)} /></Field>
        </div>
        <Field label="Motivo / Observação" className="w-full"><Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Compra mensal, uso no cliente X..." /></Field>
      </FormCard>
    </Modal>
  );
}
