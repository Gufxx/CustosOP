import {
  Box,
  Layers,
  Calculator,
  BookOpen,
  FileText,
  Landmark,
  Target,
  ArrowLeftRight,
  FileDown,
  Moon,
  RotateCcw,
  Plus,
  GraduationCap,
  Home,
  LogOut,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppTab } from './Header';

interface SidebarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  theme: 'light' | 'dark';
  onChangeTheme: (theme: 'light' | 'dark') => void;
  onOpenTheory: () => void;
  onResetCurrent: () => void;
  onOpenNewOrder: () => void;
  onNavigateLanding: () => void;
  onLogout: () => void;
  userEmail?: string;
  ordersCount: number;
  cifCount: number;
  tAccountsCount: number;
  goalsCount: number;
  cashEntriesCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeTab,
  onChangeTab,
  theme,
  onChangeTheme,
  onOpenTheory,
  onResetCurrent,
  onOpenNewOrder,
  onNavigateLanding,
  onLogout,
  userEmail,
  ordersCount,
  cifCount,
  tAccountsCount,
  goalsCount,
  cashEntriesCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: {
    id: AppTab;
    label: string;
    icon: typeof Layers;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Painel 3D', icon: Box },
    { id: 'orders', label: 'Ordens', icon: Layers, badge: ordersCount },
    { id: 'cif', label: 'Rateio CIF', icon: Calculator, badge: cifCount },
    { id: 'taccounts', label: 'Razonetes', icon: BookOpen, badge: tAccountsCount },
    { id: 'dre', label: 'DRE', icon: FileText },
    { id: 'ir', label: 'Declaração IR', icon: Landmark },
    { id: 'goals', label: 'Metas & Orçamentos', icon: Target, badge: goalsCount },
    { id: 'cashflow', label: 'Entradas & Saídas', icon: ArrowLeftRight, badge: cashEntriesCount },
    { id: 'export', label: 'Exportar PDF', icon: FileDown },
  ];

  const handleNavClick = (tab: AppTab) => {
    onChangeTab(tab);
    onCloseMobile();
  };

  const isDark = theme === 'dark';
  const shouldReduceMotion = useReducedMotion();

  const renderSidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full justify-between px-3 py-2 select-none gap-1.5">
      <div className="space-y-1.5">
        {/* Compact Brand Pill Capsule */}
        <div className="dash-glass-pill rounded-full px-3 py-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="group h-10 w-36 overflow-visible flex items-center justify-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
            aria-label="CustosOP — Painel 3D"
          >
            <img
              src="/assets/custosop-logo.png"
              alt="CustosOP"
              referrerPolicy="no-referrer"
              className="h-[64px] w-auto max-w-none -ml-0.5 select-none pointer-events-none logo-glow"
            />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onOpenTheory();
                onCloseMobile();
              }}
              className="dash-cobalt-btn text-white text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
              title="Abrir Guia Contábil CPC 16"
            >
              CPC 16
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-full text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Floating Glass Menu Card */}
        <div className="dash-card rounded-[24px] p-2 space-y-1.5">
          {/* Primary Navigation Items */}
          <nav className="space-y-0.5" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative w-full flex items-center justify-between px-2.5 py-1.25 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-zinc-300/85 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={isMobile ? 'sidebar-pill-mobile' : 'sidebar-pill-desktop'}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0.01 }
                          : { type: 'spring', stiffness: 420, damping: 32, mass: 0.78 }
                      }
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full dash-nav-pill-active pointer-events-none"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                    <Icon
                      strokeWidth={1.75}
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`relative z-10 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full leading-none ${
                        isActive
                          ? 'bg-slate-900/10 dark:bg-white/20 text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-zinc-400 bg-slate-900/[0.05] dark:bg-white/[0.06]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Subtle Hairline Divider */}
          <div className="border-t border-slate-200/80 dark:border-white/[0.09]" />

          {/* Compact Dark Mode Toggle Row */}
          <div className="flex items-center justify-between px-3 py-1">
            <span className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-200">
              <Moon
                strokeWidth={1.75}
                className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-300 shrink-0"
              />
              <span>Modo Escuro</span>
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Alternar entre modo claro e escuro"
              onClick={() => onChangeTheme(isDark ? 'light' : 'dark')}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B66F5] ${
                isDark
                  ? 'bg-white/20 border-white/25'
                  : 'bg-slate-300/80 border-slate-400/30'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isDark ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Compact 2x2 Utility Grid (eliminates vertical overflow) */}
          <div className="pt-1.5 border-t border-slate-200/80 dark:border-white/[0.09] grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenTheory();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.03] dark:bg-white/[0.04] hover:bg-slate-900/[0.07] dark:hover:bg-white/[0.09] transition-colors cursor-pointer"
              title="Teoria & Guia Contábil (CPC 16)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
              <span className="truncate">Guia CPC 16</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onResetCurrent();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.03] dark:bg-white/[0.04] hover:bg-slate-900/[0.07] dark:hover:bg-white/[0.09] transition-colors cursor-pointer"
              title="Restaurar dados originais do cenário"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
              <span className="truncate">Reiniciar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigateLanding();
                onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.03] dark:bg-white/[0.04] hover:bg-slate-900/[0.07] dark:hover:bg-white/[0.09] transition-colors cursor-pointer"
              title="Voltar à página inicial do site"
            >
              <Home className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
              <span className="truncate">Site</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onCloseMobile();
              }}
              title={userEmail ? `Encerrar sessão de ${userEmail}` : 'Sair do painel'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-900/[0.03] dark:bg-white/[0.04] hover:bg-rose-500/[0.08] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />
              <span className="truncate">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Bottom Featured Action Card */}
      <div className="dash-card rounded-[22px] p-2.5">
        <div className="dash-inset rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#3B66F5]/15 border border-[#3B66F5]/35 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-[#3B66F5] dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Nova Ordem (OP)
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                Acumular MD, MOD e CIF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenNewOrder();
              onCloseMobile();
            }}
            className="w-full py-1.5 px-3 dash-cobalt-btn text-white text-xs font-semibold rounded-full transition-all cursor-pointer"
          >
            + Nova OP
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed-Fit Floating Glass Sidebar (No Scrollbar) */}
      <aside className="hidden lg:flex lg:flex-col w-[256px] shrink-0 sticky top-0 h-dvh overflow-hidden print:hidden">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '-100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '-100%', opacity: 0.6 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.01 }
                  : { type: 'spring', stiffness: 360, damping: 32, mass: 0.85 }
              }
              className="relative z-10 w-[268px] max-w-[85vw] h-full bg-[#ECEEF2]/95 dark:bg-[#141417]/95 backdrop-blur-2xl border-r border-slate-200 dark:border-white/[0.12] overflow-y-auto"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
