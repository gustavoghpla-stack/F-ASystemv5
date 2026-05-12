import { hasPermission } from '@/lib/db';
import { PageHeader } from '@/components/ui-custom';
import { useAuth } from '@/contexts/AuthContext';

interface Props { onNavigate: (page: string) => void; }

// masterOnly = true → visible only to Master, not toggleable
const cadastros = [
  { id: 'funcionarios', icon: '👤', label: 'Funcionários', desc: 'Cadastro completo de colaboradores', feature: 'funcionarios' },
  { id: 'bancos', icon: '🏦', label: 'Bancos / PIX', desc: 'Dados bancários e chave PIX', feature: 'bancos' },
  { id: 'escalas', icon: '📅', label: 'Escalas', desc: 'Horários e turnos de serviço', feature: 'escalas' },
  { id: 'documentos', icon: '📄', label: 'Documentos', desc: 'Lista de documentos para contratação', feature: 'documentos' },
  { id: 'usuarios', icon: '👥', label: 'Usuários', desc: 'Controle de acesso ao sistema', feature: 'usuarios' },
];

const operacoes = [
  { id: 'estoque', icon: '📦', label: 'Estoque', desc: 'Controle de materiais e insumos', feature: 'estoque' },
  { id: 'abastecimento', icon: '⛽', label: 'Abastecimento', desc: 'Controle de combustível dos veículos', feature: 'abastecimento' },
];

const financeiro = [
  { id: 'fluxo-caixa', icon: '💰', label: 'Fluxo de Caixa', desc: 'Entradas, saídas e metas financeiras', feature: 'fluxoCaixa' },
  { id: 'orcamento', icon: '📋', label: 'Orçamento', desc: 'Gerar orçamentos em PDF e planilha', feature: 'orcamento' },
  { id: 'certificado', icon: '📜', label: 'Certificado', desc: 'Gerar certificados de serviço', feature: 'certificado' },
];

const equipe = [
  { id: 'equipe', icon: '⭐', label: 'Controle de Equipe', desc: 'Avaliações, elogios e retrabalhos', feature: 'equipe' },
];

const relatorios = [
  { id: 'rel-func', icon: '📊', label: 'Funcionários', desc: 'Lista e filtros de colaboradores', feature: 'relatorios' },
  { id: 'rel-aniv', icon: '🎂', label: 'Aniversariantes', desc: 'Filtro por mês de aniversário', feature: 'relatorios' },
  { id: 'rel-users', icon: '🧾', label: 'Usuários', desc: 'Usuários cadastrados no sistema', feature: 'relatorios' },
  { id: 'rel-acessos', icon: '🔒', label: 'Acessos', desc: 'Registro de entradas no sistema', masterOnly: true },
];

const sistema = [
  { id: 'config', icon: '⚙️', label: 'Configurações', desc: 'Google Sheets, backup e segurança', masterOnly: true },
  { id: 'debug', icon: '🔧', label: 'Debug', desc: 'Diagnóstico e logs do sistema', masterOnly: true },
];

export default function MenuPage({ onNavigate }: Props) {
  const { session } = useAuth();
  const userNivel = session?.nivel || 'Operador';
  const userEmail = session?.user || '';
  const isMaster = userNivel === 'Master';

  // Filter: masterOnly items → only Master. Others → only check explicit permission toggle (default = allowed).
  const filter = (items: any[]) => items.filter(i => {
    if (i.masterOnly) return isMaster;
    if (!isMaster && i.feature && !hasPermission(userEmail, userNivel, i.feature)) return false;
    return true;
  });

  const fc = filter(cadastros);
  const fo = filter(operacoes);
  const ff = filter(financeiro);
  const fe = filter(equipe);
  const fr = filter(relatorios);
  const fs = filter(sistema);

  return (
    <>
      <PageHeader title="Menu Principal" icon="🏠" />
      <div className="flex-1 overflow-y-auto p-5">
        {fc.length > 0 && <><SectionTitle>Cadastros</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {fc.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}

        {fo.length > 0 && <><SectionTitle>Operações</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {fo.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}

        {ff.length > 0 && <><SectionTitle>Financeiro</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {ff.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}

        {fe.length > 0 && <><SectionTitle>Equipe</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {fe.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}

        {fr.length > 0 && <><SectionTitle>Relatórios</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {fr.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}

        {fs.length > 0 && <><SectionTitle>Sistema</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-3">
            {fs.map(c => <MenuCard key={c.id} {...c} onClick={() => onNavigate(c.id)} />)}
          </div></>}
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-heading text-[12px] font-bold tracking-[2px] text-muted-foreground uppercase my-4 mt-4 first:mt-0 pb-1.5 border-b border-border">{children}</div>;
}

function MenuCard({ icon, label, desc, onClick }: { id: string; icon: string; label: string; desc: string; onClick: () => void; [k: string]: any }) {
  return (
    <div onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 px-3.5 flex flex-col items-center gap-2 cursor-pointer transition-all text-center hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_0_24px_hsl(var(--gold)/0.12)] hover:bg-secondary">
      <div className="text-[30px]">{icon}</div>
      <div className="font-heading text-[14px] font-semibold tracking-[0.3px]">{label}</div>
      <div className="text-muted-foreground text-[10px] leading-[1.4]">{desc}</div>
    </div>
  );
}
