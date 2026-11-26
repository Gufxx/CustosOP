import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Calculator } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  formatBRL,
  formatNumber,
  getAllocationBaseLabel,
  getAllocationBaseUnit,
} from '../utils/costCalculations';
import { CIFConfiguration } from '../types/costing';

interface CostOverviewCardsProps {
  totalManufacturingCost: number;
  totalMD: number;
  totalMOD: number;
  totalCIF: number;
  wipBalance: number;
  wipCount: number;
  finishedGoodsBalance: number;
  finishedCount: number;
  cpvBalance: number;
  invoicedCount: number;
  grossRevenue: number;
  grossMarginPercent: number;
  cifConfig: CIFConfiguration;
  effectiveCIFRate: number;
  totalAllocationBase: number;
  cifVariance: number;
  onJumpToCIF: () => void;
}

function useAnimatedValue(target: number, duration = 620): number {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState<number>(target);
  const currentRef = useRef<number>(target);
  const isFirstMount = useRef<boolean>(true);

  useEffect(() => {
    if (shouldReduceMotion) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    const from = isFirstMount.current ? target * 0.88 : currentRef.current;
    isFirstMount.current = false;

    if (Math.abs(target - from) < 0.005) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Apple quartic ease-out
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = from + (target - from) * eased;
      currentRef.current = next;
      setDisplay(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, shouldReduceMotion]);

  return display;
}

function handleCardMouseMove(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export function CostOverviewCards({
  totalManufacturingCost,
  totalMD,
  totalMOD,
  totalCIF,
  wipBalance,
  wipCount,
  finishedGoodsBalance,
  finishedCount,
  cpvBalance,
  invoicedCount,
  grossRevenue,
  grossMarginPercent,
  cifConfig,
  effectiveCIFRate,
  totalAllocationBase,
  cifVariance,
  onJumpToCIF,
}: CostOverviewCardsProps) {
  const shouldReduceMotion = useReducedMotion();

  const animTotalCost = useAnimatedValue(totalManufacturingCost);
  const animMD = useAnimatedValue(totalMD);
  const animMOD = useAnimatedValue(totalMOD);
  const animCIF = useAnimatedValue(totalCIF);
  const animWIP = useAnimatedValue(wipBalance);
  const animFinished = useAnimatedValue(finishedGoodsBalance);
  const animCPV = useAnimatedValue(cpvBalance);
  const animRevenue = useAnimatedValue(grossRevenue);
  const animMargin = useAnimatedValue(grossMarginPercent);
  const animAllocBase = useAnimatedValue(totalAllocationBase);
  const animCIFRate = useAnimatedValue(effectiveCIFRate);

  const cardMotion = (index: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14, scale: 0.985 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: {
            type: 'spring' as const,
            stiffness: 320,
            damping: 28,
            delay: index * 0.055,
          },
          whileHover: {
            y: -3,
            transition: { type: 'spring' as const, stiffness: 380, damping: 26 },
          },
        };

  return (
    <div className="space-y-4">
      {/* Row 1: Full-Width CIF Summary Banner */}
      <motion.button
        type="button"
        onClick={onJumpToCIF}
        onMouseMove={handleCardMouseMove}
        {...cardMotion(0)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.995 }}
        className="group/kpi w-full text-left dash-card apple-card-spotlight rounded-[26px] px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-slate-300 dark:hover:border-white/30 cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 icon-calc-accent" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">
                Apropriação de Custos Indiretos (CIF)
              </span>
              <span aria-hidden="true" className="text-slate-400 dark:text-zinc-500">·</span>
              <span className="text-slate-600 dark:text-zinc-400">
                {cifConfig.method === 'taxa_real' ? 'Taxa Efetiva Real' : 'Taxa Pré-Determinada'}
              </span>
              {cifConfig.method === 'taxa_predeterminada' && Math.abs(cifVariance) > 0.01 && (
                <>
                  <span aria-hidden="true" className="text-slate-400 dark:text-zinc-500">·</span>
                  <span
                    className={`font-semibold font-mono tabular-nums ${
                      cifVariance > 0
                        ? 'text-amber-600 dark:text-amber-300'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {cifVariance > 0
                      ? `Subaplicação ${formatBRL(cifVariance)}`
                      : `Sobreaplicação ${formatBRL(Math.abs(cifVariance))}`}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
              Base de Rateio:{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {getAllocationBaseLabel(cifConfig.allocationBase)}
              </strong>
            </p>
          </div>
        </div>

        <div className="dash-inset rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-5 shrink-0">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
              Base Acumulada
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatNumber(animAllocBase, 2)}{' '}
              {getAllocationBaseUnit(cifConfig.allocationBase)}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-200 dark:bg-white/[0.12] hidden sm:block" />
          <div>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
              Taxa de CIF Aplicada
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBRL(animCIFRate)} / {getAllocationBaseUnit(cifConfig.allocationBase)}
            </span>
          </div>
        </div>
      </motion.button>

      {/* Row 2: 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Custo Fabril Total */}
        <motion.div
          onMouseMove={handleCardMouseMove}
          {...cardMotion(1)}
          className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 min-w-0 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/30"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate transition-colors duration-300 group-hover/kpi:text-slate-700 dark:group-hover/kpi:text-zinc-200">
                Custo Fabril Total
              </span>
              <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 overflow-visible"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path
                    className="icon-layer-top"
                    d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
                  />
                  <path
                    className="icon-layer-mid"
                    d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
                  />
                  <path
                    className="icon-layer-bot"
                    d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
                  />
                </svg>
              </div>
            </div>
            <h3
              className="mt-2 text-xl xl:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums truncate transition-transform duration-300 ease-out origin-left group-hover/kpi:scale-[1.015]"
              title={formatBRL(totalManufacturingCost)}
            >
              {formatBRL(animTotalCost)}
            </h3>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/[0.1] space-y-0.5 text-[11px] transition-colors duration-300 group-hover/kpi:border-slate-300/90 dark:group-hover/kpi:border-white/[0.18]">
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 -mx-2 py-0.5 transition-all duration-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] hover:translate-x-0.5">
              <span className="text-slate-500 dark:text-zinc-400">MD</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {formatBRL(animMD)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 -mx-2 py-0.5 transition-all duration-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] hover:translate-x-0.5">
              <span className="text-slate-500 dark:text-zinc-400">MOD</span>
              <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-zinc-200 whitespace-nowrap">
                {formatBRL(animMOD)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 -mx-2 py-0.5 transition-all duration-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.06] hover:translate-x-0.5">
              <span className="text-slate-500 dark:text-zinc-400">CIF</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {formatBRL(animCIF)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 2. Em Elaboração (PeE) */}
        <motion.div
          onMouseMove={handleCardMouseMove}
          {...cardMotion(2)}
          className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 min-w-0 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/30"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate transition-colors duration-300 group-hover/kpi:text-slate-700 dark:group-hover/kpi:text-zinc-200">
                Em Elaboração (PeE) · {wipCount} OP{wipCount !== 1 ? 's' : ''}
              </span>
              <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line className="icon-clock-hour" x1="12" y1="12" x2="12" y2="6" />
                  <line className="icon-clock-min" x1="12" y1="12" x2="16" y2="14" />
                </svg>
              </div>
            </div>
            <h3
              className="mt-2 text-xl xl:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums truncate transition-transform duration-300 ease-out origin-left group-hover/kpi:scale-[1.015]"
              title={formatBRL(wipBalance)}
            >
              {formatBRL(animWIP)}
            </h3>
          </div>
          <p className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400 transition-colors duration-300 group-hover/kpi:border-slate-300/90 dark:group-hover/kpi:border-white/[0.18]">
            Custos retidos nas ordens ativas na fábrica
          </p>
        </motion.div>

        {/* 3. Acabados (PA) */}
        <motion.div
          onMouseMove={handleCardMouseMove}
          {...cardMotion(3)}
          className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 min-w-0 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/30"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate transition-colors duration-300 group-hover/kpi:text-slate-700 dark:group-hover/kpi:text-zinc-200">
                Acabados (PA) · {finishedCount} OP{finishedCount !== 1 ? 's' : ''}
              </span>
              <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path className="icon-check-mark" d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <h3
              className="mt-2 text-xl xl:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums truncate transition-transform duration-300 ease-out origin-left group-hover/kpi:scale-[1.015]"
              title={formatBRL(finishedGoodsBalance)}
            >
              {formatBRL(animFinished)}
            </h3>
          </div>
          <p className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400 transition-colors duration-300 group-hover/kpi:border-slate-300/90 dark:group-hover/kpi:border-white/[0.18]">
            Ordens concluídas aguardando faturamento
          </p>
        </motion.div>

        {/* 4. CPV Faturado */}
        <motion.div
          onMouseMove={handleCardMouseMove}
          {...cardMotion(4)}
          className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 min-w-0 flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/30"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate transition-colors duration-300 group-hover/kpi:text-slate-700 dark:group-hover/kpi:text-zinc-200">
                CPV Faturado · {invoicedCount} OP{invoicedCount !== 1 ? 's' : ''}
              </span>
              <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 overflow-visible"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <g className="icon-trend-path">
                    <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
                    <path d="M16 7h6v6" />
                  </g>
                </svg>
              </div>
            </div>
            <h3
              className="mt-2 text-xl xl:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono tabular-nums truncate transition-transform duration-300 ease-out origin-left group-hover/kpi:scale-[1.015]"
              title={formatBRL(cpvBalance)}
            >
              {formatBRL(animCPV)}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.1] flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums transition-colors duration-300 group-hover/kpi:border-slate-300/90 dark:group-hover/kpi:border-white/[0.18]">
            <span className="text-slate-500 dark:text-zinc-400 truncate">
              Rec. <strong className="text-slate-900 dark:text-white">{formatBRL(animRevenue)}</strong>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
              Margem {formatNumber(animMargin, 1)}%
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
