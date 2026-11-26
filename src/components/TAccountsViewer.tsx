import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { TAccount } from '../types/costing';
import { formatBRL } from '../utils/costCalculations';

interface TAccountsViewerProps {
  tAccounts: TAccount[];
}

export function TAccountsViewer({ tAccounts }: TAccountsViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [hoveredOpCode, setHoveredOpCode] = useState<string | null>(null);

  const totalDebitsAll = tAccounts.reduce((acc, accObj) => {
    return acc + accObj.debits.reduce((dAcc, d) => dAcc + d.amount, 0);
  }, 0);

  const totalCreditsAll = tAccounts.reduce((acc, accObj) => {
    return acc + accObj.credits.reduce((cAcc, c) => cAcc + c.amount, 0);
  }, 0);

  const isBalanced = Math.abs(totalDebitsAll - totalCreditsAll) < 0.05;

  const filteredAccounts = tAccounts.filter((acc) => {
    if (selectedCategory === 'todos') return true;
    return acc.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Informative Header & Filter */}
      <div className="dash-card rounded-[24px] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Razonetes Contábeis em T (Mecânica de Débito e Crédito)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Visualização esquemática das partidas dobradas da acumulação dos custos de produção
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${
              isBalanced
                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30'
            }`}
            title="Princípio fundamental das Partidas Dobradas: para todo débito há um crédito de igual valor"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Partidas Dobradas Fechadas</span>
          </div>

          <div className="inline-flex rounded-full p-1 bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/[0.1] text-xs gap-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'todos'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas as Contas
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('ativo_circulante')}
              className={`px-3 py-1 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'ativo_circulante'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Estoques (Ativo)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('resultado')}
              className={`px-3 py-1 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'resultado'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Resultado (CPV / Vendas)
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Razonetes em T */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAccounts.map((account) => {
          const sumDebits = account.debits.reduce((a, b) => a + b.amount, 0);
          const sumCredits = account.credits.reduce((a, b) => a + b.amount, 0);
          const isDebtor = sumDebits >= sumCredits;
          const finalBalance = Math.abs(sumDebits - sumCredits);

          return (
            <div
              key={account.code}
              className="dash-card rounded-[24px] overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-white/25 transition-colors"
            >
              {/* Razonete Title / Top Bar */}
              <div className="bg-slate-900/[0.03] dark:bg-white/[0.04] px-4 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    {account.code}
                  </span>
                  <span aria-hidden="true" className="text-slate-400 dark:text-zinc-500">·</span>
                  <h4 className="font-bold text-xs truncate text-slate-900 dark:text-white" title={account.title}>
                    {account.title}
                  </h4>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 shrink-0">
                  {account.category === 'ativo_circulante'
                    ? 'Ativo'
                    : account.category === 'passivo_circulante'
                    ? 'Passivo'
                    : account.category === 'resultado'
                    ? 'Resultado'
                    : 'Custos'}
                </span>
              </div>

              {/* T-Account Layout */}
              <div className="p-3.5 grid grid-cols-2 gap-0 flex-1 relative divide-x divide-slate-200/80 dark:divide-white/[0.08]">
                {/* DÉBITO (D) */}
                <div className="pr-3 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="text-center pb-1.5 mb-2 border-b border-slate-200/80 dark:border-white/[0.08] font-bold text-xs text-slate-900 dark:text-white tracking-wide">
                      Débito (D)
                    </div>

                    <div className="space-y-1.5">
                      {account.debits.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">—</p>
                      ) : (
                        account.debits.map((d) => {
                          const isHighlighted = hoveredOpCode && d.opCode === hoveredOpCode;
                          return (
                            <div
                              key={d.id}
                              onMouseEnter={() => d.opCode && setHoveredOpCode(d.opCode)}
                              onMouseLeave={() => setHoveredOpCode(null)}
                              className={`p-1.5 rounded-xl text-[11px] transition-colors ${
                                isHighlighted
                                  ? 'bg-white/15 ring-1 ring-white/45 font-bold'
                                  : 'hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.05]'
                              }`}
                            >
                              <div
                                className="text-slate-500 dark:text-zinc-400 text-[10px] leading-tight truncate"
                                title={d.label}
                              >
                                {d.label}
                              </div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white text-right mt-0.5">
                                {formatBRL(d.amount)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-3 border-t border-slate-200/80 dark:border-white/[0.08] text-right">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-semibold block">Total D</span>
                    <span className="font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-white">
                      {formatBRL(sumDebits)}
                    </span>
                  </div>
                </div>

                {/* CRÉDITO (C) */}
                <div className="pl-3 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="text-center pb-1.5 mb-2 border-b border-slate-200/80 dark:border-white/[0.08] font-bold text-xs text-emerald-600 dark:text-emerald-300 tracking-wide">
                      Crédito (C)
                    </div>

                    <div className="space-y-1.5">
                      {account.credits.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">—</p>
                      ) : (
                        account.credits.map((c) => {
                          const isHighlighted = hoveredOpCode && c.opCode === hoveredOpCode;
                          return (
                            <div
                              key={c.id}
                              onMouseEnter={() => c.opCode && setHoveredOpCode(c.opCode)}
                              onMouseLeave={() => setHoveredOpCode(null)}
                              className={`p-1.5 rounded-xl text-[11px] transition-colors ${
                                isHighlighted
                                  ? 'bg-white/15 ring-1 ring-white/45 font-bold'
                                  : 'hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.05]'
                              }`}
                            >
                              <div
                                className="text-slate-500 dark:text-zinc-400 text-[10px] leading-tight truncate"
                                title={c.label}
                              >
                                {c.label}
                              </div>
                              <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white text-right mt-0.5">
                                {formatBRL(c.amount)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-3 border-t border-slate-200/80 dark:border-white/[0.08] text-right">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-400 font-semibold block">Total C</span>
                    <span className="font-mono tabular-nums font-bold text-xs text-emerald-600 dark:text-emerald-300">
                      {formatBRL(sumCredits)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldo Final */}
              <div
                className={`px-4 py-2.5 border-t border-slate-200/80 dark:border-white/[0.08] text-xs font-bold flex items-center justify-between ${
                  finalBalance === 0
                    ? 'bg-slate-900/[0.02] dark:bg-white/[0.02] text-slate-400 dark:text-zinc-500'
                    : isDebtor
                    ? 'bg-slate-900/[0.04] dark:bg-white/[0.08] text-slate-900 dark:text-white'
                    : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <span className="text-[11px] font-semibold">
                  {finalBalance === 0
                    ? 'Conta Zerada (Encerrada)'
                    : isDebtor
                    ? 'Saldo Devedor (SD)'
                    : 'Saldo Credor (SC)'}
                </span>
                <span className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
                  {formatBRL(finalBalance)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Didactic Footnote */}
      <div className="dash-card rounded-[22px] p-4 text-xs text-slate-600 dark:text-zinc-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-900 dark:text-white shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            Dica Didática para Estudantes e Contadores:
          </p>
          <p className="leading-relaxed">
            Passe o cursor sobre qualquer lançamento para destacar a contrapartida correspondente nas outras contas (ex: Requisição de Matéria-Prima debita <strong className="text-slate-900 dark:text-white">Produtos em Elaboração</strong> e credita <strong className="text-emerald-600 dark:text-emerald-300">Almoxarifado</strong>; encerramento da OP debita <strong className="text-slate-900 dark:text-white">Produtos Acabados</strong> e credita <strong className="text-emerald-600 dark:text-emerald-300">Produtos em Elaboração</strong>; faturamento debita <strong className="text-slate-900 dark:text-white">CPV</strong> e credita <strong className="text-emerald-600 dark:text-emerald-300">Produtos Acabados</strong>).
          </p>
        </div>
      </div>
    </div>
  );
}
