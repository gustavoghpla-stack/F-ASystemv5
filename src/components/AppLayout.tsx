import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DB } from '@/lib/db';
import logoImg from '@/assets/logo.png';

interface NavItem {
  id: string; icon: string; label: string; section?: string;
  masterOnly?: boolean; feature?: string;
}

const allNavItems: NavItem[] = [
  { section: 'Principal',   id: 'menu',         icon: '🏠', label: 'Menu Principal' },
  { section: 'Cadastros',   id: 'funcionarios',  icon: '👤', label: 'Funcionários',       feature: 'funcionarios' },
  {                         id: 'bancos',         icon: '🏦', label: 'Bancos / PIX',       feature: 'bancos' },
  {                         id: 'escalas',        icon: '📅', label: 'Escalas',            feature: 'escalas' },
  {                         id: 'documentos',     icon: '📄', label: 'Documentos',         feature: 'documentos' },
  {                         id: 'usuarios',       icon: '👥', label: 'Usuários',           feature: 'usuarios' },
  { section: 'Operações',   id: 'estoque',        icon: '📦', label: 'Estoque',            feature: 'estoque' },
  {                         id: 'abastecimento',  icon: '⛽', label: 'Abastecimento',      feature: 'abastecimento' },
  { section: 'Financeiro',  id: 'fluxo-caixa',   icon: '💰', label: 'Fluxo de Caixa',    feature: 'fluxoCaixa' },
  {                         id: 'orcamento',      icon: '📋', label: 'Orçamento',          feature: 'orcamento' },
  {                         id: 'certificado',    icon: '📜', label: 'Certificado',        feature: 'certificado' },
  { section: 'Equipe',      id: 'equipe',         icon: '⭐', label: 'Controle de Equipe', feature: 'equipe' },
  { section: 'Relatórios',  id: 'rel-func',       icon: '📊', label: 'Funcionários',       feature: 'relatorios' },
  {                         id: 'rel-aniv',       icon: '🎂', label: 'Aniversariantes',    feature: 'relatorios' },
  {                         id: 'rel-users',      icon: '🧾', label: 'Usuários',           feature: 'relatorios' },
  {                         id: 'rel-acessos',    icon: '🔒', label: 'Acessos',            masterOnly: true },
  { section: 'Sistema',     id: 'config',         icon: '⚙️', label: 'Configurações',      masterOnly: true },
  {                         id: 'debug',          icon: '🔧', label: 'Debug',              masterOnly: true },
];

interface Props {
  currentPage: string; onNavigate: (page: string) => void;
  theme: 'dark' | 'light' | 'orange'; onCycleTheme: () => void; children: ReactNode;
}

export default function AppLayout({ currentPage, onNavigate, theme, onCycleTheme, children }: Props) {
  const { session, logout, permissionsVersion } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close mobile menu on navigation
  const navigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const userNivel = session?.nivel || 'Operador';
  const userEmail = session?.user || '';

  const navItems = useMemo(() => {
    const userPerms = DB.getObj('config').userPermissions?.[userEmail] ?? {};
    return allNavItems.filter(item => {
      if (item.masterOnly) return userNivel === 'Master';
      if (userNivel === 'Master') return true;
      if (item.feature) {
        const val = userPerms[item.feature as keyof typeof userPerms];
        return val !== false;
      }
      return true;
    });
  }, [userNivel, userEmail, permissionsVersion]);

  // Bottom nav quick items for mobile (most used)
  const bottomNavItems = navItems.filter(i =>
    ['menu','funcionarios','estoque','fluxo-caixa','equipe'].includes(i.id)
  ).slice(0, 5);

  // ── MOBILE LAYOUT ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        {/* Mobile top bar */}
        <div className="bg-sidebar border-b border-sidebar-border flex items-center gap-3 px-4 h-[54px] shrink-0 z-30">
          <button onClick={() => setMobileMenuOpen(true)}
            className="text-[22px] text-primary p-1 -ml-1">☰</button>
          <img src={logoImg} alt="F&A" className="w-7 h-7 rounded-full object-cover" />
          <span className="font-heading text-[13px] font-bold text-primary flex-1 truncate">F&A System Web</span>
          <button onClick={onCycleTheme} className="text-[18px] p-1">
            {theme === 'dark' ? '☀️' : theme === 'light' ? '🟠' : '🌙'}
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>

        {/* Bottom nav */}
        <div className="bg-sidebar border-t border-sidebar-border flex shrink-0 z-30 safe-bottom">
          {bottomNavItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-semibold transition-colors
                ${currentPage === item.id ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className="text-[20px]">{item.icon}</span>
              <span className="truncate w-full text-center px-1">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[9px] font-semibold text-muted-foreground">
            <span className="text-[20px]">⋯</span>
            <span>Mais</span>
          </button>
        </div>

        {/* Mobile slide-out menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="flex-1 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
            {/* Drawer */}
            <div className="w-[280px] bg-sidebar flex flex-col h-full overflow-hidden animate-slide-up shadow-2xl">
              {/* Drawer header */}
              <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
                <img src={logoImg} alt="F&A" className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-primary">F&A System Web</div>
                  <div className="text-[10px] text-muted-foreground truncate">{session?.name} · {session?.nivel}</div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground text-[22px] p-1">✕</button>
              </div>

              {/* Nav items */}
              <div className="flex-1 overflow-y-auto py-2">
                {navItems.map((item, i) => (
                  <div key={item.id}>
                    {item.section && (
                      <div className="px-4 pt-4 pb-1 text-[9px] font-bold tracking-[2px] text-muted-foreground uppercase">{item.section}</div>
                    )}
                    <button onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 py-3 px-4 text-[13px] font-medium transition-colors border-l-2 text-left
                        ${currentPage === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-primary font-semibold' : 'text-muted-foreground border-l-transparent hover:bg-sidebar-accent'}`}>
                      <span className="text-[18px] w-6 text-center shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Drawer footer */}
              <div className="p-4 border-t border-sidebar-border space-y-2">
                <div className="flex gap-2">
                  <button onClick={onCycleTheme}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold bg-secondary border border-border text-primary">
                    {theme === 'dark' ? '☀️ Claro' : theme === 'light' ? '🟠 Laranja' : '🌙 Escuro'}
                  </button>
                  <button onClick={() => { if (confirm('Deseja sair?')) logout(); }}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold bg-destructive text-destructive-foreground">
                    🚪 Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-row">
      <div className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 overflow-hidden ${collapsed ? 'w-[54px] min-w-[54px]' : 'w-[224px] min-w-[224px]'}`}>
        <div className="p-3.5 border-b border-sidebar-border flex items-center gap-2.5 h-[62px] shrink-0">
          <div className="w-[34px] h-[34px] rounded-full overflow-hidden shrink-0">
            <img src={logoImg} alt="F&A" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-heading text-[13px] font-bold text-primary tracking-[0.5px]">F&A System Web</div>
              <div className="text-[8px] text-muted-foreground">Bacamarte Dev Company</div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {navItems.map((item, i) => (
            <div key={item.id}>
              {item.section && !collapsed && (
                <div className="px-3.5 pt-3.5 pb-1 text-[9px] font-bold tracking-[2px] text-muted-foreground uppercase whitespace-nowrap">{item.section}</div>
              )}
              {item.section && collapsed && i > 0 && <div className="h-px bg-sidebar-border mx-2 my-1.5" />}
              <div onClick={() => navigate(item.id)}
                className={`flex items-center gap-2.5 py-2 px-3.5 cursor-pointer text-[12px] font-medium whitespace-nowrap border-l-2 transition-all
                  ${currentPage === item.id ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-primary font-semibold' : 'text-muted-foreground border-l-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <span className="text-[15px] shrink-0 w-5 text-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-gold-deep flex items-center justify-center font-bold text-[12px] text-primary-foreground shrink-0 overflow-hidden">
              {session?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold truncate">{session?.name}</div>
                <div className="text-[9px] text-muted-foreground">{session?.nivel}</div>
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={onCycleTheme}
              className="flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 bg-secondary border border-border text-primary hover:opacity-80">
              <span>{theme === 'dark' ? '☀️' : theme === 'light' ? '🟠' : '🌙'}</span>
              {!collapsed && <span>{theme === 'dark' ? 'Claro' : theme === 'light' ? 'Laranja' : 'Escuro'}</span>}
            </button>
            <button onClick={() => { if (confirm('Deseja sair do sistema?')) logout(); }}
              className="flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 bg-destructive text-destructive-foreground hover:opacity-80">
              <span>🚪</span>{!collapsed && <span>Sair</span>}
            </button>
          </div>
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full bg-transparent text-muted-foreground text-[10px] p-1 text-center cursor-pointer mt-1.5 hover:text-primary">
            {collapsed ? '▶' : '◀ Recolher'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col bg-background">{children}</div>
    </div>
  );
}
