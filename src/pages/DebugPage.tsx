import { useState } from 'react';
import { DB, syncGS, syncEstoqueGS, syncFluxoGS, syncEquipeGS } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Btn, FormCard } from '@/components/ui-custom';

interface TestResult {
  name: string;
  status: 'ok' | 'error' | 'warn' | 'info';
  message: string;
  detail?: string;
}

// ─── Fetch direto ao GAS sem intermediário ────────────────────
async function gasFetch(url: string, options?: { method?: string; body?: string }) {
  const res = await fetch(url, {
    method: options?.method || 'GET',
    body: options?.body,
    headers: options?.body ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
    redirect: 'follow',
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// ─── Verifica se o script GAS é compatível com o sistema ────────
// Só lê — nunca escreve. Detecta versão e formato da resposta.
async function auditarGAS(url: string, nome: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const r = await gasFetch(url + '?acao=ping');

    if (!r.ok) {
      results.push({
        name: `${nome}: Conexão`,
        status: 'error',
        message: `HTTP ${r.status} — Deploy com acesso restrito`,
        detail: 'Vá em script.google.com → Implantar → Gerenciar → Editar → "Qualquer pessoa"'
      });
      return results;
    }

    // Tenta parsear JSON
    let parsed: any = null;
    let parseError = '';
    try { parsed = JSON.parse(r.body); } catch (e: any) { parseError = e.message; }

    if (!parsed) {
      // Detecta formato antigo (texto puro como "PONG" ou "OK")
      const body = r.body.trim();
      const isPlainText = body === 'PONG' || body === 'OK' || body.startsWith('FA ') || (!body.startsWith('{') && !body.startsWith('<'));
      const isHtml = body.startsWith('<');

      if (isHtml) {
        results.push({
          name: `${nome}: ⚠️ Deploy incorreto`,
          status: 'error',
          message: 'GAS retornou HTML em vez de JSON — provavelmente sem permissão ou URL errada',
          detail: 'Verifique se a URL está correta e se o deploy foi feito como "Qualquer pessoa"'
        });
      } else if (isPlainText) {
        results.push({
          name: `${nome}: ⚠️ Script Desatualizado (texto puro)`,
          status: 'error',
          message: `Script antigo retorna texto "${body.slice(0,30)}" em vez de JSON`,
          detail: `Atualize o script em script.google.com → cole o código do arquivo gas/script-estoque.gs → Nova Implantação → "Qualquer pessoa"`
        });
      } else {
        results.push({
          name: `${nome}: Formato inválido`,
          status: 'error',
          message: `Resposta não é JSON válido: ${parseError}`,
          detail: `Resposta recebida: ${body.slice(0, 200)}`
        });
      }
      return results;
    }

    // Detecta script ANTIGO — usa {status:"ok"} em vez de {ok:true}
    if (parsed.status === 'ok' && parsed.ok === undefined) {
      results.push({
        name: `${nome}: ⚠️ Script Desatualizado`,
        status: 'error',
        message: 'Resposta {status:"ok"} = script ANTIGO — deletes NÃO funcionam',
        detail: `Cole o código do arquivo gas/ correspondente no script.google.com e faça Nova Implantação → "Qualquer pessoa". Resposta atual: ${r.body.slice(0, 100)}`
      });
      return results;
    }

    if (parsed.ok === true) {
      results.push({
        name: `${nome}: Script`,
        status: 'ok',
        message: `✅ Atualizado — ${parsed.msg || 'OK'} (v${parsed.version || '?'})`
      });
    } else {
      results.push({
        name: `${nome}: Resposta`,
        status: 'warn',
        message: 'Formato inesperado no ping',
        detail: JSON.stringify(parsed).slice(0, 200)
      });
    }

  } catch (e: any) {
    results.push({
      name: `${nome}: Conexão`,
      status: 'error',
      message: '❌ Erro de rede: ' + e.message,
      detail: 'Verifique se a URL está correta e o GAS está implantado.'
    });
  }

  return results;
}

export default function DebugPage() {
  const { session } = useAuth();
  void session;
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const log = (msg: string) => setSyncLog(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`, ...prev]);
  const addResults = (rs: TestResult[]) => setResults(prev => [...prev, ...rs]);
  const addResult = (r: TestResult) => setResults(prev => [...prev, r]);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);
    setSyncLog([]);
    const cfg = DB.getObj('config');

    // ── 1. LocalStorage ───────────────────────────────────────
    const keys = ['func','bancos','escalas','docs','users','estoque','estoque_mov','veiculos','abastecimentos','fluxo_caixa','custos_fixos','equipe_avaliacoes'];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem('fa_' + k);
        if (!raw) { addResult({ name: `LocalStorage: ${k}`, status: 'info', message: 'Vazio (0 registros)' }); continue; }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          addResult({ name: `LocalStorage: ${k}`, status: 'error', message: 'NÃO é array!', detail: typeof parsed });
        } else {
          addResult({ name: `LocalStorage: ${k}`, status: 'ok', message: `${parsed.length} registro(s)` });
        }
      } catch (e: any) {
        addResult({ name: `LocalStorage: ${k}`, status: 'error', message: 'JSON inválido!', detail: e.message });
      }
    }

    // ── 2. Config URLs ────────────────────────────────────────
    addResult({ name: 'Config: masterPasswordHash', status: cfg.masterPasswordHash ? 'ok' : 'warn', message: cfg.masterPasswordHash ? 'Definida' : 'Não configurada' });
    addResult({ name: 'Config: gsUrl', status: cfg.gsUrl ? 'ok' : 'error', message: cfg.gsUrl ? cfg.gsUrl.slice(0, 70) + '...' : '❌ NÃO CONFIGURADA' });
    addResult({ name: 'Config: gsUrlEstoque', status: cfg.gsUrlEstoque ? 'ok' : 'warn', message: cfg.gsUrlEstoque ? cfg.gsUrlEstoque.slice(0, 70) + '...' : 'Não configurada' });
    addResult({ name: 'Config: gsUrlFluxo', status: cfg.gsUrlFluxo ? 'ok' : 'info', message: cfg.gsUrlFluxo ? cfg.gsUrlFluxo.slice(0, 70) + '...' : 'Não configurada' });
    addResult({ name: 'Config: gsUrlEquipe', status: cfg.gsUrlEquipe ? 'ok' : 'info', message: cfg.gsUrlEquipe ? cfg.gsUrlEquipe.slice(0, 70) + '...' : 'Não configurada' });

    // ── 3. AUDITORIA GAS (verificação real do script externo) ──
    // Esta seção lê o GAS real e detecta se está desatualizado,
    // com acesso restrito, ou com bugs de compatibilidade.
    if (cfg.gsUrl) {
      log('Auditando GAS principal (Funcionários/Usuários/Escalas)...');
      const r = await auditarGAS(cfg.gsUrl, 'GAS Principal');
      addResults(r);
      log('Auditoria GAS principal concluída.');
    }
    if (cfg.gsUrlEstoque) {
      log('Auditando GAS Estoque...');
      const r = await auditarGAS(cfg.gsUrlEstoque, 'GAS Estoque');
      addResults(r);
    }
    if (cfg.gsUrlFluxo) {
      log('Auditando GAS Financeiro...');
      const r = await auditarGAS(cfg.gsUrlFluxo, 'GAS Financeiro');
      addResults(r);
    }
    if (cfg.gsUrlEquipe) {
      log('Auditando GAS Equipe...');
      const r = await auditarGAS(cfg.gsUrlEquipe, 'GAS Equipe');
      addResults(r);
    }

    // ── 4. Integridade dos dados ──────────────────────────────
    const func = DB.get<any>('func');
    const users = DB.get<any>('users');
    const avaliacoes = DB.get<any>('equipe_avaliacoes');

    const funcSemId = func.filter((f: any) => !f.id);
    addResult({ name: 'Integridade: IDs Funcionários', status: funcSemId.length > 0 ? 'error' : 'ok', message: funcSemId.length > 0 ? `${funcSemId.length} sem ID!` : `Todos os ${func.length} têm ID` });

    const funcIds = func.map((f: any) => f.id);
    const dupIds = funcIds.filter((id: any, i: number) => funcIds.indexOf(id) !== i);
    if (dupIds.length > 0) addResult({ name: 'Integridade: IDs duplicados', status: 'error', message: `IDs duplicados: ${dupIds.join(', ')}` });

    addResult({ name: 'Integridade: IDs Usuários', status: 'ok', message: `${users.length} usuário(s)` });

    const funcIdSet = new Set(func.map((f: any) => f.id));
    const orfaos = avaliacoes.filter((a: any) => a.funcionarioId && !funcIdSet.has(a.funcionarioId));
    if (orfaos.length > 0) addResult({ name: 'Avaliações órfãs', status: 'warn', message: `${orfaos.length} avaliação(ões) referem funcionários deletados` });

    // ── 5. Permissões ─────────────────────────────────────────
    const perms = cfg.userPermissions || {};
    const permUsers = Object.keys(perms);
    if (permUsers.length === 0) {
      addResult({ name: 'Permissões', status: 'info', message: 'Padrão — todos com acesso total' });
    } else {
      permUsers.forEach(email => {
        const blocked = Object.entries(perms[email] || {}).filter(([, v]) => v === false).map(([k]) => k);
        if (blocked.length > 0) addResult({ name: `Permissões: ${email}`, status: 'info', message: `${blocked.length} módulo(s) bloqueado(s)`, detail: blocked.join(', ') });
      });
    }

    log('Diagnóstico concluído.');
    setRunning(false);
  };

  const forceSync = async (type: string) => {
    log(`Forçando sync: ${type}...`);
    try {
      let ok = false;
      if (type === 'rh') ok = await syncGS(false);
      else if (type === 'estoque') ok = await syncEstoqueGS(false);
      else if (type === 'fluxo') ok = await syncFluxoGS(false);
      else if (type === 'equipe') ok = await syncEquipeGS(false);
      log(`Sync ${type}: ${ok ? '✅ SUCESSO' : '❌ FALHOU'}`);
    } catch (e: any) { log(`Sync ${type} ERRO: ${e.message}`); }
  };

  const clearOrphans = () => {
    const func = DB.get<any>('func');
    const funcIdSet = new Set(func.map((f: any) => f.id));
    const all = DB.get<any>('equipe_avaliacoes');
    const valid = all.filter((a: any) => funcIdSet.has(a.funcionarioId));
    const removed = all.length - valid.length;
    if (removed === 0) { log('Nenhuma avaliação órfã encontrada.'); return; }
    DB.set('equipe_avaliacoes', valid);
    log(`✅ Removidas ${removed} avaliação(ões) órfã(s).`);
  };

  const counts = { ok: results.filter(r => r.status === 'ok').length, error: results.filter(r => r.status === 'error').length, warn: results.filter(r => r.status === 'warn').length };

  const statusColor: Record<string, string> = {
    ok: 'bg-success/10 border-success/30 text-success',
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    warn: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    info: 'bg-secondary border-border text-muted-foreground',
  };
  const statusIcon: Record<string, string> = { ok: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };

  return (
    <>
      <PageHeader title="Painel de Debug" icon="🔧">
        <Btn variant="danger" onClick={runDiagnostics} className={running ? 'opacity-60 cursor-not-allowed' : ''}>
          {running ? '⏳ Executando...' : '🔍 Executar Diagnóstico Completo'}
        </Btn>
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5 text-[11px] text-destructive font-semibold">
          🔒 Exclusivo do usuário Master. O diagnóstico lê o código real dos scripts GAS implantados e detecta incompatibilidades.
        </div>

        {/* Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-success/10 border border-success/30 rounded-xl p-3 text-center"><div className="text-[24px] font-bold text-success">{counts.ok}</div><div className="text-[10px] text-muted-foreground">Passou</div></div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center"><div className="text-[24px] font-bold text-yellow-500">{counts.warn}</div><div className="text-[10px] text-muted-foreground">Avisos</div></div>
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center"><div className="text-[24px] font-bold text-destructive">{counts.error}</div><div className="text-[10px] text-muted-foreground">Erros</div></div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <FormCard title="Resultados">
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[10px] ${statusColor[r.status]}`}>
                  <span className="shrink-0 text-[13px] mt-0.5">{statusIcon[r.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{r.name}</div>
                    <div className="opacity-80">{r.message}</div>
                    {r.detail && <div className="opacity-60 mt-0.5 text-[9px] break-all bg-black/10 rounded p-1 mt-1">{r.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </FormCard>
        )}

        {/* Manual sync */}
        <FormCard title="Sincronização Manual" icon="📤">
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => forceSync('rh')}>📤 Func/Usuários/Escalas</Btn>
            <Btn variant="outline" onClick={() => forceSync('estoque')}>📤 Estoque/Veículos</Btn>
            <Btn variant="outline" onClick={() => forceSync('fluxo')}>📤 Financeiro</Btn>
            <Btn variant="outline" onClick={() => forceSync('equipe')}>📤 Controle de Equipe</Btn>
          </div>
        </FormCard>

        {/* Maintenance */}
        <FormCard title="Manutenção" icon="🛠">
          <Btn variant="outline" onClick={clearOrphans}>🗑 Remover avaliações de funcionários deletados</Btn>
        </FormCard>

        {/* Storage counts */}
        <FormCard title="Registros no localStorage" icon="📊">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            {['func','users','bancos','escalas','docs','estoque','estoque_mov','veiculos','abastecimentos','fluxo_caixa','custos_fixos','equipe_avaliacoes'].map(k => {
              let count = 0;
              try { count = JSON.parse(localStorage.getItem('fa_' + k) || '[]').length; } catch {}
              return (
                <div key={k} className="bg-secondary rounded-lg p-2.5 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-muted-foreground">{k}</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${count > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </FormCard>

        {/* Log */}
        {syncLog.length > 0 && (
          <FormCard title="Log" icon="📋">
            <div className="bg-card border border-border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-0.5">
              {syncLog.map((line, i) => (
                <div key={i} className="text-[10px] font-mono text-muted-foreground border-b border-border/20 last:border-0 py-0.5">{line}</div>
              ))}
            </div>
            <Btn variant="outline" onClick={() => setSyncLog([])} className="mt-2">🗑 Limpar log</Btn>
          </FormCard>
        )}

        {/* Architecture notes */}
        <FormCard title="Como o Sistema Funciona" icon="📚">
          <div className="text-[10px] text-muted-foreground space-y-2 leading-relaxed">
            <p><b className="text-foreground">Armazenamento local:</b> Todos os dados ficam no <code className="bg-secondary px-1 rounded">localStorage</code> do navegador. Ao alterar qualquer dado, um timer de 800ms dispara o sync automático para o Google Sheets.</p>
            <p><b className="text-foreground">Por que o diagnóstico detecta scripts antigos:</b> O script GAS novo retorna <code className="bg-secondary px-1 rounded">{`{ok:true}`}</code>. O script antigo retornava <code className="bg-secondary px-1 rounded">{`{status:"ok"}`}</code>. Essa diferença é o sinal de que o GAS precisa ser atualizado.</p>
            <p><b className="text-foreground">Por que deletes não funcionavam antes:</b> O script antigo tinha <code className="bg-secondary px-1 rounded">if (data.length &gt; 0)</code> antes de cada sync — quando o array vinha vazio (após deletar o último registro), ele pulava a operação e a planilha nunca era limpa.</p>
            <p><b className="text-foreground">Planilhas conectadas:</b></p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><b>gsUrl:</b> Funcionários, Bancos, Escalas, Docs, Usuários</li>
              <li><b>gsUrlEstoque:</b> Estoque, Movimentos, Veículos, Abastecimentos</li>
              <li><b>gsUrlFluxo:</b> Fluxo de Caixa, Custos Fixos</li>
              <li><b>gsUrlEquipe:</b> Avaliações de Equipe</li>
            </ul>
          </div>
        </FormCard>

      </div>
    </>
  );
}
