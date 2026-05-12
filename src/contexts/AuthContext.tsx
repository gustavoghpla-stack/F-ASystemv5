import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { DB, logAcesso, initDefaultData, hashPassword, verifyPassword, isPasswordHash, loadAllFromGS, dispatchSyncComplete, type Usuario } from '@/lib/db';

// Intervalo de sincronização automática em background (60 segundos)
const AUTO_SYNC_INTERVAL_MS = 60_000;

interface Session {
  user: string;
  name: string;
  nivel: string;
}

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

// ── Busca usuários direto da planilha (sem precisar estar logado) ─────────────
async function fetchUsersFromGAS(): Promise<Usuario[]> {
  try {
    const cfg = DB.getObj('config');
    const url = cfg.gsUrl;
    if (!url) return [];
    const res = await fetch(url + '?acao=get_all', { redirect: 'follow' });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.users && Array.isArray(data.users)) return data.users as Usuario[];
  } catch { /* noop */ }
  return [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]       = useState<Session | null>(null);
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [lastSync, setLastSync]     = useState<Date | null>(null);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const refreshPermissions = useCallback(() => setPermissionsVersion(v => v + 1), []);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Background auto-sync: roda a cada 60s enquanto logado ───────────────────
  useEffect(() => {
    if (!session) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    const runSync = async () => {
      // Só sincroniza se a aba está visível (economiza requisições)
      if (document.visibilityState === 'hidden') return;
      const result = await loadAllFromGS();
      if (result.ok) setLastSync(new Date());
    };

    intervalRef.current = setInterval(runSync, AUTO_SYNC_INTERVAL_MS);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [session]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    await initDefaultData();

    // ── 1. Master login (verificação local — nunca depende da planilha) ─────
    if (email.toLowerCase() === 'feaviplimpeza@gmail.com') {
      const cfg = DB.getObj('config');
      const masterOk = cfg.masterPasswordHash
        ? await verifyPassword(password, cfg.masterPasswordHash)
        : false;
      if (masterOk) {
        const s = { user: 'master', name: 'Administrador Master', nivel: 'Master' };
        logAcesso('Login efetuado', s.name, s.user);
        setLoadingMsg('Sincronizando dados...');
        setLoading(true);
        await loadAllFromGS();
        setLoading(false);
        setSession(s);
        return null;
      }
      return 'Usuário ou senha incorretos.';
    }

    // ── 2. Verifica usuário no localStorage primeiro ──────────────────────────
    let users = DB.get<Usuario>('users');
    let found = users.find(x => x.email.toLowerCase() === email.toLowerCase());

    // ── 3. Se não encontrou localmente → busca da planilha antes de rejeitar ─
    // Isso resolve o problema de outros dispositivos onde o localStorage
    // está vazio mas o usuário existe na planilha Google.
    if (!found) {
      setLoadingMsg('Verificando credenciais na planilha...');
      setLoading(true);
      const remoteUsers = await fetchUsersFromGAS();
      setLoading(false);

      if (remoteUsers.length > 0) {
        // Salva usuários localmente para evitar nova busca
        DB.setNoSync('users', remoteUsers);
        users = remoteUsers;
        found = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      }
    }

    // ── 4. Verifica senha do usuário encontrado ───────────────────────────────
    if (found) {
      let passwordOk = false;

      if (!found.senha) {
        // Conta sem senha cadastrada — não permite login
        return 'Esta conta não possui senha configurada. Contate o administrador.';
      }

      if (isPasswordHash(found.senha)) {
        // Senha em hash SHA-256 (padrão atual)
        passwordOk = await verifyPassword(password, found.senha);
      } else {
        // Senha em texto puro (legado) — compara e migra para hash
        passwordOk = found.senha === password;
        if (passwordOk) {
          const newHash = await hashPassword(password);
          const updated = users.map(x => x.id === found!.id ? { ...x, senha: newHash } : x);
          DB.setNoSync('users', updated);
        }
      }

      if (passwordOk) {
        const s = { user: found.email, name: found.nome, nivel: found.nivel };
        logAcesso('Login efetuado', s.name, s.user);
        setLoadingMsg('Sincronizando dados...');
        setLoading(true);
        await loadAllFromGS();
        setLoading(false);
        setSession(s);
        return null;
      }

      return 'Senha incorreta.';
    }

    return 'Usuário não encontrado. Verifique o e-mail ou contate o administrador.';
  }, []);

  const logout = useCallback(() => {
    setSession(prev => {
      if (prev) logAcesso('Logout', prev.name, prev.user);
      return null;
    });
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
