import {
  Layers,
  Calculator,
  BookOpen,
  FileText,
  Moon,
  RotateCcw,
  Plus,
  GraduationCap,
  X,
} from 'lucide-react';
import { AppTab } from './Header';

interface SidebarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  theme: 'light' | 'dark';
  onChangeTheme: (theme: 'light' | 'dark') => void;
  onOpenTheory: () => void;
  onResetCurrent: () => void;
  onOpenNewOrder: () => void;
  ordersCount: number;
  cifCount: number;
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
  ordersCount,
  cifCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: {
    id: AppTab;
    label: string;
    icon: typeof Layers;
    badge?: number;
  }[] = [
    { id: 'orders', label: 'Ordens (OP)', icon: Layers, badge: ordersCount },
    { id: 'cif', label: 'Rateio de CIF', icon: Calculator, badge: cifCount },
    { id: 'taccounts', label: 'Razonetes em T', icon: BookOpen, badge: 8 },
    { id: 'dre', label: 'DRE & Resultados', icon: FileText },
  ];

  const handleNavClick = (tab: AppTab) => {
    onChangeTab(tab);
    onCloseMobile();
  };

  const isDark = theme === 'dark';

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between px-3.5 py-4 select-none gap-3.5">
      <div className="space-y-3.5">
        {/* Floating Brand Pill Capsule (inspired by reference top profile pill) */}
        <div className="dash-glass-pill rounded-full px-3.5 py-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleNavClick('orders')}
            className="group h-12 w-40 overflow-visible flex items-center justify-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full"
            aria-label="CustosOP — Início"
          >
            <img
              src="/assets/aistudio/Custos_op_logo_17896c45.png"
              alt="CustosOP"
              referrerPolicy="no-referrer"
              className="h-[76px] w-auto max-w-none -ml-0.5 select-none pointer-events-none logo-glow"
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
        <div className="dash-card rounded-[26px] p-3.5 space-y-4">
          {/* Primary Navigation Items with Reference Frosted Pill Active State */}
          <nav className="space-y-1" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'dash-nav-pill-active font-semibold'
                      : 'text-slate-600 dark:text-zinc-300/85 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Icon
                      strokeWidth={1.75}
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
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

          {/* Dark Mode Toggle Switch Row (matching reference "Dark Mode" row) */}
          <div className="flex items-center justify-between px-3.5 py-1.5">
            <span className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-zinc-200">
              <Moon
                strokeWidth={1.75}
                className="w-4 h-4 text-slate-500 dark:text-zinc-300 shrink-0"
              />
              <span>Modo Escuro</span>
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Alternar entre modo claro e escuro"
              onClick={() => onChangeTheme(isDark ? 'light' : 'dark')}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B66F5] ${
                isDark
                  ? 'bg-white/20 border-white/25'
                  : 'bg-slate-300/80 border-slate-400/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Utility Links */}
          <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-white/[0.09]">
            <button
              type="button"
              onClick={() => {
                onOpenTheory();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium text-slate-600 dark:text-zinc-300/85 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <GraduationCap
                strokeWidth={1.75}
                className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0"
              />
              <span>Teoria & Guia (CPC 16)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onResetCurrent();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium text-slate-600 dark:text-zinc-300/85 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <RotateCcw
                strokeWidth={1.75}
                className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0"
              />
              <span>Reiniciar Cenário</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Featured Action Card */}
      <div className="dash-card rounded-[24px] p-4 space-y-3">
        <div className="dash-promo-glass rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3B66F5]/15 border border-[#3B66F5]/35 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-[#3B66F5] dark:text-blue-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Abrir Nova Ordem
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
            Inicie um novo lote de produção para acumular MD, MOD e CIF.
          </p>
          <button
            type="button"
            onClick={() => {
              onOpenNewOrder();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 dash-cobalt-btn text-white text-xs font-semibold rounded-full transition-all cursor-pointer"
          >
            + Nova OP
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Glass Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen overflow-y-auto print:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[274px] max-w-[85vw] h-full bg-[#ECEEF2]/95 dark:bg-[#141417]/95 backdrop-blur-2xl border-r border-slate-200 dark:border-white/[0.12] overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
