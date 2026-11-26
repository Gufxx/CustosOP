import { useState } from 'react';
import { ProductionOrder, OrderCostSummary } from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';

interface CostTrendChartProps {
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  totalManufacturingCost: number;
  grossMarginPercent: number;
  onSelectOrder: (order: ProductionOrder) => void;
}

export function CostTrendChart({
  orders,
  summaries,
  totalManufacturingCost,
  grossMarginPercent,
  onSelectOrder,
}: CostTrendChartProps) {
  const [metricView, setMetricView] = useState<'all' | 'direct'>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartOrders = orders.slice(0, 10);
  const activeIdx =
    hoveredIdx !== null && hoveredIdx < chartOrders.length
      ? hoveredIdx
      : chartOrders.length > 0
      ? Math.min(chartOrders.length - 1, Math.floor(chartOrders.length * 0.65))
      : 0;

  const width = 680;
  const height = 220;
  const padX = 34;
  const padY = 26;

  const dataPoints = chartOrders.map((op) => {
    const s = summaries[op.id];
    const total = s?.totalManufacturingCost || 0;
    const direct = s?.costPrimario || 0;
    const cif = s?.cifAllocated || 0;
    return {
      op,
      total,
      direct,
      cif,
      label: op.code,
    };
  });

  const maxVal = Math.max(
    1,
    ...dataPoints.map((d) => Math.max(d.total, d.direct, d.cif))
  );

  const getCoords = (values: number[]) => {
    if (values.length === 0) return [];
    if (values.length === 1) {
      return [
        { x: padX, y: height - padY - (values[0] / maxVal) * (height - padY * 2) },
        { x: width - padX, y: height - padY - (values[0] / maxVal) * (height - padY * 2) },
      ];
    }
    return values.map((v, i) => ({
      x: padX + (i / (values.length - 1)) * (width - padX * 2),
      y: height - padY - (v / maxVal) * (height - padY * 2),
    }));
  };

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const primarySeries =
    metricView === 'all'
      ? dataPoints.map((d) => d.total)
      : dataPoints.map((d) => d.direct);
  const secondarySeries =
    metricView === 'all'
      ? dataPoints.map((d) => d.direct)
      : dataPoints.map((d) => d.cif);

  const primaryCoords = getCoords(primarySeries);
  const secondaryCoords = getCoords(secondarySeries);

  const primaryPath = buildSmoothPath(primaryCoords);
  const secondaryPath = buildSmoothPath(secondaryCoords);

  const areaPath =
    primaryCoords.length > 1
      ? `${primaryPath} L ${primaryCoords[primaryCoords.length - 1].x} ${height - padY} L ${primaryCoords[0].x} ${height - padY} Z`
      : '';

  const activePoint = primaryCoords[activeIdx] || null;
  const activeData = dataPoints[activeIdx] || null;

  return (
    <div className="dash-card rounded-[24px] p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            Acumulação Fabril por Ordem
          </span>
          <div className="flex flex-wrap items-baseline gap-2.5 mt-1">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBRL(totalManufacturingCost)}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              Margem {formatNumber(grossMarginPercent, 1)}%
            </span>
          </div>
        </div>

        {/* Interactive Pill View Selector */}
        <div className="inline-flex rounded-full p-1 bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/[0.1] text-xs gap-1">
          <button
            type="button"
            onClick={() => setMetricView('all')}
            className={`px-3.5 py-1 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
              metricView === 'all'
                ? 'dash-nav-pill-active font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Total vs. Primário
          </button>
          <button
            type="button"
            onClick={() => setMetricView('direct')}
            className={`px-3.5 py-1 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
              metricView === 'direct'
                ? 'dash-nav-pill-active font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Primário vs. CIF
          </button>
        </div>
      </div>

      {/* Glowing Curve Chart (SVG) */}
      <div className="mt-4 relative">
        {dataPoints.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
            Nenhuma ordem cadastrada para exibir o gráfico.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[210px] overflow-visible"
            role="img"
            aria-label="Gráfico de custos acumulados por ordem de produção"
          >
            <defs>
              <linearGradient id="cobaltAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B66F5" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#3B66F5" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="cobaltStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B66F5" />
                <stop offset="55%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>
              <filter id="glowPoint" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal subtle grid lines */}
            {[0.25, 0.5, 0.75, 1].map((t, i) => {
              const y = height - padY - t * (height - padY * 2);
              return (
                <line
                  key={i}
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-white/[0.07]"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#cobaltAreaGrad)" />}

            {/* Secondary Curve */}
            {secondaryPath && (
              <path
                d={secondaryPath}
                fill="none"
                stroke="#94A3B8"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}

            {/* Primary Glowing Curve */}
            {primaryPath && (
              <path
                d={primaryPath}
                fill="none"
                stroke="url(#cobaltStrokeGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}

            {/* Active Pin Vertical Line & Glowing Node */}
            {activePoint && activeData && (
              <g>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={padY - 4}
                  y2={height - padY}
                  stroke="currentColor"
                  className="text-[#3B66F5]/40 dark:text-white/35"
                  strokeWidth="1.2"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="6"
                  fill="#60A5FA"
                  filter="url(#glowPoint)"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="3"
                  fill="#FFFFFF"
                />
              </g>
            )}

            {/* Interactive Hover Targets & X-Axis Labels */}
            {dataPoints.map((d, idx) => {
              const pt = primaryCoords[idx];
              if (!pt) return null;
              return (
                <g
                  key={d.op.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => onSelectOrder(d.op)}
                >
                  <rect
                    x={pt.x - 24}
                    y={0}
                    width="48"
                    height={height}
                    fill="transparent"
                  />
                  <text
                    x={pt.x}
                    y={height - 6}
                    textAnchor="middle"
                    className={`text-[11px] font-mono ${
                      idx === activeIdx
                        ? 'fill-slate-900 dark:fill-white font-bold'
                        : 'fill-slate-400 dark:fill-zinc-500'
                    }`}
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Active Callout Footer */}
        {activeData && (
          <div className="mt-2 pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
              <span className="font-mono font-bold text-[#3B66F5] dark:text-blue-400">
                {activeData.op.code}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                {activeData.op.clientName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-[11px]">
              <span className="text-slate-600 dark:text-zinc-300">
                Total: <strong className="text-slate-900 dark:text-white">{formatBRL(activeData.total)}</strong>
              </span>
              <span className="text-slate-600 dark:text-zinc-300">
                Primário: <strong className="text-slate-900 dark:text-zinc-100">{formatBRL(activeData.direct)}</strong>
              </span>
              <span className="text-[#3B66F5] dark:text-blue-400">
                CIF: <strong>{formatBRL(activeData.cif)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
