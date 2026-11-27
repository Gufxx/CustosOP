import { useState, type FormEvent, type MouseEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { NocturnalBackdrop } from './NocturnalBackdrop';
import { PredefinedScenario } from '../data/mockScenarios';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

interface LoginPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pendingScenario: PredefinedScenario | null;
  onBackToSite: () => void;
  onLoginSuccess: (user: AuthUser, remember: boolean) => void;
}

function handleCardMouseMove(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export function LoginPage({
  theme,
  onToggleTheme,
  pendingScenario,
  onBackToSite,
  onLoginSuccess,
}: LoginPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFillDemo = () => {
    setEmail('controladoria@custosop.com.br');
    setPassword('Custos@2026');
    setErrorMsg(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg('Informe um endereço de e-mail corporativo válido.');
      return;
    }

    if (password.trim().length < 4) {
      setErrorMsg('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    // Derive display name from email local part
    const localPart = trimmedEmail.split('@')[0] || 'Controladoria';
    const formattedName = localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    window.setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(
        {
          name: formattedName || 'Controladoria Industrial',
          email: trimmedEmail,
          role: 'Controller / Custos',
        },
        remember
      );
    }, 380);
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-[#F5F5F7] relative overflow-x-clip">
      <NocturnalBackdrop />

      {/* Minimal Top Bar */}
      <header className="sticky top-0 z-30 bg-white/75 dark:bg-black/50 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.14]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={onBackToSite}
            className="group h-12 w-40 overflow-visible flex items-center justify-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg shrink-0"
            aria-label="Voltar para a página principal"
          >
            <img
              src="/assets/custosop-logo.png"
              alt="CustosOP"
              referrerPolicy="no-referrer"
              className="h-[76px] w-auto max-w-none -ml-0.5 select-none pointer-events-none logo-glow"
            />
          </button>

          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white dash-glass-pill rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao site</span>
          </button>
        </div>
      </header>

      {/* Main Centered Split Frame */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="max-w-[1120px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Workspace Context */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Acesso ao Ambiente Contábil · CustosOP
              </p>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                Entre para gerenciar suas Ordens de Produção.
              </h1>
              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-zinc-300 leading-relaxed max-w-lg">
                Ao autenticar, você acessa diretamente o painel operacional com apontamentos de MD
                e MOD, motor de rateio de CIF, razonetes esquemáticos em T e DRE consolidada.
              </p>
            </div>

            {pendingScenario && (
              <div className="dash-card rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block">
                  Cenário pré-selecionado para abertura
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {pendingScenario.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-300">
                  {pendingScenario.subtitle}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.1] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-white shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Persistência Local Segura
                  </span>
                  <span className="text-slate-500 dark:text-zinc-400">
                    Ordens, lançamentos e critérios salvos no seu navegador.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-slate-700 dark:text-white shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Acesso de Demonstração
                  </span>
                  <span className="text-slate-500 dark:text-zinc-400">
                    Use qualquer e-mail válido ou preencha as credenciais modelo.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Liquid Glass Login Card */}
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 18, scale: 0.99 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.06 }}
            onMouseMove={handleCardMouseMove}
            className="lg:col-span-6 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-8"
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Autenticação no Painel
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Insira suas credenciais corporativas ou utilize o acesso de demonstração.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
                  title={isDark ? 'Modo Claro' : 'Modo Escuro'}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-zinc-200"
                  >
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="controladoria@empresa.com.br"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full dash-inset rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-900/25 dark:focus:ring-white/35 transition-shadow"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-zinc-200"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full dash-inset rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-slate-900/25 dark:focus:ring-white/35 transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Demo Quick Fill */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/25 accent-slate-900 dark:accent-white cursor-pointer"
                    />
                    <span>Manter sessão conectada</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="text-xs font-semibold text-slate-800 dark:text-white hover:underline cursor-pointer"
                  >
                    Preencher credenciais de demonstração
                  </button>
                </div>

                {/* Inline Validation Feedback */}
                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl px-3.5 py-2.5 text-xs font-medium bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300"
                  >
                    {errorMsg}
                  </div>
                )}

                {/* Primary Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold dash-cobalt-btn rounded-full transition-all cursor-pointer disabled:opacity-65 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span>{isSubmitting ? 'Autenticando ambiente...' : 'Entrar no Painel'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <p className="pt-3 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400 text-center">
                Ambiente demonstrativo CustosOP · Os dados contábeis permanecem salvos localmente.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
