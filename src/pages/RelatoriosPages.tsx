import { useState, useMemo } from 'react';
import { DB, fmtDate, fmtMoneyBRL, MESES, type Funcionario, type Usuario, type AcessoLog } from '@/lib/db';
import { PageHeader, TableWrapper, Th, Td, Badge, StatCard, Select, Input, Field, Btn, Modal, FormCard } from '@/components/ui-custom';
import { printFuncionarioPDF } from '@/lib/pdfFuncionario';

export function RelFuncPage() {
  const [sit, setSit] = useState('');
  const [fun, setFun] = useState('');
  const [infoId, setInfoId] = useState<number | null>(null);

  const list = DB.get<Funcionario>('func').filter(f => {
    if (sit === 'Ativo' && f.demissao) return false;
    if (sit === 'Demitido' && !f.demissao) return false;
    if (fun && !f.funcao?.toLowerCase().includes(fun.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.nome?.localeCompare(b.nome));

  const ativos = list.filter(f => !f.demissao).length;
  const demitidos = list.length - ativos;
  const infoFunc = infoId != null ? DB.get<Funcionario>('func').find(f => f.id === infoId) : null;

  return (
    <>
      <PageHeader title="Relatório de Funcionários" icon="📊" />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-card border border-border rounded-xl p-3.5 mb-3.5 flex items-end gap-2.5 flex-wrap">
          <Field label="Situação" className="flex-[2] min-w-[100px]">
            <Select value={sit} onChange={e => setSit(e.target.value)}>
              <option value="">Todos</option><option>Ativo</option><option>Demitido</option>
            </Select>
          </Field>
          <Field label="Função" className="flex-[3] min-w-[140px]">
            <Input value={fun} onChange={e => setFun(e.target.value)} placeholder="Filtrar por função..." />
          </Field>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5 mb-4">
          <StatCard value={list.length} label="Encontrados" />
          <StatCard value={ativos} label="Ativos" color="text-success" />
          <StatCard value={demitidos} label="Demitidos" color="text-destructive" />
        </div>
        <TableWrapper count={list.length + ' resultado(s)'}>
          <thead><tr><Th>ID</Th><Th>Nome</Th><Th>CPF</Th><Th>Função</Th><Th>Admissão</Th><Th>Demissão</Th><Th>Salário</Th><Th>Situação</Th><Th>Ações</Th></tr></thead>
          <tbody>
            {list.map(f => (
              <tr key={f.id} className="hover:bg-gold-glow transition-colors">
                <Td>{f.id}</Td><Td className="font-bold">{f.nome}</Td><Td>{f.cpf || '—'}</Td>
                <Td>{f.funcao || '—'}</Td><Td>{fmtDate(f.admissao)}</Td>
                <Td>{f.demissao ? fmtDate(f.demissao) : '—'}</Td>
                <Td>{f.salario ? fmtMoneyBRL(parseFloat(String(f.salario).replace(',', '.'))) : '—'}</Td>
                <Td><Badge variant={f.demissao ? 'danger' : 'success'}>{f.demissao ? 'Demitido' : 'Ativo'}</Badge></Td>
                <Td>
                  {f.demissao && (
                    <div className="flex gap-1">
                      <Btn size="sm" variant="outline" onClick={() => setInfoId(f.id)}>ℹ️ +Info</Btn>
                      <Btn size="sm" variant="outline" onClick={() => printFuncionarioPDF(f)}>🖨️ PDF</Btn>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={9} className="text-center text-muted-foreground p-5">Nenhum registro</td></tr>}
          </tbody>
        </TableWrapper>
      </div>

      {infoFunc && <DemitidoInfoModal func={infoFunc} onClose={() => setInfoId(null)} />}
    </>
  );
}

function DemitidoInfoModal({ func, onClose }: { func: Funcionario; onClose: () => void }) {
  const Row = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex gap-2 text-[11px] py-1 border-b border-border/40 last:border-0">
      <span className="font-semibold text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="text-foreground">{value || '—'}</span>
    </div>
  );

  return (
    <Modal open onClose={onClose} title={`📋 Cadastro Original — ${func.nome}`} maxWidth="800px"
      footer={<>
        <Btn variant="outline" onClick={onClose}>Fechar</Btn>
        <Btn onClick={() => printFuncionarioPDF(func)}>🖨️ Imprimir PDF</Btn>
      </>}>
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 mb-3 text-[11px]">
        ⚠️ Funcionário demitido em <b>{fmtDate(func.demissao)}</b>. Estes são os dados originais do cadastro.
      </div>
      <FormCard title="Dados Pessoais" icon="👤">
        <Row label="Nome Completo" value={func.nome} />
        <Row label="Nascimento" value={fmtDate(func.nasc)} />
        <Row label="Sexo" value={func.sexo} />
        <Row label="Estado Civil" value={func.estcivil} />
        <Row label="Naturalidade" value={`${func.natural || '—'} / ${func.uf || '—'}`} />
        <Row label="Escolaridade" value={func.escol} />
        <Row label="Pai" value={func.pai} />
        <Row label="Mãe" value={func.mae} />
      </FormCard>
      <FormCard title="Endereço & Contato" icon="📍">
        <Row label="Endereço" value={`${func.end || '—'} ${func.compl || ''}`} />
        <Row label="Bairro/Cidade" value={`${func.bairro || '—'} — ${func.cidade || '—'}/${func.ufend || '—'}`} />
        <Row label="CEP" value={func.cep} />
        <Row label="Telefone" value={func.tel} />
        <Row label="Celular" value={func.cel} />
        <Row label="E-mail" value={func.email} />
      </FormCard>
      <FormCard title="Documentos" icon="📄">
        <Row label="CPF" value={func.cpf} />
        <Row label="RG" value={`${func.rg || '—'} ${func.ufrg || ''} (${func.emissrg || '—'})`} />
        <Row label="PIS" value={func.pis} />
        <Row label="CTPS" value={`${func.ctps || '—'} série ${func.seriectps || '—'}`} />
        <Row label="Título Eleitor" value={`${func.titulo || '—'} seção ${func.secao || '—'} zona ${func.zona || '—'}`} />
        <Row label="CNH" value={`${func.cnh || '—'} cat. ${func.catcnh || '—'} venc. ${fmtDate(func.venccnh)}`} />
        <Row label="Reservista" value={func.reserv} />
      </FormCard>
      <FormCard title="Vínculo Empregatício" icon="💼">
        <Row label="Função" value={func.funcao} />
        <Row label="Admissão" value={fmtDate(func.admissao)} />
        <Row label="Demissão" value={fmtDate(func.demissao)} />
        <Row label="Salário" value={func.salario ? fmtMoneyBRL(parseFloat(String(func.salario).replace(',', '.'))) : '—'} />
        <Row label="Horário" value={func.horario} />
        <Row label="Vale Transporte" value={func.vtransp} />
        <Row label="Plano de Saúde" value={func.planosaude} />
      </FormCard>
      <FormCard title="Dados Bancários" icon="🏦">
        <Row label="Banco" value={func.banco} />
        <Row label="Agência" value={func.agencia} />
        <Row label="Conta" value={`${func.conta || '—'} (${func.tipoconta || '—'})`} />
        <Row label="PIX" value={`${func.pix || '—'} (${func.tipopix || '—'})`} />
      </FormCard>
    </Modal>
  );
}

export function RelAnivPage() {
  const [mes, setMes] = useState('');
  const list = DB.get<Funcionario>('func').filter(f => {
    if (f.demissao) return false;
    if (!f.nasc) return false;
    const d = new Date(f.nasc);
    if (isNaN(d.getTime())) return false;
    if (!mes) return true;
    return d.getMonth() + 1 === parseInt(mes, 10);
  }).sort((a, b) => new Date(a.nasc).getDate() - new Date(b.nasc).getDate());

  return (
    <>
      <PageHeader title="Aniversariantes" icon="🎂" />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-card border border-border rounded-xl p-3.5 mb-3.5 flex items-end gap-2.5 flex-wrap">
          <Field label="Mês" className="w-48">
            <Select value={mes} onChange={e => setMes(e.target.value)}>
              <option value="">Todos os meses</option>
              {MESES.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <TableWrapper count={list.length + ' aniversariante(s)'}>
          <thead><tr><Th>Nome</Th><Th>Nascimento</Th><Th>Mês</Th><Th>Dia</Th><Th>Celular</Th><Th>Função</Th></tr></thead>
          <tbody>
            {list.map(f => {
              const d = new Date(f.nasc);
              return (
                <tr key={f.id} className="hover:bg-gold-glow transition-colors">
                  <Td className="font-bold">{f.nome}</Td><Td>{fmtDate(f.nasc)}</Td>
                  <Td>{MESES[d.getMonth() + 1]}</Td>
                  <Td className="font-bold text-primary">{d.getDate()}</Td>
                  <Td>{f.cel || '—'}</Td><Td>{f.funcao || '—'}</Td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={6} className="text-center text-muted-foreground p-5">Nenhum aniversariante</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
    </>
  );
}

export function RelUsersPage() {
  const list = DB.get<Usuario>('users');
  return (
    <>
      <PageHeader title="Relatório de Usuários" icon="🧾" />
      <div className="flex-1 overflow-y-auto p-5">
        <TableWrapper count={list.length + ' usuário(s)'}>
          <thead><tr><Th>ID</Th><Th>Nome</Th><Th>Usuário/Email</Th><Th>Cargo</Th><Th>Cadastrado em</Th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id} className="hover:bg-gold-glow transition-colors">
                <Td>{u.id}</Td><Td className="font-bold">{u.nome}</Td><Td>{u.email}</Td>
                <Td><Badge variant={u.nivel === 'Master' ? 'danger' : u.nivel === 'Administrador' ? 'gold' : 'success'}>{u.nivel}</Badge></Td>
                <Td>{u.cadastrado || '—'}</Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="text-center text-muted-foreground p-5">Nenhum usuário</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
    </>
  );
}

export function RelAcessosPage() {
  const [usr, setUsr] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const list = useMemo(() =>
    DB.get<AcessoLog>('acessos').filter(a => {
      if (usr && !a.user?.toLowerCase().includes(usr.toLowerCase()) && !a.nome?.toLowerCase().includes(usr.toLowerCase())) return false;
      return true;
    }),
    [usr, refreshKey]
  );

  const clear = () => {
    if (!confirm('Limpar todo o registro de acessos?')) return;
    DB.set('acessos', []);
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      <PageHeader title="Registro de Acessos" icon="🔒" />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-card border border-border rounded-xl p-3.5 mb-3.5 flex items-end gap-2.5 flex-wrap">
          <Field label="Usuário" className="flex-[3] min-w-[140px]">
            <Input value={usr} onChange={e => setUsr(e.target.value)} placeholder="Filtrar por usuário..." />
          </Field>
          <button onClick={clear} className="py-[7px] px-3 rounded-md text-[11px] font-semibold bg-destructive text-destructive-foreground hover:opacity-85">
            🗑 Limpar
          </button>
        </div>
        <TableWrapper count={list.length + ' registro(s)'}>
          <thead><tr><Th>#</Th><Th>Data/Hora</Th><Th>Nome</Th><Th>Usuário</Th><Th>Evento</Th></tr></thead>
          <tbody>
            {list.map((a, i) => (
              <tr key={a.id} className="hover:bg-gold-glow transition-colors">
                <Td>{i + 1}</Td><Td>{a.dt}</Td><Td>{a.nome || '—'}</Td>
                <Td>{a.user || '—'}</Td><Td>{a.evento}</Td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="text-center text-muted-foreground p-5">Sem registros</td></tr>}
          </tbody>
        </TableWrapper>
      </div>
    </>
  );
}
