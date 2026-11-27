import { BookOpen } from 'lucide-react';

export type AppTab =
  | 'overview'
  | 'orders'
  | 'cif'
  | 'taccounts'
  | 'dre'
  | 'ir'
  | 'goals'
  | 'cashflow'
  | 'export';

interface HeaderProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  onOpenTheory: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'overview', label: 'Painel 3D' },
  { id: 'orders', label: 'Ordens' },
  { id: 'cif', label: 'Rateio CIF' },
  { id: 'taccounts', label: 'Razonetes' },
  { id: 'dre', label: 'DRE' },
  { id: 'ir', label: 'Declaração IR' },
  { id: 'goals', label: 'Metas & Orçamentos' },
  { id: 'cashflow', label: 'Entradas & Saídas' },
  { id: 'export', label: 'Exportar PDF' },
];

export function Header({
  activeTab,
  onChangeTab,
  onOpenTheory,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/75 dark:bg-black/50 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.14] print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Logo */}
        <button
          type="button"
          onClick={() => onChangeTab('orders')}
          className="group h-12 w-40 overflow-visible flex items-center justify-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg shrink-0"
          aria-label="CustosOP — Início"
        >
          <img
            src="/assets/custosop-logo.png"
            alt="CustosOP"
            referrerPolicy="no-referrer"
            className="h-[76px] w-auto max-w-none -ml-0.5 select-none pointer-events-none logo-glow"
          />
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-7"
          aria-label="Navegação principal"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`relative py-2 text-xs sm:text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full bg-slate-900 dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.65)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenTheory}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white dash-cobalt-btn rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
            title="Guia Didático da Teoria Contábil Brasileira (CPC 16 / NBC TG 16)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Teoria & Guia</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Nav Row */}
      <nav
        className="md:hidden border-t border-slate-200/70 dark:border-white/[0.08] px-3 py-1.5 flex items-center justify-around gap-1 overflow-x-auto"
        aria-label="Navegação móvel"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
