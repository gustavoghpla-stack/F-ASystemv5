import { useState } from 'react';
import { DB, nextId, type Documento } from '@/lib/db';
import { PageHeader, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select } from '@/components/ui-custom';

function printListaDocumentos(docs: Documento[]) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Popup bloqueado!'); return; }
  const rows = docs.map((d, i) => `<tr><td style="padding:6px 10px;border:1px solid #ccc;text-align:center">${i + 1}</td><td style="padding:6px 10px;border:1px solid #ccc">${d.desc}</td><td style="padding:6px 10px;border:1px solid #ccc;text-align:center"><span style="padding:2px 10px;border-radius:10px;font-size:10px;font-weight:bold;background:${d.obrig === 'Sim' ? '#22c55e' : '#3b82f6'};color:#fff">${d.obrig}</span></td></tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><title>Lista de Documentos</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;padding:20px}.header{text-align:center;border-bottom:3px solid #1a1a1a;padding-bottom:10px;margin-bottom:15px}.header h1{font-size:18px;letter-spacing:2px}.header p{font-size:11px;color:#555;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#1a1a1a;color:#d4a017;padding:8px 10px;text-align:left;font-size:11px}@media print{body{padding:10px}}</style></head><body><div class="header"><h1>F&A HIGIENIZAÇÕES</h1><p>Lista de Documentos para Contratação</p><p style="font-size:10px;margin-top:5px">Emitido em: ${new Date().toLocaleString('pt-BR')}</p></div><table><thead><tr><th>#</th><th>Documento</th><th>Obrigatório</th></tr></thead><tbody>${rows}</tbody></table><script>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  win.document.close();
}

export default function DocumentosPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const list = DB.get<Documento>('docs').filter(d => !search || d.desc?.toLowerCase().includes(search.toLowerCase()));

  const del = (id: number) => {
    if (!confirm('Excluir este documento?')) return;
    DB.set('docs', DB.get<Documento>('docs').filter(x => x.id !== id));
    refresh();
  };

  return (
    <>
      <PageHeader title="Documentos para Contratação" icon="📄">
        <Btn variant="outline" onClick={() => printListaDocumentos(list)}>🖨️ Imprimir Lista</Btn>
        <Btn onClick={() => { setEditId(null); setModalOpen(true); }}>➕ Novo Documento</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar documento..." count={list.length + ' documento(s)'}>
          <thead><tr><Th>#</Th><Th>Documento</Th><Th>Obrigatório</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map((d, i) => (
              <tr key={d.id} className="hover:bg-gold-glow transition-colors">
                <Td>{i + 1}</Td><Td>{d.desc}</Td>
                <Td><Badge variant={d.obrig === 'Sim' ? 'success' : 'info'}>{d.obrig}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => { setEditId(d.id); setModalOpen(true); }}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => del(d.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="text-center text-muted-foreground p-5">Nenhum documento</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
      {modalOpen && <DocModal editId={editId} onClose={() => { setModalOpen(false); refresh(); }} />}
    </>
  );
}

function DocModal({ editId, onClose }: { editId: number | null; onClose: () => void }) {
  const existing = editId ? DB.get<Documento>('docs').find(x => x.id === editId) : null;
  const [desc, setDesc] = useState(existing?.desc || '');
  const [obrig, setObrig] = useState(existing?.obrig || 'Sim');

  const save = () => {
    if (!desc.trim()) { alert('Descrição obrigatória!'); return; }
    const list = DB.get<Documento>('docs');
    const obj: Documento = { id: editId || nextId('docs'), desc: desc.trim(), obrig };
    if (editId) { const i = list.findIndex(x => x.id === editId); if (i >= 0) list[i] = obj; else list.push(obj); }
    else list.push(obj);
    DB.set('docs', list);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={editId ? '✏️ Editar Documento' : '📄 Novo Documento'} maxWidth="520px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar</Btn></>}>
      <FormCard title="Documento para Contratação">
        <Field label="Descrição" required className="w-full mb-2.5">
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Cópia do CPF" />
        </Field>
        <Field label="Obrigatório?" className="w-48">
          <Select value={obrig} onChange={e => setObrig(e.target.value)}><option>Sim</option><option>Não</option></Select>
        </Field>
      </FormCard>
    </Modal>
  );
}
