import { useState } from 'react';
import { DB, nextId, fmtDate, syncGS, loadFromGS, type Funcionario, UF_OPTIONS, type Escala } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { logAcesso } from '@/lib/db';
import { PageHeader, StatCard, TableWrapper, Th, Td, Badge, Btn, Modal, FormCard, Field, Input, Select, CurrencyInput, ConfirmModal } from '@/components/ui-custom';
import { printFuncionarioPDF, printListaFuncionarios } from '@/lib/pdfFuncionario';

export default function FuncionariosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const allFunc = DB.get<Funcionario>('func');
  const ativosFunc = allFunc.filter(f => !f.demissao);
  const filtered = ativosFunc.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.nome?.toLowerCase().includes(q) || f.cpf?.includes(q) || f.funcao?.toLowerCase().includes(q) || f.cel?.includes(q);
  }).sort((a, b) => a.nome?.localeCompare(b.nome));

  const ativos = ativosFunc.length;
  const demitidos = allFunc.filter(f => f.demissao).length;
  const hoje = new Date();
  const aniv = allFunc.filter(f => {
    if (!f.nasc) return false;
    return new Date(f.nasc).getMonth() === hoje.getMonth();
  }).length;

  const openNew = () => { setEditId(null); setModalOpen(true); };
  const openEdit = (id: number) => { setEditId(id); setModalOpen(true); };

  const deleteFunc = (id: number) => {
    DB.set('func', DB.get<Funcionario>('func').filter(x => x.id !== id));
    logAcesso('Excluiu funcionário ID ' + id, session!.name, session!.user);
    syncGS(true);
    refresh();
  };

  return (
    <>
      <PageHeader title="Cadastro de Funcionários" icon="👤">
        <Btn variant="outline" onClick={() => syncGS()}>📤 Enviar para Planilha</Btn>
        <Btn variant="outline" onClick={() => loadFromGS()}>📥 Carregar da Planilha</Btn>
        <Btn variant="outline" onClick={() => printListaFuncionarios(filtered)}>🖨️ Imprimir Lista</Btn>
        <Btn onClick={openNew}>➕ Novo Funcionário</Btn>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
          <StatCard value={allFunc.length} label="Total" />
          <StatCard value={ativos} label="Ativos" color="text-success" />
          <StatCard value={demitidos} label="Demitidos" color="text-destructive" />
          <StatCard value={aniv} label="Aniversários este mês" />
        </div>

        <TableWrapper searchValue={search} onSearch={setSearch} searchPlaceholder="🔍 Buscar por nome, CPF, função..." count={filtered.length + ' registro(s)'}>
          <thead>
            <tr><Th>ID</Th><Th>Nome</Th><Th>CPF</Th><Th>Nascimento</Th><Th>Função</Th><Th>Celular</Th><Th>Admissão</Th><Th>Situação</Th><Th>Ações</Th></tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="cursor-pointer transition-colors hover:bg-gold-glow">
                <Td><Badge>{f.id}</Badge></Td>
                <Td className="font-bold">{f.nome}</Td>
                <Td>{f.cpf || '—'}</Td>
                <Td>{fmtDate(f.nasc)}</Td>
                <Td>{f.funcao || '—'}</Td>
                <Td>{f.cel || '—'}</Td>
                <Td>{fmtDate(f.admissao)}</Td>
                <Td><Badge variant={f.demissao ? 'danger' : 'success'}>{f.demissao ? 'Demitido' : 'Ativo'}</Badge></Td>
                <Td>
                  <div className="flex gap-1">
                    <Btn size="sm" variant="outline" onClick={() => printFuncionarioPDF(f)}>🖨️</Btn>
                    <Btn size="sm" variant="outline" onClick={() => openEdit(f.id)}>✏️</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setConfirmDeleteId(f.id)}>🗑</Btn>
                  </div>
                </Td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={9} className="text-center text-muted-foreground p-5">Nenhum funcionário cadastrado</td></tr>
            )}
          </tbody>
        </TableWrapper>
      </div>

      {modalOpen && (
        <FuncModal
          editId={editId}
          onClose={() => { setModalOpen(false); refresh(); }}
          session={session!}
        />
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Funcionário"
        message="Este funcionário será removido do sistema e da planilha Google. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => { if (confirmDeleteId !== null) { deleteFunc(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

function FuncModal({ editId, onClose, session }: { editId: number | null; onClose: () => void; session: { name: string; user: string } }) {
  const existing = editId ? DB.get<Funcionario>('func').find(x => x.id === editId) : null;
  const escalas = DB.get<Escala>('escalas');

  const [form, setForm] = useState<Record<string, string>>(() => {
    if (existing) {
      const obj: Record<string, string> = {};
      Object.entries(existing).forEach(([k, v]) => { obj[k] = String(v || ''); });
      return obj;
    }
    return {};
  });

  const v = (k: string) => form[k] || '';
  const s = (k: string, val: string) => setForm(prev => ({ ...prev, [k]: val }));

  const save = () => {
    if (!v('nome')) { alert('Nome é obrigatório!'); return; }
    if (!v('nasc')) { alert('Data de nascimento é obrigatória!'); return; }
    if (!v('funcao')) { alert('Função é obrigatória!'); return; }

    const list = DB.get<Funcionario>('func');
    if (v('cpf') && !editId && list.find(x => x.cpf === v('cpf'))) { alert('CPF já cadastrado!'); return; }

    const obj: Funcionario = {
      id: editId || nextId('func'),
      nome: v('nome'), nasc: v('nasc'), sexo: v('sexo'), rh: v('rh'), estcivil: v('estcivil'),
      natural: v('natural'), uf: v('uf'), escol: v('escol'), pai: v('pai'), mae: v('mae'),
      end: v('end'), compl: v('compl'), cep: v('cep'), cidade: v('cidade'), bairro: v('bairro'),
      ufend: v('ufend'), tel: v('tel'), cel: v('cel'), email: v('email'), cpf: v('cpf'),
      rg: v('rg'), ufrg: v('ufrg'), emissrg: v('emissrg'), pis: v('pis'), ctps: v('ctps'),
      seriectps: v('seriectps'), emissctps: v('emissctps'), titulo: v('titulo'), secao: v('secao'),
      zona: v('zona'), cnh: v('cnh'), catcnh: v('catcnh'), venccnh: v('venccnh'), reserv: v('reserv'),
      empresa: v('empresa'), cnpj: v('cnpj'), primemp: v('primemp'), sindical: v('sindical'),
      admissao: v('admissao'), demissao: v('demissao'), funcao: v('funcao'), horario: v('horario'),
      salario: v('salario'), ticket: v('ticket'), valdia: v('valdia'), vtransp: v('vtransp'),
      valdiat: v('valdiat'), descvt: v('descvt'), descvr: v('descvr'), planosaude: v('planosaude'),
      exp: v('exp'), banco: v('banco'), agencia: v('agencia'), conta: v('conta'),
      tipoconta: v('tipoconta'), pix: v('pix'), tipopix: v('tipopix'),
      foto: v('foto'),
      cadastrado: existing?.cadastrado || new Date().toLocaleString('pt-BR'),
    };

    if (editId) {
      const i = list.findIndex(x => x.id === editId);
      if (i >= 0) list[i] = obj; else list.push(obj);
    } else {
      list.push(obj);
    }
    DB.set('func', list);
    logAcesso('Salvou funcionário: ' + obj.nome, session.name, session.user);
    syncGS(true);
    onClose();
  };

  const UFSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">—</option>
      {UF_OPTIONS.map(u => <option key={u}>{u}</option>)}
    </Select>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={editId ? '✏️ Editar Funcionário' : '👤 Novo Funcionário'}
      maxWidth="1000px"
      footer={<><Btn variant="outline" onClick={onClose}>Cancelar</Btn><Btn onClick={save}>💾 Salvar Funcionário</Btn></>}
    >
      <FormCard title="Dados Pessoais" icon="👤">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Nome Completo" required className="flex-[5] min-w-[220px]">
            <Input value={v('nome')} onChange={e => s('nome', e.target.value)} placeholder="Nome completo" />
          </Field>
          <Field label="Nascimento" required className="flex-[2] min-w-[100px]">
            <Input type="date" value={v('nasc')} onChange={e => s('nasc', e.target.value)} />
          </Field>
          <Field label="Sexo" className="flex-1 min-w-[70px]">
            <Select value={v('sexo')} onChange={e => s('sexo', e.target.value)}>
              <option value="">—</option><option>Masculino</option><option>Feminino</option><option>Outro</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Fator RH" className="flex-1 min-w-[70px]">
            <Select value={v('rh')} onChange={e => s('rh', e.target.value)}>
              <option value="">—</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Estado Civil" className="flex-[2] min-w-[100px]">
            <Select value={v('estcivil')} onChange={e => s('estcivil', e.target.value)}>
              <option value="">—</option>{['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União Estável'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Naturalidade" className="flex-[3] min-w-[140px]">
            <Input value={v('natural')} onChange={e => s('natural', e.target.value)} placeholder="Cidade" />
          </Field>
          <Field label="UF" className="flex-1 min-w-[70px]">
            <UFSelect value={v('uf')} onChange={val => s('uf', val)} />
          </Field>
          <Field label="Escolaridade" className="flex-[2] min-w-[100px]">
            <Select value={v('escol')} onChange={e => s('escol', e.target.value)}>
              <option value="">—</option>{['Fund. Incompleto','Fund. Completo','Médio Incompleto','Médio Completo','Superior Incompleto','Superior Completo','Pós-graduação'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Nome do Pai" className="flex-[4] min-w-[180px]"><Input value={v('pai')} onChange={e => s('pai', e.target.value)} /></Field>
          <Field label="Nome da Mãe" required className="flex-[4] min-w-[180px]"><Input value={v('mae')} onChange={e => s('mae', e.target.value)} /></Field>
        </div>
      </FormCard>

      <FormCard title="Endereço e Contato" icon="📍">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Endereço" required className="flex-[5] min-w-[220px]"><Input value={v('end')} onChange={e => s('end', e.target.value)} placeholder="Rua, Av..." /></Field>
          <Field label="Complemento" className="flex-[2] min-w-[100px]"><Input value={v('compl')} onChange={e => s('compl', e.target.value)} /></Field>
          <Field label="CEP" className="flex-1 min-w-[70px]"><Input value={v('cep')} onChange={e => s('cep', e.target.value)} placeholder="00000-000" /></Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Cidade" required className="flex-[3] min-w-[140px]"><Input value={v('cidade')} onChange={e => s('cidade', e.target.value)} /></Field>
          <Field label="Bairro" className="flex-[2] min-w-[100px]"><Input value={v('bairro')} onChange={e => s('bairro', e.target.value)} /></Field>
          <Field label="UF" className="flex-1 min-w-[70px]"><UFSelect value={v('ufend')} onChange={val => s('ufend', val)} /></Field>
          <Field label="Telefone" className="flex-[2] min-w-[100px]"><Input value={v('tel')} onChange={e => s('tel', e.target.value)} placeholder="(00) 0000-0000" /></Field>
          <Field label="Celular" required className="flex-[2] min-w-[100px]"><Input value={v('cel')} onChange={e => s('cel', e.target.value)} placeholder="(00) 00000-0000" /></Field>
        </div>
      </FormCard>

      <FormCard title="Documentação" icon="📋">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="CPF" required className="flex-[2] min-w-[100px]"><Input value={v('cpf')} onChange={e => s('cpf', e.target.value)} placeholder="000.000.000-00" /></Field>
          <Field label="RG" className="flex-[2] min-w-[100px]"><Input value={v('rg')} onChange={e => s('rg', e.target.value)} /></Field>
          <Field label="UF RG" className="flex-1 min-w-[70px]"><UFSelect value={v('ufrg')} onChange={val => s('ufrg', val)} /></Field>
          <Field label="Emissão RG" className="flex-[2] min-w-[100px]"><Input type="date" value={v('emissrg')} onChange={e => s('emissrg', e.target.value)} /></Field>
          <Field label="PIS/PASEP" className="flex-[2] min-w-[100px]"><Input value={v('pis')} onChange={e => s('pis', e.target.value)} /></Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="CTPS" className="flex-[2] min-w-[100px]"><Input value={v('ctps')} onChange={e => s('ctps', e.target.value)} /></Field>
          <Field label="Série CTPS" className="flex-1 min-w-[70px]"><Input value={v('seriectps')} onChange={e => s('seriectps', e.target.value)} /></Field>
          <Field label="Emissão CTPS" className="flex-[2] min-w-[100px]"><Input type="date" value={v('emissctps')} onChange={e => s('emissctps', e.target.value)} /></Field>
          <Field label="Título Eleitor" className="flex-[2] min-w-[100px]"><Input value={v('titulo')} onChange={e => s('titulo', e.target.value)} /></Field>
          <Field label="Seção" className="flex-1 min-w-[70px]"><Input value={v('secao')} onChange={e => s('secao', e.target.value)} /></Field>
          <Field label="Zona" className="flex-1 min-w-[70px]"><Input value={v('zona')} onChange={e => s('zona', e.target.value)} /></Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="CNH" className="flex-[2] min-w-[100px]"><Input value={v('cnh')} onChange={e => s('cnh', e.target.value)} /></Field>
          <Field label="Categoria" className="flex-1 min-w-[70px]">
            <Select value={v('catcnh')} onChange={e => s('catcnh', e.target.value)}>
              <option value="">—</option>{['A','B','C','D','E','AB','AC'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
          <Field label="Vencimento CNH" className="flex-[2] min-w-[100px]"><Input type="date" value={v('venccnh')} onChange={e => s('venccnh', e.target.value)} /></Field>
          <Field label="Reservista" className="flex-[2] min-w-[100px]"><Input value={v('reserv')} onChange={e => s('reserv', e.target.value)} /></Field>
        </div>
      </FormCard>

      <FormCard title="Empresa e Contrato" icon="🏢">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Empresa" className="flex-[4] min-w-[180px]"><Input value={v('empresa')} onChange={e => s('empresa', e.target.value)} /></Field>
          <Field label="CNPJ" className="flex-[3] min-w-[140px]"><Input value={v('cnpj')} onChange={e => s('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></Field>
          <Field label="1º Emprego?" className="flex-1 min-w-[70px]">
            <Select value={v('primemp')} onChange={e => s('primemp', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Contrib. Sindical?" className="flex-1 min-w-[70px]">
            <Select value={v('sindical')} onChange={e => s('sindical', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Admissão" required className="flex-[2] min-w-[100px]"><Input type="date" value={v('admissao')} onChange={e => s('admissao', e.target.value)} /></Field>
          <Field label="Demissão" className="flex-[2] min-w-[100px]"><Input type="date" value={v('demissao')} onChange={e => s('demissao', e.target.value)} /></Field>
          <Field label="Função" required className="flex-[3] min-w-[140px]"><Input value={v('funcao')} onChange={e => s('funcao', e.target.value)} placeholder="Cargo / função" /></Field>
          <Field label="Horário / Escala" className="flex-[3] min-w-[140px]">
            <Select value={v('horario')} onChange={e => s('horario', e.target.value)}>
              <option value="">— Selecione —</option>
              {escalas.map(e => <option key={e.id} value={e.desc}>{e.desc}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Salário (R$)" className="flex-[2] min-w-[100px]"><CurrencyInput value={v('salario')} onChange={e => s('salario', e.target.value)} /></Field>
          <Field label="Ticket Alimentação" className="flex-[2] min-w-[100px]">
            <Select value={v('ticket')} onChange={e => s('ticket', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Valor/Dia Ticket" className="flex-[2] min-w-[100px]"><CurrencyInput value={v('valdia')} onChange={e => s('valdia', e.target.value)} /></Field>
          <Field label="V. Transporte" className="flex-[2] min-w-[100px]">
            <Select value={v('vtransp')} onChange={e => s('vtransp', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Valor/Dia Transp." className="flex-[2] min-w-[100px]"><CurrencyInput value={v('valdiat')} onChange={e => s('valdiat', e.target.value)} /></Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Desc. VT" className="flex-[2] min-w-[100px]">
            <Select value={v('descvt')} onChange={e => s('descvt', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Desc. VR" className="flex-[2] min-w-[100px]">
            <Select value={v('descvr')} onChange={e => s('descvr', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Plano de Saúde" className="flex-[2] min-w-[100px]">
            <Select value={v('planosaude')} onChange={e => s('planosaude', e.target.value)}><option value="">—</option><option>Sim</option><option>Não</option></Select>
          </Field>
          <Field label="Observações" className="flex-[3] min-w-[140px]"><Input value={v('exp')} onChange={e => s('exp', e.target.value)} /></Field>
        </div>
      </FormCard>

      <FormCard title="Dados Bancários e PIX" icon="🏦">
        <div className="flex gap-2.5 mb-2.5 flex-wrap">
          <Field label="Banco" className="flex-[3] min-w-[140px]"><Input value={v('banco')} onChange={e => s('banco', e.target.value)} /></Field>
          <Field label="Agência" className="flex-[2] min-w-[100px]"><Input value={v('agencia')} onChange={e => s('agencia', e.target.value)} /></Field>
          <Field label="Conta" className="flex-[2] min-w-[100px]"><Input value={v('conta')} onChange={e => s('conta', e.target.value)} /></Field>
          <Field label="Tipo de Conta" className="flex-[2] min-w-[100px]">
            <Select value={v('tipoconta')} onChange={e => s('tipoconta', e.target.value)}>
              <option value="">—</option>{['Corrente','Poupança','Salário','Pagamento'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Field label="Chave PIX" className="flex-[3] min-w-[140px]"><Input value={v('pix')} onChange={e => s('pix', e.target.value)} /></Field>
          <Field label="Tipo de Chave PIX" className="flex-[2] min-w-[100px]">
            <Select value={v('tipopix')} onChange={e => s('tipopix', e.target.value)}>
              <option value="">—</option>{['CPF','E-mail','Celular','CNPJ','Aleatória (EVP)'].map(o => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        </div>
      </FormCard>
    </Modal>
  );
}
