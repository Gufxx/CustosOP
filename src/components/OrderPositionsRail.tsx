import {
  Layers,
  Clock,
  CheckCircle2,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import { ProductionOrder, OrderCostSummary } from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';

interface OrderPositionsRailProps {
  totalManufacturingCost: number;
  totalMD: number;
  totalMOD: number;
  totalCIF: number;
  grossRevenue: number;
  grossMarginPercent: number;
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  onOpenCostSheet: (order: ProductionOrder) => void;
  onViewAllOrders: () => void;
}

export function OrderPositionsRail({
  totalManufacturingCost,
  totalMD,
  totalMOD,
  totalCIF,
  grossRevenue,
  grossMarginPercent,
  orders,
  summaries,
  onOpenCostSheet,
  onViewAllOrders,
}: OrderPositionsRailProps) {
  return (
    <div className="space-y-5">
      {/* Top Featured Obsidian Glass Summary Card */}
      <div className="dash-hero-glass rounded-[24px] p-5 text-white relative overflow-hidden">
        {/* Subtle top-right frosted sheen */}
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none"
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/12 border border-white/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-white/90">
                Custo Fabril Total
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-300 tabular-nums">
              Margem {formatNumber(grossMarginPercent, 1)}%
            </span>
          </div>

          <div>
            <h3
              className="text-2xl xl:text-[26px] font-extrabold tracking-tight font-mono tabular-nums truncate"
              title={formatBRL(totalManufacturingCost)}
            >
              {formatBRL(totalManufacturingCost)}
            </h3>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/15 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-300">Material Direto (MD)</span>
              <span className="font-mono tabular-nums font-semibold text-white">
                {formatBRL(totalMD)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-300">Mão de Obra Direta (MOD)</span>
              <span className="font-mono tabular-nums font-semibold text-white">
                {formatBRL(totalMOD)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-300">CIF Apropriado</span>
              <span className="font-mono tabular-nums font-semibold text-blue-300">
                {formatBRL(totalCIF)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10">
              <span className="text-zinc-300">Receita Faturada</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-300">
                {formatBRL(grossRevenue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Positions Card */}
      <div className="dash-card rounded-[24px] p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Posição das Ordens
          </h4>
          <button
            type="button"
            onClick={onViewAllOrders}
            className="text-[11px] font-semibold text-[#3B66F5] dark:text-blue-400 hover:underline cursor-pointer"
          >
            Ver todas
          </button>
        </div>

        <div className="space-y-2">
          {orders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Nenhuma OP cadastrada.
            </p>
          ) : (
            orders.slice(0, 5).map((op) => {
              const summary = summaries[op.id];
              const total = summary?.totalManufacturingCost || 0;
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => onOpenCostSheet(op)}
                  className="w-full text-left p-2.5 rounded-2xl dash-inset hover:border-slate-300 dark:hover:border-white/25 dark:hover:bg-white/[0.08] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        op.status === 'faturada'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                          : op.status === 'encerrada'
                          ? 'bg-[#3B66F5]/15 text-[#3B66F5] dark:text-blue-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      {op.status === 'faturada' ? (
                        <Send className="w-3.5 h-3.5" />
                      ) : op.status === 'encerrada' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="font-mono text-[#3B66F5] dark:text-blue-400">
                          {op.code}
                        </span>
                        <span className="truncate">{op.clientName}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {op.quantity} {op.unit} ·{' '}
                        {op.status === 'em_elaboracao'
                          ? 'Em PeE'
                          : op.status === 'encerrada'
                          ? 'Em PA'
                          : 'Faturada'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap">
                      {formatBRL(total)}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-400 group-hover:text-[#3B66F5] dark:group-hover:text-blue-400">
                      <FileSpreadsheet className="w-2.5 h-2.5" />
                      Ficha
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
