import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/db';
import LoginScreen from '@/components/LoginScreen';
import bacamarteLogoImg from '@/assets/bacamarte-logo.png';
import AppLayout from '@/components/AppLayout';
import MenuPage from '@/pages/MenuPage';
import FuncionariosPage from '@/pages/FuncionariosPage';
import BancosPage from '@/pages/BancosPage';
import EscalasPage from '@/pages/EscalasPage';
import DocumentosPage from '@/pages/DocumentosPage';
import UsuariosPage from '@/pages/UsuariosPage';
import EstoquePage from '@/pages/EstoquePage';
import AbastecimentoPage from '@/pages/AbastecimentoPage';
import FluxoCaixaPage from '@/pages/FluxoCaixaPage';
import { RelFuncPage, RelAnivPage, RelUsersPage, RelAcessosPage } from '@/pages/RelatoriosPages';
import ConfigPage from '@/pages/ConfigPage';
import OrcamentoPage from '@/pages/OrcamentoPage';
import CertificadoPage from '@/pages/CertificadoPage';
import EquipePage from '@/pages/EquipePage';
import DebugPage from '@/pages/DebugPage';

const PAGE_FEATURE: Record<string, string> = {
  'funcionarios': 'funcionarios',
  'bancos': 'bancos',
  'escalas': 'escalas',
  'documentos': 'documentos',
  'usuarios': 'usuarios',
  'estoque': 'estoque',
  'abastecimento': 'abastecimento',
  'fluxo-caixa': 'fluxoCaixa',
  'rel-func': 'relatorios',
  'rel-aniv': 'relatorios',
  'rel-users': 'relatorios',
  'rel-acessos': 'relatorios',
  'config': 'config',
  'orcamento': 'orcamento',
  'certificado': 'certificado',
  'equipe': 'equipe',
  'debug': '__masterOnly__',
};

export default function Index() {
  const { session, loading, permissionsVersion } = useAuth();
  const [currentPage, setCurrentPage] = useState('menu');
  const [theme, setTheme] = useState<'dark' | 'light' | 'orange'>('dark');

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'orange' : 'dark';
    setTheme(next);
    document.body.classList.remove('light', 'orange');
    if (next !== 'dark') document.body.classList.add(next);
  };

  // Loading screen while syncing sheets on login
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-5 px-4">
        <img
          src={bacamarteLogoImg}
          alt="Bacamarte Dev Company"
          className="h-16 sm:h-20 object-contain animate-pulse"
          style={{ filter: 'drop-shadow(0 0 12px hsl(var(--primary)/0.4))' }}
        />
        <div className="text-center space-y-1.5">
          <div className="text-[16px] font-bold text-primary">Carregando dados...</div>
          <div className="text-[12px] text-muted-foreground">Sincronizando com as planilhas Google</div>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  const navigate = (page: string) => {
    // Master-only pages
    if (['config', 'rel-acessos', 'debug'].includes(page) && session.nivel !== 'Master') return;
    // For all other pages: check explicit permission only
    const feature = PAGE_FEATURE[page];
    if (feature && feature !== '__masterOnly__' && !hasPermission(session.user, session.nivel, feature)) return;
    setCurrentPage(page);
  };

  // If current page permission was revoked, fall back to menu
  const effectivePage = (() => {
    if (['config', 'rel-acessos', 'debug'].includes(currentPage) && session.nivel !== 'Master') return 'menu';
    const feature = PAGE_FEATURE[currentPage];
    if (feature && feature !== '__masterOnly__' && !hasPermission(session.user, session.nivel, feature)) return 'menu';
    return currentPage;
  })();

  // permissionsVersion is referenced to trigger re-evaluation when permissions change
  void permissionsVersion;

  const pages: Record<string, JSX.Element> = {
    'menu': <MenuPage onNavigate={navigate} />,
    'funcionarios': <FuncionariosPage />,
    'bancos': <BancosPage />,
    'escalas': <EscalasPage />,
    'documentos': <DocumentosPage />,
    'usuarios': <UsuariosPage />,
    'estoque': <EstoquePage />,
    'abastecimento': <AbastecimentoPage />,
    'fluxo-caixa': <FluxoCaixaPage />,
    'rel-func': <RelFuncPage />,
    'rel-aniv': <RelAnivPage />,
    'rel-users': <RelUsersPage />,
    'rel-acessos': <RelAcessosPage />,
    'config': <ConfigPage />,
    'orcamento': <OrcamentoPage />,
    'certificado': <CertificadoPage />,
    'equipe': <EquipePage />,
    'debug': <DebugPage />,
  };

  return (
    <AppLayout currentPage={effectivePage} onNavigate={navigate} theme={theme} onCycleTheme={cycleTheme}>
      {pages[effectivePage] || <MenuPage onNavigate={navigate} />}
    </AppLayout>
  );
}
