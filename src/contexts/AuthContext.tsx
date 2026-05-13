import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { DB, logAcesso, initDefaultData, hashPassword, verifyPassword, isPasswordHash, loadAllFromGS, type Usuario } from '@/lib/db';

// ── Configurações de sessão ───────────────────────────────────────────────────
const AUTO_SYNC_INTERVAL_MS  = 30_000;       // sync a cada 30 segundos
const SESSION_TIMEOUT_MS     = 60 * 60_000;  // deslogar após 1 hora
const SESSION_STORAGE_KEY    = 'fa_session'; // chave no localStorage

interface Session {
  user: string;
  name: string;
  nivel: string;
}

interface StoredSession extends Session {
  loginAt: number; // timestamp do login
}

// ── Helpers de sessão persistente ────────────────────────────────────────────

function saveSession(s: Session): void {
  const stored: StoredSession = { ...s, loginAt: Date.now() };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredSession = JSON.parse(raw);
    // Verifica se a sessão ainda é válida (menos de 1 hora)
    if (Date.now() - stored.loginAt > SESSION_TIMEOUT_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return { user: stored.user, name: stored.name, nivel: stored.nivel };
  } catch {
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getSessionAge(): number {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return Infinity;
    const stored: StoredSession = JSON.parse(raw);
    return Date.now() - stored.loginAt;
  } catch {
    return Infinity;
  }
}

// ── Busca usuários direto da planilha ────────────────────────────────────────
async function fetchUsersFromGAS(): Promise<Usuario[]> {
  try {
    const url = DB.getObj('config').gsUrl;
    if (!url) return [];
    const res = await fetch(url + '?acao=get_all', { redirect: 'follow' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.users)) return [];
    // Deserialize permissions_json → permissions object
    return data.users.map((u: any) => {
      const parsed = { ...u };
      if (u.permissions_json && typeof u.permissions_json === 'string' && u.permissions_json.startsWith('{')) {
        try { parsed.permissions = JSON.parse(u.permissions_json); } catch { /* noop */ }
      }
      delete parsed.permissions_json;
      return parsed as Usuario;
    });
  } catch { return []; }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  loadingMsg: string;
  lastSync: Date | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  permissionsVersion: number;
  refreshPermissions: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restaura sessão do localStorage ao montar (sobrevive a F5)
  const [session, setSession]       = useState<Session | null>(() => loadSession());
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [lastSync, setLastSync]     = useState<Date | null>(null);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const refreshPermissions = useCallback(() => setPermissionsVersion(v => v + 1), []);
  const syncIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutCheckRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Ao restaurar sessão do localStorage → sincroniza com as planilhas ───────
  useEffect(() => {
    if (!session) return;
    initDefaultData();
    setLoadingMsg('Restaurando sessão...');
    setLoading(true);
    loadAllFromGS().then(() => {
      setLoading(false);
      setLastSync(new Date());
    });
  // Roda apenas uma vez ao montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-sync a cada 60s enquanto logado ─────────────────────────────────────
  useEffect(() => {
    if (!session) {
      if (syncIntervalRef.current)  { clearInterval(syncIntervalRef.current);  syncIntervalRef.current  = null; }
      if (timeoutCheckRef.current)  { clearInterval(timeoutCheckRef.current);  timeoutCheckRef.current  = null; }
      return;
    }

    // Sync periódico
    const runSync = async () => {
      if (document.visibilityState === 'hidden') return;
      const result = await loadAllFromGS();
      if (result.ok) setLastSync(new Date());
    };
    syncIntervalRef.current = setInterval(runSync, AUTO_SYNC_INTERVAL_MS);

    // Verifica expiração de sessão a cada minuto
    timeoutCheckRef.current = setInterval(() => {
      const age = getSessionAge();
      if (age > SESSION_TIMEOUT_MS) {
        logAcesso('Sessão expirada (1h)', session.name, session.user);
        clearSession();
        setSession(null);
      }
    }, 60_000);

    return () => {
      if (syncIntervalRef.current)  { clearInterval(syncIntervalRef.current);  syncIntervalRef.current  = null; }
      if (timeoutCheckRef.current)  { clearInterval(timeoutCheckRef.current);  timeoutCheckRef.current  = null; }
    };
  }, [session]);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    await initDefaultData();

    // 1. Master
    if (email.toLowerCase() === 'feaviplimpeza@gmail.com') {
      const cfg = DB.getObj('config');
      const ok  = cfg.masterPasswordHash
        ? await verifyPassword(password, cfg.masterPasswordHash)
        : false;
      if (ok) {
        const s = { user: 'master', name: 'Administrador Master', nivel: 'Master' };
        logAcesso('Login efetuado', s.name, s.user);
        setLoadingMsg('Sincronizando dados...');
        setLoading(true);
        await loadAllFromGS();
        setLoading(false);
        saveSession(s);
        setSession(s);
        setLastSync(new Date());
        return null;
      }
      return 'Usuário ou senha incorretos.';
    }

    // 2. Busca local
    let users = DB.get<Usuario>('users');
    let found = users.find(x => x.email.toLowerCase() === email.toLowerCase());

    // 3. Se não encontrou → busca na planilha
    if (!found) {
      setLoadingMsg('Verificando credenciais na planilha...');
      setLoading(true);
      const remote = await fetchUsersFromGAS();
      setLoading(false);
      if (remote.length > 0) {
        DB.setNoSync('users', remote);
        users = remote;
        found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      }
    }

    // 4. Verifica senha
    if (found) {
      if (!found.senha) return 'Conta sem senha configurada. Contate o administrador.';

      let ok = false;
      if (isPasswordHash(found.senha)) {
        ok = await verifyPassword(password, found.senha);
      } else {
        ok = found.senha === password;
        if (ok) {
          const hash = await hashPassword(password);
          DB.setNoSync('users', users.map(x => x.id === found!.id ? { ...x, senha: hash } : x));
        }
      }

      if (ok) {
        const s = { user: found.email, name: found.nome, nivel: found.nivel };
        logAcesso('Login efetuado', s.name, s.user);
        setLoadingMsg('Sincronizando dados...');
        setLoading(true);
        await loadAllFromGS();
        setLoading(false);
        saveSession(s);
        setSession(s);
        setLastSync(new Date());
        return null;
      }
      return 'Senha incorreta.';
    }

    return 'Usuário não encontrado. Verifique o e-mail ou contate o administrador.';
  }, []);

  // ── Logout manual ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setSession(prev => {
      if (prev) logAcesso('Logout manual', prev.name, prev.user);
      return null;
    });
    clearSession();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, loadingMsg, lastSync, login, logout, permissionsVersion, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
