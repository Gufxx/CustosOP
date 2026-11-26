import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Plus,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Send,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { ProductionOrder, OrderCostSummary, OrderStatus } from '../types/costing';
import { formatBRL, formatNumber, getOrderCostMonitoring } from '../utils/costCalculations';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface ProductionOrdersListProps {
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  onOpenCostSheet: (order: ProductionOrder) => void;
  onOpenAddCost: (order: ProductionOrder) => void;
  onOpenEditOrder: (order: ProductionOrder) => void;
  onOpenNewOrder: () => void;
  onDeleteOrder: (orderId: string) => void;
  onChangeOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export function ProductionOrdersList({
  orders,
  summaries,
  onOpenCostSheet,
  onOpenAddCost,
  onOpenEditOrder,
  onOpenNewOrder,
  onDeleteOrder,
  onChangeOrderStatus,
}: ProductionOrdersListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [transitionedOrders, setTransitionedOrders] = useState<Record<string, OrderStatus>>({});
  const prevStatusMapRef = useRef<Record<string, OrderStatus>>({});
  const clearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const prevMap = prevStatusMapRef.current;
    const nextMap: Record<string, OrderStatus> = {};
    const changedIds: Array<{ id: string; status: OrderStatus }> = [];

    orders.forEach((op) => {
      nextMap[op.id] = op.status;
      if (prevMap[op.id] && prevMap[op.id] !== op.status) {
        changedIds.push({ id: op.id, status: op.status });
      }
    });

    prevStatusMapRef.current = nextMap;

    if (changedIds.length > 0) {
      setTransitionedOrders((prev) => {
        const updated = { ...prev };
        changedIds.forEach(({ id, status }) => {
          updated[id] = status;
        });
        return updated;
      });

      changedIds.forEach(({ id }) => {
        if (clearTimersRef.current[id]) {
          clearTimeout(clearTimersRef.current[id]);
        }
        clearTimersRef.current[id] = setTimeout(() => {
          setTransitionedOrders((prev) => {
            if (!(id in prev)) return prev;
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        }, 900);
      });
    }
  }, [orders]);

  useEffect(() => {
    const timers = clearTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const exceededOrderIds = new Set(
    orders
      .filter((op) => getOrderCostMonitoring(op, summaries[op.id]).level === 'exceeded')
      .map((op) => op.id)
  );

  const normalizedQuery = normalizeSearch(searchTerm.trim());

  const filteredOrders = orders.filter((op) => {
    const matchesStatus =
      filterStatus === 'todos'
        ? true
        : filterStatus === 'exceeded'
          ? exceededOrderIds.has(op.id)
          : op.status === filterStatus;
    const matchesSearch =
      !normalizedQuery ||
      normalizeSearch(op.code).includes(normalizedQuery) ||
      normalizeSearch(op.clientName).includes(normalizedQuery) ||
      normalizeSearch(op.productDescription).includes(normalizedQuery);
    return matchesStatus && matchesSearch;
  });

  const hasActiveFilter = Boolean(normalizedQuery) || filterStatus !== 'todos';

  return (
    <div className="dash-card rounded-[26px] overflow-hidden">
      {/* Header & Search/Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.1] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Ordens de Produção (Encomendas)
              </h2>
              <span aria-hidden="true" className="text-slate-400 dark:text-zinc-500">·</span>
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 tabular-nums">
                {hasActiveFilter
                  ? `${filteredOrders.length} de ${orders.length} exibida${filteredOrders.length !== 1 ? 's' : ''}`
                  : `${orders.length} cadastrada${orders.length !== 1 ? 's' : ''}`}
              </span>
              {exceededOrderIds.size > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFilterStatus((prev) => (prev === 'exceeded' ? 'todos' : 'exceeded'))
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                    filterStatus === 'exceeded'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                  }`}
                  title="Filtrar ordens em que o custo acumulado ultrapassou o preço de venda estipulado"
                >
                  <AlertOctagon className="w-3 h-3 shrink-0" />
                  <span>
                    {exceededOrderIds.size} acima do preço
                  </span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Acompanhe o acúmulo contábil de materiais diretos, mão de obra e rateio de CIF por lote
            </p>
          </div>

          {/* Primary Create Button */}
          <button
            type="button"
            onClick={onOpenNewOrder}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 dash-cobalt-btn text-xs font-semibold rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova OP</span>
          </button>
        </div>

        {/* Dedicated Top Search & Status Filter Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Buscar ordens de produção por código, cliente ou descrição do produto"
              placeholder="Buscar OP por código, nome do cliente ou descrição do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-9 py-2.5 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.14] rounded-full text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-white/35 transition-shadow"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpar busca"
                title="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Segmented Controls */}
          <div className="inline-flex flex-wrap rounded-full p-1 bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/[0.12] gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterStatus === 'todos'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('em_elaboracao')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterStatus === 'em_elaboracao'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-400/35 font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Em PeE ({orders.filter((o) => o.status === 'em_elaboracao').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('encerrada')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterStatus === 'encerrada'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Em PA ({orders.filter((o) => o.status === 'encerrada').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('faturada')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterStatus === 'faturada'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-400/35 font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Faturadas ({orders.filter((o) => o.status === 'faturada').length})
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal 3-Zone Orders List */}
      <div className="divide-y divide-slate-200/80 dark:divide-white/[0.08]">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Layers className="w-10 h-10 text-slate-400 dark:text-zinc-500 mx-auto mb-1" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Nenhuma ordem de produção encontrada.
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {hasActiveFilter
                ? 'Nenhuma OP corresponde ao termo buscado ou filtro selecionado.'
                : 'Crie uma nova OP para começar a apurar os custos.'}
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('todos');
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-slate-900/[0.06] dark:bg-white/[0.1] text-slate-800 dark:text-white hover:bg-slate-900/[0.12] dark:hover:bg-white/[0.16] border border-slate-300/70 dark:border-white/15 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar busca e filtros</span>
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {filteredOrders.map((op) => {
              const summary = summaries[op.id] || {
                totalMD: 0,
                totalMOD: 0,
                totalMODHours: 0,
                cifAllocated: 0,
                totalManufacturingCost: 0,
                unitCost: 0,
                revenue: 0,
                grossProfit: 0,
                grossMarginPercent: 0,
              };

              const monitoring = getOrderCostMonitoring(op, summaries[op.id]);
              const isExceeded = monitoring.level === 'exceeded';
              const isWarning = monitoring.level === 'warning';
              const isHealthy = monitoring.level === 'healthy';
              const transitionedStatus = transitionedOrders[op.id];

              const pulseRingClass =
                transitionedStatus === 'faturada'
                  ? 'bg-emerald-500/[0.08] ring-1 ring-inset ring-emerald-400/40'
                  : transitionedStatus === 'encerrada'
                    ? 'bg-sky-500/[0.07] ring-1 ring-inset ring-sky-400/35'
                    : transitionedStatus === 'em_elaboracao'
                      ? 'bg-amber-500/[0.07] ring-1 ring-inset ring-amber-400/35'
                      : '';

              return (
                <motion.div
                  key={op.id}
                  layout={shouldReduceMotion ? false : 'position'}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          scale: transitionedStatus ? [1, 1.015, 0.996, 1] : 1,
                        }
                  }
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: transitionedStatus ? 0.48 : 0.28,
                    ease: [0.22, 1, 0.36, 1],
                    layout: { type: 'spring', stiffness: 360, damping: 32 },
                  }}
                  className={`p-4 sm:p-5 transition-colors duration-300 grid grid-cols-1 xl:grid-cols-[minmax(250px,1fr)_minmax(520px,1.75fr)_auto] items-center gap-4 origin-center ${
                    pulseRingClass ||
                    (isExceeded
                      ? 'bg-rose-500/[0.045] hover:bg-rose-500/[0.075] border-l-[3px] border-l-rose-500'
                      : 'hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03]')
                  }`}
                >
                  {/* Left Zone: Identification & Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-900/[0.06] dark:bg-white/[0.11] px-2.5 py-0.5 rounded-full border border-slate-300/70 dark:border-white/[0.16] shrink-0">
                        {op.code}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {op.clientName}
                      </span>
                      <span aria-hidden="true" className="text-slate-400 dark:text-zinc-500">·</span>

                      <AnimatePresence mode="popLayout" initial={false}>
                        {op.status === 'em_elaboracao' && (
                          <motion.span
                            key="em_elaboracao"
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82, y: 2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: -2 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300 whitespace-nowrap"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Em Elaboração (PeE)
                          </motion.span>
                        )}
                        {op.status === 'encerrada' && (
                          <motion.span
                            key="encerrada"
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82, y: 2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: -2 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-200 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-300" />
                            Concluída (PA)
                          </motion.span>
                        )}
                        {op.status === 'faturada' && (
                          <motion.span
                            key="faturada"
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82, y: 2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: -2 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Faturada / Entregue
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium line-clamp-2">
                    {op.productDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5 tabular-nums">
                    <span>
                      Lote: <strong className="text-slate-900 dark:text-white font-semibold">{op.quantity} {op.unit}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
                      Início: {op.startDate}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Previsão: {op.targetDate}</span>
                    {op.machineHours > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Máq: {op.machineHours}h</span>
                      </>
                    )}
                  </div>

                  {/* Cost vs. Selling Price Monitoring Badge */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {isExceeded && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 tabular-nums"
                        title={`Custo acumulado (${formatBRL(monitoring.accumulatedCost)}) ultrapassou o preço de venda estipulado (${formatBRL(monitoring.stipulatedTotalPrice)})`}
                      >
                        <AlertOctagon className="w-3 h-3 shrink-0" />
                        <span>Custo &gt; Preço (+{formatBRL(monitoring.excessAmount)})</span>
                      </span>
                    )}
                    {isWarning && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 tabular-nums"
                        title={`Custo acumulado atingiu ${formatNumber(monitoring.consumptionPercent, 1)}% do preço estipulado (${formatBRL(monitoring.stipulatedTotalPrice)})`}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Atenção: {formatNumber(monitoring.consumptionPercent, 0)}% do preço</span>
                      </span>
                    )}
                    {isHealthy && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 tabular-nums"
                        title={`Custo acumulado está dentro do preço estipulado (${formatBRL(monitoring.stipulatedTotalPrice)})`}
                      >
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        <span>No Orçado · {formatNumber(monitoring.consumptionPercent, 0)}% do preço</span>
                      </span>
                    )}
                    {monitoring.level === 'unpriced' && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-500 dark:text-zinc-400 border border-slate-300/60 dark:border-white/[0.1]"
                        title="Edite a OP para estipular um preço de venda e ativar o monitoramento de teto"
                      >
                        <Tag className="w-3 h-3 shrink-0" />
                        <span>Sem preço estipulado</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Zone: Non-overlapping Cost Breakdown Box */}
                <div className="dash-inset px-4 py-3 rounded-2xl min-w-0 space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                        Material Direto
                      </span>
                      <span
                        className="text-[13px] font-bold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap block mt-0.5 truncate"
                        title={formatBRL(summary.totalMD)}
                      >
                        {formatBRL(summary.totalMD)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block tabular-nums">
                        {(op.materials || []).length} req.
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                        Mão de Obra
                      </span>
                      <span
                        className="text-[13px] font-bold text-slate-800 dark:text-zinc-100 font-mono tabular-nums whitespace-nowrap block mt-0.5 truncate"
                        title={formatBRL(summary.totalMOD)}
                      >
                        {formatBRL(summary.totalMOD)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block tabular-nums">
                        {summary.totalMODHours}h apontadas
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                        CIF Apropriado
                      </span>
                      <span
                        className="text-[13px] font-bold text-slate-900 dark:text-white font-mono tabular-nums whitespace-nowrap block mt-0.5 truncate"
                        title={formatBRL(summary.cifAllocated)}
                      >
                        {formatBRL(summary.cifAllocated)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        Rateio automático
                      </span>
                    </div>

                    <div className="min-w-0 sm:border-l sm:border-slate-200/80 dark:sm:border-white/[0.12] sm:pl-3.5">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 block truncate">
                        Custo Fabril Total
                      </span>
                      <span
                        className={`text-[13px] font-extrabold font-mono tabular-nums whitespace-nowrap block mt-0.5 truncate ${
                          isExceeded
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                        title={formatBRL(summary.totalManufacturingCost)}
                      >
                        {formatBRL(summary.totalManufacturingCost)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold font-mono tabular-nums block truncate ${
                          isExceeded
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatBRL(summary.unitCost)} / {op.unit}
                      </span>
                    </div>
                  </div>

                  {monitoring.hasStipulatedPrice && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-white/[0.08] space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
                        <span className="text-slate-500 dark:text-zinc-400 truncate">
                          Venda estipulada: <strong className="text-slate-800 dark:text-zinc-200 font-mono">{formatBRL(monitoring.stipulatedTotalPrice)}</strong>
                          {' '}({formatBRL(monitoring.stipulatedUnitPrice)}/{op.unit})
                        </span>
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            isExceeded
                              ? 'text-rose-600 dark:text-rose-400'
                              : isWarning
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatNumber(monitoring.consumptionPercent, 1)}% do preço
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isExceeded
                              ? 'bg-rose-500'
                              : isWarning
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, monitoring.consumptionPercent))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Zone: Actions */}
                <div className="flex flex-wrap items-center justify-start xl:justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenCostSheet(op)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-white bg-slate-900/[0.04] dark:bg-white/[0.08] hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.16] border border-slate-300/70 dark:border-white/[0.15] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Visualizar e Imprimir Ficha de Custo (Job Cost Sheet)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ficha de Custo</span>
                  </button>

                  {op.status === 'em_elaboracao' && (
                    <motion.button
                      type="button"
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                      onClick={() => onOpenAddCost(op)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-900/[0.06] dark:bg-white/[0.12] hover:bg-slate-900/[0.1] dark:hover:bg-white/[0.2] border border-slate-300 dark:border-white/[0.22] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      title="Lançar Requisição de Material (RMA) ou Horas de MOD"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Custos</span>
                    </motion.button>
                  )}

                  <AnimatePresence mode="popLayout" initial={false}>
                    {op.status === 'em_elaboracao' && (
                      <motion.button
                        key="btn-encerrar"
                        type="button"
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                        transition={{ type: 'spring', stiffness: 440, damping: 25 }}
                        onClick={() => onChangeOrderStatus(op.id, 'encerrada')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold dash-cobalt-btn rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Concluir Ordem e Transferir de PeE para Produtos Acabados (PA)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Encerrar p/ PA</span>
                      </motion.button>
                    )}

                    {op.status === 'encerrada' && (
                      <motion.button
                        key="btn-faturar"
                        type="button"
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                        transition={{ type: 'spring', stiffness: 440, damping: 25 }}
                        onClick={() => onChangeOrderStatus(op.id, 'faturada')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Faturar e Entregar ao Cliente (Baixa para CPV)"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Faturar (CPV)</span>
                      </motion.button>
                    )}

                    {op.status === 'faturada' && (
                      <motion.button
                        key="btn-estornar"
                        type="button"
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
                        whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 440, damping: 25 }}
                        onClick={() => onChangeOrderStatus(op.id, 'encerrada')}
                        className="text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white underline px-2 py-1 cursor-pointer whitespace-nowrap shrink-0"
                        title="Retornar para Estoque de Produtos Acabados (Estorno de Venda)"
                      >
                        Estornar p/ PA
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => onOpenEditOrder(op)}
                    className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
                    title="Editar Ordem"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteOrder(op.id)}
                    className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-300 rounded-full hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Excluir Ordem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
