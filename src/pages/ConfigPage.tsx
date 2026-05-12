import { useState } from 'react';
import { DB, nextId, verifyPassword, initDefaultData, type FluxoCaixaRegistro, type Funcionario, type BancoRegistro, type Escala, type Documento, type Usuario, type AcessoLog, type EstoqueItem, type EstoqueMovimento, type Veiculo, type Abastecimento, type EmpresaConfig, type CertificadoConfig, syncGS, loadFromGS, testGSConnection, syncEstoqueGS, loadFromEstoqueGS, testEstoqueGSConnection, syncFluxoGS, loadFromFluxoGS, syncEquipeGS, loadFromEquipeGS, exportBackupLocal, getBackupOffline, deleteBackupOffline, hasPermission, type UserPermissions } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, FormCard, Field, Input, Btn, Badge } from '@/components/ui-custom';

const ALL_FEATURES = [
  { key: 'funcionarios', label: 'Funcionários', icon: '👤' },
  { key: 'bancos', label: 'Bancos / PIX', icon: '🏦' },
  { key: 'escalas', label: 'Escalas', icon: '📅' },
  { key: 'documentos', label: 'Documentos', icon: '📄' },
  { key: 'usuarios', label: 'Usuários', icon: '👥' },
  { key: 'estoque', label: 'Estoque', icon: '📦' },
  { key: 'abastecimento', label: 'Abastecimento', icon: '⛽' },
  { key: 'fluxoCaixa', label: 'Fluxo de Caixa', icon: '💰' },
  { key: 'orcamento', label: 'Orçamento', icon: '📋' },
  { key: 'certificado', label: 'Certificado', icon: '📜' },
  { key: 'equipe', label: 'Controle de Equipe', icon: '⭐' },
  { key: 'relatorios', label: 'Relatórios', icon: '📊' },
  { key: 'config', label: 'Configurações', icon: '⚙️' },
];

export default function ConfigPage() {
  const { session } = useAuth();
  const isMaster = session?.nivel === 'Master';
  const config = DB.getObj('config');

  // GS URLs
  const [gsUrl, setGsUrl] = useState(config.gsUrl || '');
  const [gsUrlEstoque, setGsUrlEstoque] = useState(config.gsUrlEstoque || '');
  const [gsUrlFluxo, setGsUrlFluxo] = useState(config.gsUrlFluxo || '');
  const [gsUrlEquipe, setGsUrlEquipe] = useState(config.gsUrlEquipe || '');

  // Empresa defaults
  const DEFAULT_EMP: EmpresaConfig = { nome: 'F&A Higienizações', cnpj: '46.649.584/0001-21', endereco: '', telefone: '', email: '', instagram: 'https://bit.ly/3VfGNMv' };
  const [empresa, setEmpresa] = useState<EmpresaConfig>({ ...DEFAULT_EMP, ...(config.empresaConfig || {}) });

  // Certificado defaults
  const DEFAULT_CERT: CertificadoConfig = { nomeEmpresa: 'F&A Higienizações', cnpj: '46.649.584/0001-21', endereco: '', telefone: '', responsavel: '', cargo: 'Responsável Técnico', logoUrl: '' };
  const [certCfg, setCertCfg] = useState<CertificadoConfig>({ ...DEFAULT_CERT, ...(config.certificadoConfig || {}) });

  const [showGsSection, setShowGsSection] = useState(false);
  const [masterPwInput, setMasterPwInput] = useState('');
  const [masterPwError, setMasterPwError] = useState('');
  const [masterRastro, setMasterRastro] = useState(config.masterRastro !== false);
  const [rastroConfirmPw, setRastroConfirmPw] = useState('');
  const [rastroError, setRastroError] = useState('');
  const [deletePwInput, setDeletePwInput] = useState('');
  const [deleteBkpConfirmPw, setDeleteBkpConfirmPw] = useState('');
  const [, setTick] = useState(0);

  const checkMasterPw = async (input: string): Promise<boolean> => {
    let cfg = DB.getObj('config');
    // If hash was never stored (e.g., initDefaultData failed on first login),
    // initialize it now before comparing.
    if (!cfg.masterPasswordHash) {
      await initDefaultData();
      cfg = DB.getObj('config');
    }
    if (!cfg.masterPasswordHash) return false;
    return verifyPassword(input, cfg.masterPasswordHash);
  };

  const unlockGs = async () => {
    const ok = await checkMasterPw(masterPwInput);
    if (ok) { setShowGsSection(true); setMasterPwError(''); }
    else setMasterPwError('Senha mestra incorreta!');
  };

  const saveUrl = () => { const cfg = DB.getObj('config'); cfg.gsUrl = gsUrl.trim(); DB.setObj('config', cfg); alert('URL salva!'); };
  const saveUrlEstoque = () => { const cfg = DB.getObj('config'); cfg.gsUrlEstoque = gsUrlEstoque.trim(); DB.setObj('config', cfg); alert('URL de estoque salva!'); };
  const saveUrlFluxo = () => { const cfg = DB.getObj('config'); cfg.gsUrlFluxo = gsUrlFluxo.trim(); DB.setObj('config', cfg); alert('URL financeira salva!'); };
  const saveUrlEquipe = () => { const cfg = DB.getObj('config'); cfg.gsUrlEquipe = gsUrlEquipe.trim(); DB.setObj('config', cfg); alert('URL de equipe salva!'); };

  const saveEmpresa = () => { const cfg = DB.getObj('config'); cfg.empresaConfig = empresa; DB.setObj('config', cfg); alert('✅ Dados da empresa salvos!'); };
  const saveCert = () => { const cfg = DB.getObj('config'); cfg.certificadoConfig = certCfg; DB.setObj('config', cfg); alert('✅ Dados do certificado salvos!'); };

  const toggleMasterRastro = async () => {
    if (!isMaster) { setRastroError('Apenas o Master pode alterar!'); return; }
    if (!rastroConfirmPw.trim()) { setRastroError('Digite a senha mestra para confirmar.'); return; }
    try {
      const ok = await checkMasterPw(rastroConfirmPw);
      if (!ok) { setRastroError('Senha mestra incorreta!'); return; }
      setRastroConfirmPw('');
      setRastroError('');
      const newVal = !masterRastro;
      const cfg = DB.getObj('config');
      cfg.masterRastro = newVal;
      DB.setObj('config', cfg);
      setMasterRastro(newVal);
    } catch (err: any) {
      setRastroError('Erro ao verificar senha: ' + err.message);
    }
  };

  const exportJSON = () => {
    const backup = {
      func: DB.get<Funcionario>('func'), bancos: DB.get<BancoRegistro>('bancos'),
      escalas: DB.get<Escala>('escalas'), docs: DB.get<Documento>('docs'),
      users: DB.get<Usuario>('users'), estoque: DB.get<EstoqueItem>('estoque'),
      estoque_mov: DB.get<EstoqueMovimento>('estoque_mov'), veiculos: DB.get<Veiculo>('veiculos'),
      abastecimentos: DB.get<Abastecimento>('abastecimentos'),
      fluxo_caixa: DB.get<FluxoCaixaRegistro>('fluxo_caixa'),
      acessos: DB.get<AcessoLog>('acessos'), config: DB.getObj('config'),
      exportado: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FA_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };

  const importJSON = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          const d = JSON.parse(ev.target?.result as string);
          if (!confirm('Isso sobrescreverá os dados atuais. Continuar?')) return;
          if (d.func) DB.set('func', d.func);
          if (d.bancos) DB.set('bancos', d.bancos);
          if (d.escalas) DB.set('escalas', d.escalas);
          if (d.docs) DB.set('docs', d.docs);
          if (d.users) DB.set('users', d.users);
          if (d.estoque) DB.set('estoque', d.estoque);
          if (d.estoque_mov) DB.set('estoque_mov', d.estoque_mov);
          if (d.veiculos) DB.set('veiculos', d.veiculos);
          if (d.abastecimentos) DB.set('abastecimentos', d.abastecimentos);
          if (d.fluxo_caixa) DB.set('fluxo_caixa', d.fluxo_caixa);
          if (d.acessos) DB.set('acessos', d.acessos);
          if (d.config) DB.setObj('config', d.config);
          alert('Backup importado com sucesso!');
          window.location.reload();
        } catch { alert('Arquivo inválido!'); }
      };
      r.readAsText(f);
    };
    inp.click();
  };

  const saveBackupOffline = () => {
    exportBackupLocal();
    alert('✅ Backup offline salvo e download iniciado!');
    setTick(t => t + 1);
  };

  const handleDeleteBackup = async () => {
    if (!isMaster) { alert('Apenas o Master pode apagar o backup!'); return; }
    const ok = await checkMasterPw(deleteBkpConfirmPw);
    if (!ok) { alert('Senha incorreta!'); return; }
    setDeleteBkpConfirmPw('');
    deleteBackupOffline();
    alert('Backup offline apagado.');
    setTick(t => t + 1);
  };

  const clearAll = async () => {
    if (!isMaster) { alert('Apenas o Master pode apagar todos os dados!'); return; }
    const ok = await checkMasterPw(deletePwInput);
    if (!ok) { alert('Senha mestra incorreta!'); return; }
    if (!confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados. Tem certeza?')) return;
    if (!confirm('Esta ação é irreversível. Confirmar?')) return;
    ['func', 'bancos', 'escalas', 'docs', 'users', 'acessos', 'estoque', 'estoque_mov', 'veiculos', 'abastecimentos', 'fluxo_caixa'].forEach(k => DB.set(k as any, []));
    DB.setObj('config', {});
    alert('Todos os dados foram apagados.');
    window.location.reload();
  };

  const backupOffline = getBackupOffline();

  return (
    <>
      <PageHeader title="Configurações" icon="⚙️" />
      <div className="flex-1 overflow-y-auto p-5">

        {/* Dados da Empresa (Orçamento) */}
        <FormCard title="Dados da Empresa — Orçamento" icon="🏢">
          <p className="text-[10px] text-muted-foreground mb-3">Pré-preenchimento automático do Gerador de Orçamento.</p>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Nome da Empresa" className="flex-[3] min-w-[200px]">
              <Input value={empresa.nome} onChange={e => setEmpresa(p => ({ ...p, nome: e.target.value }))} />
            </Field>
            <Field label="CNPJ" className="flex-[2] min-w-[140px]">
              <Input value={empresa.cnpj} onChange={e => setEmpresa(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Endereço" className="flex-[4] min-w-[200px]">
              <Input value={empresa.endereco} onChange={e => setEmpresa(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
            </Field>
            <Field label="Telefone" className="flex-[2] min-w-[120px]">
              <Input value={empresa.telefone} onChange={e => setEmpresa(p => ({ ...p, telefone: e.target.value }))} placeholder="(xx) xxxxx-xxxx" />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-3 flex-wrap">
            <Field label="E-mail" className="flex-[2] min-w-[160px]">
              <Input value={empresa.email} onChange={e => setEmpresa(p => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field label="Instagram" className="flex-[3] min-w-[200px]">
              <Input value={empresa.instagram} onChange={e => setEmpresa(p => ({ ...p, instagram: e.target.value }))} />
            </Field>
          </div>
          <Btn onClick={saveEmpresa}>💾 Salvar Dados da Empresa</Btn>
        </FormCard>

        {/* Dados do Certificado */}
        <FormCard title="Dados da Empresa — Certificado" icon="📜">
          <p className="text-[10px] text-muted-foreground mb-3">Pré-preenchimento automático do Gerador de Certificado.</p>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Nome da Empresa" className="flex-[3] min-w-[200px]">
              <Input value={certCfg.nomeEmpresa} onChange={e => setCertCfg(p => ({ ...p, nomeEmpresa: e.target.value }))} />
            </Field>
            <Field label="CNPJ" className="flex-[2] min-w-[140px]">
              <Input value={certCfg.cnpj} onChange={e => setCertCfg(p => ({ ...p, cnpj: e.target.value }))} />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-2.5 flex-wrap">
            <Field label="Endereço" className="flex-[4] min-w-[200px]">
              <Input value={certCfg.endereco} onChange={e => setCertCfg(p => ({ ...p, endereco: e.target.value }))} />
            </Field>
            <Field label="Telefone" className="flex-[2] min-w-[120px]">
              <Input value={certCfg.telefone} onChange={e => setCertCfg(p => ({ ...p, telefone: e.target.value }))} />
            </Field>
          </div>
          <div className="flex gap-2.5 mb-3 flex-wrap">
            <Field label="Responsável Técnico" className="flex-[2] min-w-[160px]">
              <Input value={certCfg.responsavel} onChange={e => setCertCfg(p => ({ ...p, responsavel: e.target.value }))} />
            </Field>
            <Field label="Cargo" className="flex-[2] min-w-[140px]">
              <Input value={certCfg.cargo} onChange={e => setCertCfg(p => ({ ...p, cargo: e.target.value }))} />
            </Field>
          </div>
          <Btn onClick={saveCert}>💾 Salvar Dados do Certificado</Btn>
        </FormCard>

        <FormCard title="Integração Google Planilhas" icon="🔗">
          {!showGsSection ? (
            <div>
              <p className="text-muted-foreground text-[11px] mb-3">Esta seção é protegida por senha mestra.</p>
              <div className="flex gap-2.5 items-end flex-wrap">
                <Field label="Senha Mestra" className="flex-[3] min-w-[200px]">
                  <Input type="password" value={masterPwInput} onChange={e => setMasterPwInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && unlockGs()} placeholder="Digite a senha mestra..." />
                </Field>
                <Btn onClick={unlockGs}>🔓 Desbloquear</Btn>
              </div>
              {masterPwError && <p className="text-destructive text-[11px] mt-2">{masterPwError}</p>}
            </div>
          ) : (
            <>
              <div className="flex gap-2.5 mb-3 flex-wrap items-end">
                <Field label="URL do Google Apps Script (Funcionários)" className="flex-1 min-w-[300px]">
                  <Input value={gsUrl} onChange={e => setGsUrl(e.target.value)} placeholder="https://script.google.com/macros/s/SEU_SCRIPT/exec" />
                </Field>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Btn onClick={saveUrl}>💾 Salvar URL</Btn>
                <Btn variant="info" onClick={() => syncGS()}>📤 Enviar para Planilha</Btn>
                <Btn variant="success" onClick={() => loadFromGS()}>📥 Carregar da Planilha</Btn>
                <Btn variant="outline" onClick={() => testGSConnection()}>🔗 Testar Conexão</Btn>
              </div>
              <div className="h-px bg-border my-4" />
              <div className="flex gap-2.5 mb-3 flex-wrap items-end">
                <Field label="URL da Planilha de Estoque/Abastecimento" className="flex-1 min-w-[300px]">
                  <Input value={gsUrlEstoque} onChange={e => setGsUrlEstoque(e.target.value)} placeholder="https://script.google.com/macros/s/SEU_SCRIPT_ESTOQUE/exec" />
                </Field>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Btn onClick={saveUrlEstoque}>💾 Salvar URL Estoque</Btn>
                <Btn variant="info" onClick={() => syncEstoqueGS()}>📤 Enviar Estoque</Btn>
                <Btn variant="success" onClick={() => loadFromEstoqueGS()}>📥 Carregar Estoque</Btn>
                <Btn variant="outline" onClick={() => testEstoqueGSConnection()}>🔗 Testar Conexão</Btn>
              </div>
              <div className="h-px bg-border my-4" />
              <div className="flex gap-2.5 mb-3 flex-wrap items-end">
                <Field label="URL da Planilha Financeira (Fluxo de Caixa + Custos)" className="flex-1 min-w-[300px]">
                  <Input value={gsUrlFluxo} onChange={e => setGsUrlFluxo(e.target.value)} placeholder="https://script.google.com/macros/s/SEU_SCRIPT_FLUXO/exec" />
                </Field>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Btn onClick={saveUrlFluxo}>💾 Salvar URL Financeiro</Btn>
                <Btn variant="info" onClick={() => syncFluxoGS()}>📤 Enviar Financeiro</Btn>
                <Btn variant="success" onClick={() => loadFromFluxoGS()}>📥 Carregar Financeiro</Btn>
              </div>
              <div className="h-px bg-border my-4" />
              <div className="flex gap-2.5 mb-3 flex-wrap items-end">
                <Field label="URL da Planilha de Controle de Equipe" className="flex-1 min-w-[300px]">
                  <Input value={gsUrlEquipe} onChange={e => setGsUrlEquipe(e.target.value)} placeholder="https://script.google.com/macros/s/SEU_SCRIPT_EQUIPE/exec" />
                </Field>
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                <Btn onClick={saveUrlEquipe}>💾 Salvar URL Equipe</Btn>
                <Btn variant="info" onClick={() => syncEquipeGS()}>📤 Enviar Equipe</Btn>
                <Btn variant="success" onClick={() => loadFromEquipeGS()}>📥 Carregar Equipe</Btn>
              </div>
              <div className="pt-3 text-muted-foreground text-[11px] leading-[1.8]">
                <b className="text-primary">Sincronização automática:</b> Os dados são enviados automaticamente para a planilha 3 segundos após cada alteração.<br />
                <b className="text-primary">Como configurar:</b><br />
                1. Acesse <a href="https://script.google.com" target="_blank" rel="noopener" className="text-primary underline">script.google.com</a><br />
                2. Cole o código Apps Script<br />
                3. Publique como Web App com acesso "Qualquer pessoa"<br />
                4. Copie a URL e cole acima
              </div>
            </>
          )}
        </FormCard>

        {/* Rastro do Master - apenas Master pode ver */}
        {isMaster && (
          <FormCard title="Rastro de Acessos do Master" icon="🔒">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <p className="text-[11px] text-muted-foreground flex-1">
                O usuário Master {masterRastro ? 'está sendo registrado' : 'NÃO está sendo registrado'} no rastro de acessos.
              </p>
              <Badge variant={masterRastro ? 'success' : 'danger'}>{masterRastro ? 'ATIVADO' : 'DESATIVADO'}</Badge>
            </div>
            <div className="flex gap-2 items-end flex-wrap">
              <Field label="Senha Mestra" className="flex-1 min-w-[180px]">
                <Input
                  type="password"
                  value={rastroConfirmPw}
                  onChange={e => { setRastroConfirmPw(e.target.value); setRastroError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); toggleMasterRastro(); } }}
                  placeholder="Digite a senha mestra..."
                />
              </Field>
              <Btn
                variant={masterRastro ? 'danger' : 'success'}
                onClick={toggleMasterRastro}
              >
                {masterRastro ? '🔕 Desativar Rastro' : '🔔 Ativar Rastro'}
              </Btn>
            </div>
            {rastroError && (
              <p className="text-destructive text-[11px] mt-2">{rastroError}</p>
            )}
          </FormCard>
        )}

        <FormCard title="Backup Offline (Local)" icon="💾">
          <div className="flex gap-2 flex-wrap items-center">
            <Btn variant="success" onClick={saveBackupOffline}>💾 Salvar Backup Offline</Btn>
            {backupOffline && (
              <>
                <Badge variant="success">Backup salvo: {backupOffline.exportado ? new Date(backupOffline.exportado).toLocaleString('pt-BR') : '—'}</Badge>
              </>
            )}
            {!backupOffline && <span className="text-muted-foreground text-[11px]">Nenhum backup offline salvo.</span>}
          </div>
          {isMaster && backupOffline && (
            <div className="flex gap-2 items-end mt-2 flex-wrap">
              <Field label="Senha Mestra para apagar backup" className="flex-1 min-w-[180px]">
                <Input type="password" value={deleteBkpConfirmPw} onChange={e => setDeleteBkpConfirmPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDeleteBackup()} placeholder="Digite a senha mestra..." />
              </Field>
              <Btn variant="danger" onClick={handleDeleteBackup}>🗑 Apagar Backup</Btn>
            </div>
          )}
          <p className="text-muted-foreground text-[10px] mt-2">Ao salvar, os dados são armazenados localmente e também baixados como arquivo JSON.</p>
        </FormCard>

        <FormCard title="Dados do Sistema" icon="🗄">
          <div className="flex gap-2 flex-wrap mb-3">
            <Btn variant="success" onClick={exportJSON}>📤 Exportar Backup (JSON)</Btn>
            <Btn variant="info" onClick={importJSON}>📥 Importar Backup</Btn>
          </div>
          {isMaster && (
            <>
              <div className="h-px bg-border my-3" />
              <p className="text-destructive text-[11px] font-bold mb-2">⚠️ Zona de Perigo</p>
              <div className="flex gap-2.5 items-end flex-wrap">
                <Field label="Senha Mestra para Apagar" className="flex-[2] min-w-[200px]">
                  <Input type="password" value={deletePwInput} onChange={e => setDeletePwInput(e.target.value)} placeholder="Digite a senha mestra..." />
                </Field>
                <Btn variant="danger" onClick={clearAll}>⚠️ Apagar Todos os Dados</Btn>
              </div>
            </>
          )}
        </FormCard>

        {/* Permissões por usuário - Master e Administrador */}
        {(isMaster || session?.nivel === 'Administrador') && <UserPermissionsManager />}
      </div>
    </>
  );
}

function UserPermissionsManager() {
  const { session, refreshPermissions } = useAuth();
  const isMasterUser = session?.nivel === 'Master';

  // Only show users the current admin can manage:
  // Master → all non-master users; Administrador → all non-master, non-admin users
  const allUsers = DB.get<import('@/lib/db').Usuario>('users');
  const users = allUsers.filter(u =>
    isMasterUser
      ? u.nivel !== 'Master'
      : u.nivel !== 'Master' && u.nivel !== 'Administrador'
  );

  const [, setTick] = useState(0);

  const config = DB.getObj('config');
  const perms: UserPermissions = config.userPermissions || {};

  const togglePerm = (email: string, feature: string) => {
    const cfg = DB.getObj('config');
    if (!cfg.userPermissions) cfg.userPermissions = {};
    if (!cfg.userPermissions[email]) cfg.userPermissions[email] = {};
    const current = cfg.userPermissions[email][feature as keyof typeof cfg.userPermissions[typeof email]];
    cfg.userPermissions[email][feature as keyof typeof cfg.userPermissions[typeof email]] =
      current === false ? true : (current === undefined ? false : !current);
    DB.setObj('config', cfg);
    // Notify AppLayout to recompute navItems immediately
    refreshPermissions();
    setTick(t => t + 1);
  };

  const getPermValue = (email: string, feature: string): boolean => {
    const p = perms[email];
    if (!p) return true;
    const v = p[feature as keyof typeof p];
    return v === undefined ? true : v;
  };

  if (!users.length) return null;

  return (
    <FormCard title="Permissões por Usuário" icon="🔐">
      <p className="text-[10px] text-muted-foreground mb-3">
        Por padrão, todos os usuários têm acesso total. Use os toggles abaixo para <b>bloquear</b> módulos específicos para cada usuário. O cargo do usuário não afeta essas permissões.
      </p>
      {users.map(u => (
        <div key={u.id} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gold-deep flex items-center justify-center text-[9px] font-bold text-primary-foreground overflow-hidden">
              {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : u.nome?.[0]?.toUpperCase()}
            </div>
            <span className="text-[12px] font-bold">{u.nome}</span>
            <Badge variant={u.nivel === 'Administrador' ? 'gold' : u.nivel === 'Estoquista' ? 'info' : 'success'}>{u.nivel}</Badge>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
            {ALL_FEATURES.map(f => {
              const isOn = getPermValue(u.email, f.key);
              return (
                <button key={f.key} onClick={() => togglePerm(u.email, f.key)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-[10px] font-semibold transition-all border cursor-pointer
                    ${isOn
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
                  <span>{f.icon}</span>
                  <span className="flex-1 text-left">{f.label}</span>
                  <span className={`w-8 h-4 rounded-full relative transition-all ${isOn ? 'bg-success' : 'bg-destructive/40'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isOn ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </FormCard>
  );
}
