// localStorage-based database for F&A Higienizações

export interface Funcionario {
  id: number; nome: string; nasc: string; sexo: string; rh: string; estcivil: string;
  natural: string; uf: string; escol: string; pai: string; mae: string;
  end: string; compl: string; cep: string; cidade: string; bairro: string; ufend: string;
  tel: string; cel: string; email: string; cpf: string; rg: string; ufrg: string;
  emissrg: string; pis: string; ctps: string; seriectps: string; emissctps: string;
  titulo: string; secao: string; zona: string; cnh: string; catcnh: string; venccnh: string;
  reserv: string; empresa: string; cnpj: string; primemp: string; sindical: string;
  admissao: string; demissao: string; funcao: string; horario: string; salario: string;
  ticket: string; valdia: string; vtransp: string; valdiat: string; descvt: string;
  descvr: string; planosaude: string; exp: string; banco: string; agencia: string;
  conta: string; tipoconta: string; pix: string; tipopix: string; foto: string; cadastrado: string;
}

export interface BancoRegistro {
  id: number; funcId: number; funcNome: string; banco: string; codigo: string;
  agencia: string; conta: string; tipo: string; tipopix: string; chavepix: string;
  obs: string; cadastrado: string;
}

export interface Escala { id: number; desc: string; cadastrado: string; }
export interface Documento { id: number; desc: string; obrig: string; }

export interface Usuario {
  id: number; nome: string; email: string; senha: string; nivel: string;
  foto: string; cadastrado: string;
}

export interface AcessoLog { id: number; dt: string; nome: string; user: string; evento: string; }

export interface EstoqueItem {
  id: number; nome: string; categoria: string; unidade: string;
  qtdAtual: number; qtdMinima: number; localizacao: string; cadastrado: string;
}

export interface EstoqueMovimento {
  id: number; itemId: number; itemNome: string; tipo: 'entrada' | 'saida';
  qtd: number; motivo: string; responsavel: string; data: string; cadastrado: string;
}

export interface Veiculo {
  id: number; placa: string; modelo: string; ano: string; cor: string;
  combustivel: string; hodometroAtual: number; cadastrado: string;
}

export interface Abastecimento {
  id: number; veiculoId: number; veiculoPlaca: string; veiculoModelo: string;
  data: string; horario: string; hodometro: number; litros: number;
  valorLitro: number; valorTotal: number; combustivel: string; posto: string;
  motorista: string; obs: string; cadastrado: string;
}

export interface FluxoCaixaRegistro {
  id: number; tipo: 'entrada' | 'saida'; descricao: string; valor: number;
  data: string; categoria: string; obs: string; cadastrado: string;
}

export interface FluxoMeta {
  mes: number; ano: number; meta: number;
}

export interface UserPermissions {
  [email: string]: {
    funcionarios?: boolean; bancos?: boolean; escalas?: boolean; documentos?: boolean;
    usuarios?: boolean; estoque?: boolean; abastecimento?: boolean; fluxoCaixa?: boolean;
    relatorios?: boolean; config?: boolean; orcamento?: boolean;
    certificado?: boolean; equipe?: boolean;
  };
}

export interface EmpresaConfig {
  nome: string; cnpj: string; endereco: string; telefone: string;
  email: string; instagram: string;
}

export interface CertificadoConfig {
  nomeEmpresa: string; cnpj: string; endereco: string; telefone: string;
  responsavel: string; cargo: string; logoUrl: string;
}

export interface CustoFixo {
  id: number; descricao: string; valor: number; categoria: string; obs: string; cadastrado: string;
}

export interface AvaliacaoRegistro {
  id: number; funcionarioId: number; funcionarioNome: string;
  tipo: 'elogio' | 'reclamacao' | 'retrabalho' | 'retrabalho_add' | 'retrabalho_sub';
  motivo?: 'mau_odor' | 'manchas' | 'sujidade' | 'dano' | 'outros';
  descricao?: string;
  ordemServico?: string;
  origem?: 'cliente' | 'interno' | 'supervisor';
  data: string; cadastrado: string;
}

export interface AppConfig {
  gsUrl?: string;
  gsUrlEstoque?: string;
  gsUrlFluxo?: string;
  gsUrlEquipe?: string;
  masterRastro?: boolean;
  userPermissions?: UserPermissions;
  fluxoMetas?: FluxoMeta[];
  masterPasswordHash?: string;
  empresaConfig?: EmpresaConfig;
  certificadoConfig?: CertificadoConfig;
  receitaTotal?: number;
  cargosCustom?: string[];
}

export type DBKey = 'func' | 'bancos' | 'escalas' | 'docs' | 'users' | 'acessos' | 'estoque' | 'estoque_mov' | 'veiculos' | 'abastecimentos' | 'fluxo_caixa' | 'custos_fixos' | 'equipe_avaliacoes';

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _syncEstoqueTimer: ReturnType<typeof setTimeout> | null = null;
let _syncFluxoTimer: ReturnType<typeof setTimeout> | null = null;
let _syncEquipeTimer: ReturnType<typeof setTimeout> | null = null;

const RH_KEYS: DBKey[] = ['func', 'bancos', 'escalas', 'docs', 'users'];
const ESTOQUE_KEYS: DBKey[] = ['estoque', 'estoque_mov', 'veiculos', 'abastecimentos'];
const FLUXO_KEYS: DBKey[] = ['fluxo_caixa', 'custos_fixos'];
const EQUIPE_KEYS: DBKey[] = ['equipe_avaliacoes'];

function scheduleAutoSync(key: DBKey) {
  if (RH_KEYS.includes(key)) {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => { syncGS(true); }, 800);
  }
  if (ESTOQUE_KEYS.includes(key)) {
    if (_syncEstoqueTimer) clearTimeout(_syncEstoqueTimer);
    _syncEstoqueTimer = setTimeout(() => { syncEstoqueGS(true); }, 800);
  }
  if (FLUXO_KEYS.includes(key)) {
    if (_syncFluxoTimer) clearTimeout(_syncFluxoTimer);
    _syncFluxoTimer = setTimeout(() => { syncFluxoGS(true); }, 800);
  }
  if (EQUIPE_KEYS.includes(key)) {
    if (_syncEquipeTimer) clearTimeout(_syncEquipeTimer);
    _syncEquipeTimer = setTimeout(() => { syncEquipeGS(true); }, 800);
  }
}

export const DB = {
  get: <T>(k: DBKey): T[] => JSON.parse(localStorage.getItem('fa_' + k) || '[]'),
  set: <T>(k: DBKey, v: T[]) => {
    localStorage.setItem('fa_' + k, JSON.stringify(v));
    scheduleAutoSync(k);
  },
  /** Set without triggering auto-sync (used when loading from sheets to prevent loops). */
  setNoSync: <T>(k: DBKey, v: T[]) => {
    localStorage.setItem('fa_' + k, JSON.stringify(v));
  },
  getObj: (k: string): AppConfig => JSON.parse(localStorage.getItem('fa_' + k) || '{}'),
  setObj: (k: string, v: AppConfig) => localStorage.setItem('fa_' + k, JSON.stringify(v)),
};

// ─── Helpers para "demitidos" ─────────────────────────────────────────────

export function isDemitido(f: { demissao?: string } | undefined | null): boolean {
  return !!(f && f.demissao && String(f.demissao).trim() !== '');
}

export function getFuncionariosAtivos(): Funcionario[] {
  return DB.get<Funcionario>('func').filter(f => !isDemitido(f));
}

export function getFuncionariosDemitidos(): Funcionario[] {
  return DB.get<Funcionario>('func').filter(f => isDemitido(f));
}

// ─── Password utilities ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  throw new Error('Nenhum método de hash disponível. Execute o app via Electron.');
}

export async function verifyPassword(input: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(input);
  return computed === hash;
}

export function isPasswordHash(s: string): boolean {
  return /^[a-f0-9]{64}$/.test(s);
}

// ─────────────────────────────────────────────────────────────────────────────

export function fmtMoney(value: number | string | undefined): string {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMoneyBRL(value: number | string | undefined): string {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function nextId(key: DBKey): number {
  // Use timestamp + random suffix to guarantee uniqueness and never reuse deleted IDs.
  // This prevents avaliações from being incorrectly associated with newly created
  // funcionários that would otherwise inherit the ID of a deleted one.
  const d = DB.get<{ id: number }>(key);
  const maxExisting = d.length ? Math.max(...d.map(x => x.id)) : 0;
  const ts = Date.now();
  // If timestamp is already larger than any existing ID (always true for new IDs
  // after mid-2017), use timestamp. Otherwise, increment max.
  return ts > maxExisting ? ts : maxExisting + 1;
}

export function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    const p = d.split('-');
    if (p.length !== 3 || p.some(x => !x)) return d;
    return p[2] + '/' + p[1] + '/' + p[0];
  } catch { return d; }
}

export const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const defaultDocs = [
  { id: 1, desc: '02 Fotos 3x4 recentes', obrig: 'Sim' },
  { id: 2, desc: 'Cópia do CPF', obrig: 'Sim' },
  { id: 3, desc: 'Cópia do RG (Identidade)', obrig: 'Sim' },
  { id: 4, desc: 'Cópia do Título de Eleitor', obrig: 'Sim' },
  { id: 5, desc: 'Cópia do Comprovante de Residência', obrig: 'Sim' },
  { id: 6, desc: 'Cópia da Certidão de Nascimento ou Casamento', obrig: 'Sim' },
  { id: 7, desc: 'Cópia da Carteira de Trabalho (CTPS)', obrig: 'Sim' },
  { id: 8, desc: 'Cópia do PIS/PASEP', obrig: 'Sim' },
  { id: 9, desc: 'Cópia do Certificado de Reservista (masculino)', obrig: 'Sim' },
  { id: 10, desc: 'Atestado de Saúde Ocupacional (ASO)', obrig: 'Sim' },
  { id: 11, desc: 'Cópia da CNH (se motorista)', obrig: 'Não' },
  { id: 12, desc: 'Certidão de Nascimento dos filhos (menores de 14 anos)', obrig: 'Não' },
  { id: 13, desc: 'Comprovante de escolaridade', obrig: 'Não' },
];

export async function initDefaultData(): Promise<void> {
  if (!DB.get<Documento>('docs').length) DB.set('docs', defaultDocs);
  const cfg = DB.getObj('config');

  // Pre-populate GAS URLs if not yet configured
  let changed = false;
  if (!cfg.gsUrl) {
    cfg.gsUrl = 'https://script.google.com/macros/s/AKfycbxznq-7nsau1_mS7JTu8njGxxZfT7mkrb-sFNFrOGc69DnZ-y41CjLn0xNM5yGIikB-dg/exec';
    changed = true;
  }
  if (!cfg.gsUrlEstoque) {
    cfg.gsUrlEstoque = 'https://script.google.com/macros/s/AKfycbyJeFVZbQPkzhuSxt7tgbqCTm3MpApTWW_q9AOv6PqaqQpEkYqcA6q5CdX0EPfF-nGb0Q/exec';
    changed = true;
  }
  if (!cfg.gsUrlFluxo) {
    cfg.gsUrlFluxo = 'https://script.google.com/macros/s/AKfycbyfgvmZFGNlm3OjNOAeSOvXOg_KW1rmGNWQdfVEkNHDkHfHIvWxtYgS2hvaO5Qw2Bg/exec';
    changed = true;
  }
  if (!cfg.gsUrlEquipe) {
    cfg.gsUrlEquipe = 'https://script.google.com/macros/s/AKfycbzksTnbbooIKyNwWzrTGf3XrtXNnDnLlS_3Qlg9IYyB3dQMm-tNJcqJRR05G1JtjZ-Q5Q/exec';
    changed = true;
  }

  if (!cfg.masterPasswordHash) {
    try {
      cfg.masterPasswordHash = await hashPassword('@Line2122!');
      changed = true;
    } catch { /* noop */ }
  }

  if (changed) DB.setObj('config', cfg);
}

export function logAcesso(evento: string, nome: string, user: string) {
  const config = DB.getObj('config');
  if (user === 'master' && config.masterRastro === false) return;
  const logs = DB.get<AcessoLog>('acessos');
  logs.unshift({ id: Date.now(), dt: new Date().toLocaleString('pt-BR'), nome, user, evento });
  if (logs.length > 500) logs.splice(500);
  localStorage.setItem('fa_acessos', JSON.stringify(logs));
}

/**
 * Permission check.
 * - Master: tudo liberado.
 * - Outros: só libera quando o toggle correspondente for explicitamente true.
 *   Default = NEGADO (admin libera manualmente em Configurações → Permissões).
 */
export function hasPermission(userEmail: string, userNivel: string, feature: string): boolean {
  if (userNivel === 'Master') return true;
  const config = DB.getObj('config');
  const perms = config.userPermissions?.[userEmail];
  // No explicit permissions set → allowed by default (all features on)
  if (!perms) return true;
  const val = perms[feature as keyof typeof perms];
  // Undefined (not set) = allowed; only explicit false blocks access
  if (val === undefined) return true;
  return val as boolean;
}

// ─── HTTP fetch (native browser fetch — works on https:// without proxy) ─────

async function gsFetch(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(url, {
    method: options.method || 'GET',
    body: options.body,
    headers: options.body ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
    redirect: 'follow',
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

function describeHttpError(status: number, sheetName: string): string {
  if (status === 401 || status === 403) {
    return '❌ HTTP ' + status + ' — Acesso negado à planilha ' + sheetName + '.\n\n' +
      'Como corrigir:\n' +
      '1. Abra script.google.com e abra o script da planilha "' + sheetName + '"\n' +
      '2. Clique em "Implantar" → "Gerenciar implantações"\n' +
      '3. Clique no ícone de lápis (Editar) da implantação ativa\n' +
      '4. Em "Quem tem acesso" selecione: "Qualquer pessoa, mesmo anônima"\n' +
      '5. Em "Executar como" selecione: "Eu (sua conta)"\n' +
      '6. Salve, copie a NOVA URL e cole em Configurações → URL ' + sheetName;
  }
  return '❌ HTTP ' + status + ' ao sincronizar ' + sheetName + '.';
}

// ─────────────────────────────────────────────────────────────────────────────

export async function syncGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrl;
  if (!url) { if (!silent) alert('URL do Google Sheets não configurada!'); return false; }

  // Send full user object including senha (hashed) so login works on other devices
  const payload = {
    acao: 'sync_all',
    func: DB.get<Funcionario>('func'),
    bancos: DB.get<BancoRegistro>('bancos'),
    escalas: DB.get<Escala>('escalas'),
    docs: DB.get<Documento>('docs'),
    users: DB.get<Usuario>('users'),
    fluxo_caixa: DB.get<FluxoCaixaRegistro>('fluxo_caixa'),
  };
  try {
    const result = await gsFetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) { if (!silent) alert('✅ Sincronização concluída!'); return true; }
    if (!silent) alert(describeHttpError(result.status, 'Funcionários/RH'));
    return false;
  } catch (err: any) {
    if (!silent) alert('❌ Erro: ' + err.message);
    return false;
  }
}

export async function syncEstoqueGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEstoque;
  if (!url) { if (!silent) alert('URL da planilha de estoque não configurada!'); return false; }
  const payload = {
    acao: 'sync_estoque',
    estoque: DB.get<EstoqueItem>('estoque'),
    estoque_mov: DB.get<EstoqueMovimento>('estoque_mov'),
    veiculos: DB.get<Veiculo>('veiculos'),
    abastecimentos: DB.get<Abastecimento>('abastecimentos'),
  };
  try {
    const result = await gsFetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) { if (!silent) alert('✅ Estoque sincronizado!'); return true; }
    if (!silent) alert(describeHttpError(result.status, 'Estoque/Abastecimento'));
    return false;
  } catch (err: any) {
    if (!silent) alert('❌ Erro: ' + err.message);
    return false;
  }
}

export async function loadFromEstoqueGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEstoque;
  if (!url) { if (!silent) alert('URL da planilha de estoque não configurada!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=get_all');
    if (!result.ok) { if (!silent) alert(describeHttpError(result.status, 'Estoque')); return false; }
    let data: any;
    try { data = JSON.parse(result.body); } catch {
      if (!silent) alert('❌ Resposta inválida da planilha (JSON malformado)!');
      return false;
    }
    if (data.estoque) DB.setNoSync('estoque', data.estoque);
    if (data.estoque_mov) DB.setNoSync('estoque_mov', data.estoque_mov);
    if (data.veiculos) DB.setNoSync('veiculos', data.veiculos);
    if (data.abastecimentos) DB.setNoSync('abastecimentos', data.abastecimentos);
    if (!silent) alert('✅ Dados de estoque carregados!');
    window.location.reload();
    return true;
  } catch (err: any) {
    if (!silent) alert('❌ Erro: ' + err.message);
    return false;
  }
}

export async function testEstoqueGSConnection(): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEstoque;
  if (!url) { alert('Configure a URL da planilha de estoque primeiro!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=ping');
    if (result.ok) { alert('✅ Conexão Estoque OK!\nResposta: ' + result.body); return true; }
    alert(describeHttpError(result.status, 'Estoque')); return false;
  } catch (err: any) {
    alert('❌ Não foi possível conectar: ' + err.message); return false;
  }
}

export async function testGSConnection(): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrl;
  if (!url) { alert('Configure a URL primeiro!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=ping');
    if (result.ok) { alert('✅ Conexão OK!\nResposta: ' + result.body); return true; }
    alert(describeHttpError(result.status, 'RH')); return false;
  } catch (err: any) {
    alert('❌ Não foi possível conectar: ' + err.message); return false;
  }
}

export async function testFluxoGSConnection(): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlFluxo;
  if (!url) { alert('Configure a URL financeira primeiro!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=ping');
    if (result.ok) { alert('✅ Conexão Financeira OK!\nResposta: ' + result.body); return true; }
    alert(describeHttpError(result.status, 'Financeiro')); return false;
  } catch (err: any) { alert('❌ Erro: ' + err.message); return false; }
}

export async function testEquipeGSConnection(): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEquipe;
  if (!url) { alert('Configure a URL de equipe primeiro!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=ping');
    if (result.ok) { alert('✅ Conexão Equipe OK!\nResposta: ' + result.body); return true; }
    alert(describeHttpError(result.status, 'Equipe')); return false;
  } catch (err: any) { alert('❌ Erro: ' + err.message); return false; }
}

export async function loadFromGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrl;
  if (!url) { if (!silent) alert('URL do Google Sheets não configurada!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=get_all');
    if (!result.ok) { if (!silent) alert(describeHttpError(result.status, 'RH')); return false; }
    let data: any;
    try { data = JSON.parse(result.body); } catch {
      if (!silent) alert('❌ Resposta inválida da planilha (JSON malformado)!');
      return false;
    }
    if (data.func) DB.setNoSync('func', data.func);
    if (data.bancos) DB.setNoSync('bancos', data.bancos);
    if (data.escalas) DB.setNoSync('escalas', data.escalas);
    if (data.docs) DB.setNoSync('docs', data.docs);
    if (data.users) DB.setNoSync('users', data.users);
    if (data.fluxo_caixa) DB.setNoSync('fluxo_caixa', data.fluxo_caixa);
    if (!silent) alert('✅ Dados carregados da planilha!');
    window.location.reload();
    return true;
  } catch (err: any) {
    if (!silent) alert('❌ Erro: ' + err.message);
    return false;
  }
}

export async function syncFluxoGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlFluxo;
  if (!url) { if (!silent) alert('URL da planilha financeira não configurada!'); return false; }
  const cfg = DB.getObj('config');
  const payload = {
    acao: 'sync_fluxo',
    fluxo_caixa: DB.get<FluxoCaixaRegistro>('fluxo_caixa'),
    custos_fixos: DB.get<CustoFixo>('custos_fixos'),
    receita_total: cfg.receitaTotal ?? 0,
  };
  try {
    const result = await gsFetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) { if (!silent) alert('✅ Financeiro sincronizado!'); return true; }
    if (!silent) alert(describeHttpError(result.status, 'Financeiro')); return false;
  } catch (err: any) { if (!silent) alert('❌ Erro: ' + err.message); return false; }
}

export async function loadFromFluxoGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlFluxo;
  if (!url) { if (!silent) alert('URL da planilha financeira não configurada!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=get_all');
    if (!result.ok) { if (!silent) alert(describeHttpError(result.status, 'Financeiro')); return false; }
    let data: any;
    try { data = JSON.parse(result.body); } catch { if (!silent) alert('❌ Resposta inválida!'); return false; }
    if (data.fluxo_caixa) DB.setNoSync('fluxo_caixa', data.fluxo_caixa);
    if (data.custos_fixos) DB.setNoSync('custos_fixos', data.custos_fixos);
    if (data.receita_total !== undefined) {
      const cfg = DB.getObj('config'); cfg.receitaTotal = data.receita_total; DB.setObj('config', cfg);
    }
    if (!silent) alert('✅ Dados financeiros carregados!');
    window.location.reload();
    return true;
  } catch (err: any) { if (!silent) alert('❌ Erro: ' + err.message); return false; }
}

export async function syncEquipeGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEquipe;
  if (!url) { if (!silent) alert('URL da planilha de equipes não configurada!'); return false; }
  const payload = {
    acao: 'sync_equipe',
    equipe_avaliacoes: DB.get<AvaliacaoRegistro>('equipe_avaliacoes'),
  };
  try {
    const result = await gsFetch(url, { method: 'POST', body: JSON.stringify(payload) });
    if (result.ok) { if (!silent) alert('✅ Equipe sincronizada!'); return true; }
    if (!silent) alert(describeHttpError(result.status, 'Controle de Equipe')); return false;
  } catch (err: any) { if (!silent) alert('❌ Erro: ' + err.message); return false; }
}

export async function loadFromEquipeGS(silent = false): Promise<boolean> {
  const url = (DB.getObj('config') || {}).gsUrlEquipe;
  if (!url) { if (!silent) alert('URL da planilha de equipes não configurada!'); return false; }
  try {
    const result = await gsFetch(url + '?acao=get_all');
    if (!result.ok) { if (!silent) alert(describeHttpError(result.status, 'Equipe')); return false; }
    let data: any;
    try { data = JSON.parse(result.body); } catch { if (!silent) alert('❌ Resposta inválida!'); return false; }
    if (data.equipe_avaliacoes) DB.setNoSync('equipe_avaliacoes', data.equipe_avaliacoes);
    if (!silent) alert('✅ Dados de equipe carregados!');
    window.location.reload();
    return true;
  } catch (err: any) { if (!silent) alert('❌ Erro: ' + err.message); return false; }
}

export function exportBackupLocal() {
  const backup = {
    func: DB.get<Funcionario>('func'),
    bancos: DB.get<BancoRegistro>('bancos'),
    escalas: DB.get<Escala>('escalas'),
    docs: DB.get<Documento>('docs'),
    users: DB.get<Usuario>('users'),
    estoque: DB.get<EstoqueItem>('estoque'),
    estoque_mov: DB.get<EstoqueMovimento>('estoque_mov'),
    veiculos: DB.get<Veiculo>('veiculos'),
    abastecimentos: DB.get<Abastecimento>('abastecimentos'),
    fluxo_caixa: DB.get<FluxoCaixaRegistro>('fluxo_caixa'),
    acessos: DB.get<AcessoLog>('acessos'),
    config: DB.getObj('config'),
    exportado: new Date().toISOString(),
  };
  localStorage.setItem('fa_backup_offline', JSON.stringify(backup));
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'FA_backup_offline_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  return backup;
}

export function getBackupOffline() {
  const raw = localStorage.getItem('fa_backup_offline');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function deleteBackupOffline() {
  localStorage.removeItem('fa_backup_offline');
}

// ─── Carrega todas as planilhas ao fazer login ────────────────
// Não exibe alertas, não recarrega a página — só atualiza os dados
// localmente via setNoSync. Ideal para chamar após login bem-sucedido.
export async function loadAllFromGS(): Promise<{ ok: boolean; errors: string[] }> {
  const cfg = DB.getObj('config');
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  // RH (funcionários, usuários, bancos, escalas, docs)
  if (cfg.gsUrl) {
    tasks.push((async () => {
      try {
        const r = await gsFetch(cfg.gsUrl + '?acao=get_all');
        if (r.ok) {
          const d = JSON.parse(r.body);
          if (d.func)        DB.setNoSync('func',        d.func);
          if (d.bancos)      DB.setNoSync('bancos',      d.bancos);
          if (d.escalas)     DB.setNoSync('escalas',     d.escalas);
          if (d.docs)        DB.setNoSync('docs',        d.docs);
          if (d.users)       DB.setNoSync('users',       d.users);
          if (d.fluxo_caixa) DB.setNoSync('fluxo_caixa', d.fluxo_caixa);
        } else {
          errors.push('RH: HTTP ' + r.status);
        }
      } catch (e: any) { errors.push('RH: ' + e.message); }
    })());
  }

  // Estoque
  if (cfg.gsUrlEstoque) {
    tasks.push((async () => {
      try {
        const r = await gsFetch(cfg.gsUrlEstoque + '?acao=get_all');
        if (r.ok) {
          const d = JSON.parse(r.body);
          if (d.estoque)        DB.setNoSync('estoque',        d.estoque);
          if (d.estoque_mov)    DB.setNoSync('estoque_mov',    d.estoque_mov);
          if (d.veiculos)       DB.setNoSync('veiculos',       d.veiculos);
          if (d.abastecimentos) DB.setNoSync('abastecimentos', d.abastecimentos);
        } else {
          errors.push('Estoque: HTTP ' + r.status);
        }
      } catch (e: any) { errors.push('Estoque: ' + e.message); }
    })());
  }

  // Financeiro
  if (cfg.gsUrlFluxo) {
    tasks.push((async () => {
      try {
        const r = await gsFetch(cfg.gsUrlFluxo + '?acao=get_all');
        if (r.ok) {
          const d = JSON.parse(r.body);
          if (d.fluxo_caixa)  DB.setNoSync('fluxo_caixa',  d.fluxo_caixa);
          if (d.custos_fixos) DB.setNoSync('custos_fixos', d.custos_fixos);
        } else {
          errors.push('Financeiro: HTTP ' + r.status);
        }
      } catch (e: any) { errors.push('Financeiro: ' + e.message); }
    })());
  }

  // Equipe
  if (cfg.gsUrlEquipe) {
    tasks.push((async () => {
      try {
        const r = await gsFetch(cfg.gsUrlEquipe + '?acao=get_all');
        if (r.ok) {
          const d = JSON.parse(r.body);
          if (d.equipe_avaliacoes) DB.setNoSync('equipe_avaliacoes', d.equipe_avaliacoes);
        } else {
          errors.push('Equipe: HTTP ' + r.status);
        }
      } catch (e: any) { errors.push('Equipe: ' + e.message); }
    })());
  }

  // Aguarda todas em paralelo
  await Promise.allSettled(tasks);

  return { ok: errors.length === 0, errors };
}
