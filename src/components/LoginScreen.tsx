import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import logoImg from '@/assets/logo.png';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha todos os campos.'); return; }
    const err = await login(email, password);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background"
      style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 50%, hsl(var(--gold-glow)), transparent 70%), hsl(var(--background))' }}>
      <div className="animate-fade-up bg-popover border border-primary/50 rounded-xl p-7 sm:p-11 w-[92%] max-w-[400px] shadow-2xl mx-4">
        <div className="text-center mb-6">
          <div className="w-[90px] h-[90px] rounded-full mx-auto overflow-hidden shadow-[0_0_30px_hsl(var(--gold)/0.3)]">
            <img src={logoImg} alt="F&A Higienizações" className="w-full h-full object-cover" />
          </div>
          <div className="font-heading text-[22px] font-bold text-primary tracking-[2px] mt-2.5">
            F&A HIGIENIZAÇÕES
          </div>
          <div className="text-muted-foreground text-[10px] tracking-[1.5px] mt-1">
            F&A SYSTEM
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent my-5" />
        <div className="mb-4">
          <label className="block text-[10px] font-bold tracking-[1.5px] text-muted-foreground uppercase mb-1.5">✉ Usuário / E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('loginPass')?.focus()}
            placeholder="feaviplimpeza@gmail.com"
            className="w-full p-[11px_14px] bg-card border border-border text-foreground rounded-md outline-none text-[13px] transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--gold-glow))]" />
        </div>
        <div className="mb-4">
          <label className="block text-[10px] font-bold tracking-[1.5px] text-muted-foreground uppercase mb-1.5">🔒 Senha</label>
          <input id="loginPass" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••"
            className="w-full p-[11px_14px] bg-card border border-border text-foreground rounded-md outline-none text-[13px] transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--gold-glow))]" />
        </div>
        <button onClick={handleLogin}
          className="w-full p-[13px] mt-2.5 bg-gradient-to-br from-gold-dark to-primary text-primary-foreground font-bold text-[15px] tracking-[2.5px] font-heading rounded-md transition-all hover:opacity-90 hover:-translate-y-px">
          ENTRAR
        </button>
        {error && <div className="text-destructive text-[11px] mt-2.5 text-center">{error}</div>}
        <div className="text-center mt-5 text-muted-foreground text-[10px]">
          © 2025 F&A Higienizações — Bacamarte Dev Company
        </div>
      </div>
    </div>
  );
}
