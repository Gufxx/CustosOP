import { useRef, useState, type MouseEvent } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Check,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  FileDown,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ProductionOrder,
  OrderCostSummary,
  CIFConfiguration,
  CompanyParameters,
} from '../types/costing';
import {
  formatBRL,
  formatNumber,
  getAllocationBaseLabel,
  getAllocationBaseUnit,
  getOrderCostMonitoring,
} from '../utils/costCalculations';
import { exportJobCostSheetPDF } from '../utils/pdfExport';

interface JobCostSheetModalProps {
  order: ProductionOrder | null;
  summary?: OrderCostSummary;
  cifConfig: CIFConfiguration;
  effectiveCIFRate: number;
  companyParams: CompanyParameters;
  onClose: () => void;
}

export function JobCostSheetModal({
  order,
  summary,
  cifConfig,
  effectiveCIFRate,
  companyParams,
  onClose,
}: JobCostSheetModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [pdfGenerated, setPdfGenerated] = useState(false);

  if (!order) return null;

  const directCosts = summary || {
    orderId: order.id,
    code: order.code,
    totalMD: 0,
    totalMOD: 0,
    totalMODHours: 0,
    machineHours: order.machineHours || 0,
    costPrimario: 0,
    cifAllocated: 0,
    costTransformacao: 0,
    totalManufacturingCost: 0,
    unitCost: 0,
    revenue: 0,
    taxes: 0,
    netRevenue: 0,
    cpv: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
  };

  const monitoring = getOrderCostMonitoring(order, directCosts);

  const handleExportPDF = () => {
    exportJobCostSheetPDF({
      order,
      summary: directCosts,
      cifConfig,
      effectiveCIFRate,
      companyParams,
    });
    setPdfGenerated(true);
    setTimeout(() => setPdfGenerated(false), 2600);
  };

  const handlePrint = () => {
    try {
      if (window.self === window.top) {
        window.print();
        return;
      }
    } catch {
      // ignore sandboxed iframe restriction
    }
    handleExportPDF();
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 dark:bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:static print:p-0 print:bg-white print:backdrop-blur-none"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="dash-modal apple-card-spotlight rounded-[28px] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none print:rounded-none print:bg-white print:backdrop-blur-none"
      >
        {/* Subtle Glass Top Specular Highlight Strip */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 via-white/10 to-transparent dark:from-white/[0.09] dark:via-white/[0.025] dark:to-transparent print:hidden"
        />

        {/* Modal Top Actions (Hidden on Print) */}
        <div className="relative p-4 border-b border-slate-900/[0.08] dark:border-white/[0.12] flex items-center justify-between gap-3 bg-white/35 dark:bg-white/[0.04] backdrop-blur-xl print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 icon-calc-accent" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              Ficha de Custos da Ordem de Produção (Job Cost Sheet)
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full text-slate-700 dark:text-zinc-100 bg-slate-900/[0.06] hover:bg-slate-900/[0.12] dark:bg-white/[0.1] dark:hover:bg-white/[0.18] border border-slate-300/70 dark:border-white/[0.18] transition-all cursor-pointer active:scale-95"
              title="Imprimir apenas a Ficha de Custos desta Ordem de Produção"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 border border-slate-900 dark:border-white shadow-lg transition-all cursor-pointer active:scale-95"
              title="Gerar e baixar PDF formatado apenas com os detalhes desta Ordem de Produção"
            >
              {pdfGenerated ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>PDF Gerado!</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Exportar PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/15 rounded-full transition-colors cursor-pointer"
              aria-label="Fechar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Body */}
        <div ref={printRef} className="relative p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 dark:text-zinc-200 print:p-4 print:text-black print:bg-white">
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-300/70 dark:border-white/[0.14] print:border-black pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                  {companyParams.companyName}
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 print:text-slate-600 font-medium">
                  Departamento de Contabilidade de Custos & Controladoria Fabril
                </p>
              </div>
              <div className="sm:text-right">
                <span className="inline-block text-[11px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-400 print:text-slate-500">
                  Documento Contábil
                </span>
                <p className="text-lg font-mono font-black text-slate-900 dark:text-white print:text-black">
                  FICHA DE CUSTO Nº {order.code}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 print:text-slate-600">
                  Período: {companyParams.periodName}
                </span>
              </div>
            </div>
          </div>

          {/* Order Metadata Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 dash-inset print:bg-slate-50 p-4 rounded-2xl print:border-slate-300 text-xs">
            <div>
              <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 font-semibold block text-[10px]">
                Cliente / Encomendante
              </span>
              <span className="font-bold text-slate-900 dark:text-white print:text-black text-sm">{order.clientName}</span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 font-semibold block text-[10px]">
                Status Contábil
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-xs mt-0.5">
                {order.status === 'em_elaboracao' && (
                  <span className="text-amber-600 dark:text-amber-300 print:text-black">
                    Em Elaboração (PeE)
                  </span>
                )}
                {order.status === 'encerrada' && (
                  <span className="text-slate-700 dark:text-zinc-200 print:text-black">
                    Concluída / Em Estoque (PA)
                  </span>
                )}
                {order.status === 'faturada' && (
                  <span className="text-emerald-600 dark:text-emerald-300 print:text-black">
                    Faturada / Entregue (CPV)
                  </span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 font-semibold block text-[10px]">
                Quantidade do Lote
              </span>
              <span className="font-bold text-slate-900 dark:text-white print:text-black text-sm font-mono tabular-nums">
                {order.quantity} {order.unit}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 font-semibold block text-[10px]">
                Datas (Início / Entrega)
              </span>
              <span className="font-medium text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                {order.startDate} a {order.targetDate}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/80 dark:border-white/[0.08] print:border-slate-200">
              <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 font-semibold block text-[10px]">
                Descrição e Especificação Técnica do Produto
              </span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black text-xs sm:text-sm">
                {order.productDescription}
              </span>
            </div>
          </div>

          {/* Section 1: Materiais Diretos (MD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                1. Materiais Diretos Requisitados (MD)
              </h4>
              <span className="text-xs font-bold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                Subtotal MD: {formatBRL(directCosts.totalMD)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 rounded-xl overflow-hidden">
                <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] print:bg-slate-100 text-slate-700 dark:text-zinc-300 print:text-black font-semibold border-b border-slate-200/80 dark:border-white/[0.08] print:border-slate-300">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Nº RMA</th>
                    <th className="py-2 px-3">Código Item</th>
                    <th className="py-2 px-3">Descrição do Material</th>
                    <th className="py-2 px-3 text-right">Qtde</th>
                    <th className="py-2 px-3 text-right">Custo Unit.</th>
                    <th className="py-2 px-3 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07] print:divide-slate-200">
                  {order.materials && order.materials.length > 0 ? (
                    order.materials.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 print:text-slate-600 font-mono tabular-nums">{m.date}</td>
                        <td className="py-2 px-3 font-mono text-slate-900 dark:text-white print:text-black">{m.reqNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-zinc-300 print:text-slate-700">{m.itemCode}</td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white print:text-black">{m.description}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white print:text-black">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-zinc-300 print:text-slate-700">{formatBRL(m.unitCost)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white print:text-black">
                          {formatBRL(m.totalCost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-slate-400 dark:text-zinc-500 print:text-slate-500 italic">
                        Nenhum material direto requisitado para esta ordem até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Mão de Obra Direta (MOD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                2. Mão de Obra Direta Apontada (MOD)
              </h4>
              <span className="text-xs font-bold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                Subtotal MOD: {formatBRL(directCosts.totalMOD)} ({directCosts.totalMODHours} horas)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 rounded-xl overflow-hidden">
                <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] print:bg-slate-100 text-slate-700 dark:text-zinc-300 print:text-black font-semibold border-b border-slate-200/80 dark:border-white/[0.08] print:border-slate-300">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Colaborador / Operador</th>
                    <th className="py-2 px-3">Função / Especialidade</th>
                    <th className="py-2 px-3 text-right">Horas (h)</th>
                    <th className="py-2 px-3 text-right">Taxa Horária (c/ enc.)</th>
                    <th className="py-2 px-3 text-right">Custo Total MOD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07] print:divide-slate-200">
                  {order.labor && order.labor.length > 0 ? (
                    order.labor.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 print:text-slate-600 font-mono tabular-nums">{l.date}</td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white print:text-black">{l.workerName}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-zinc-300 print:text-slate-700">{l.role}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white print:text-black">{l.hours} h</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-zinc-300 print:text-slate-700">{formatBRL(l.hourlyRate)}/h</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white print:text-black">
                          {formatBRL(l.totalCost)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400 dark:text-zinc-500 print:text-slate-500 italic">
                        Nenhum apontamento de mão de obra direta registrado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Custos Indiretos de Fabricação Apropriados (CIF) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
                3. Apropriação de Custos Indiretos de Fabricação (CIF)
              </h4>
              <span className="text-xs font-bold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                Subtotal CIF Apropriado: {formatBRL(directCosts.cifAllocated)}
              </span>
            </div>

            <div className="dash-inset print:bg-slate-50 p-4 rounded-2xl print:border-slate-300 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 text-[11px] block">Base de Rateio Adotada:</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black">
                    {getAllocationBaseLabel(cifConfig.allocationBase)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 text-[11px] block">Taxa de CIF Aplicada:</span>
                  <span className="font-bold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                    {formatBRL(effectiveCIFRate)} por {getAllocationBaseUnit(cifConfig.allocationBase)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 print:text-slate-500 text-[11px] block">Método de Custeio:</span>
                  <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                    {cifConfig.method === 'taxa_real' ? 'Taxa Efetiva Real (A posteriori)' : 'Taxa Pré-Determinada (A priori)'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 print:text-slate-600 pt-2 border-t border-slate-200/80 dark:border-white/[0.08] print:border-slate-200">
                Fórmula de Apropriação: <code>CIF = Base da Ordem × Taxa de Aplicação de CIF</code>
              </p>
            </div>
          </div>

          {/* Section 4: Demonstrativo Consolidado de Custos da OP */}
          <div className="dash-inset rounded-2xl p-5 space-y-4 print:bg-white print:text-black print:border-2 print:border-black">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white print:text-black">
              4. Síntese e Custo Unitário de Fabricação
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Custo Primário (MD + MOD)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                  {formatBRL(directCosts.costPrimario)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 print:text-slate-600 block">
                  Custo Transformação (MOD + CIF)
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                  {formatBRL(directCosts.costTransformacao)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/[0.06] dark:bg-white/[0.1] border border-slate-300/70 dark:border-white/[0.22] print:bg-slate-100 print:border-black">
                <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-zinc-200 print:text-slate-600 block">
                  Custo Fabril Total
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                  {formatBRL(directCosts.totalManufacturingCost)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 print:bg-slate-100 print:border-black">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-200 print:text-slate-600 block">
                  Custo Unitário da OP
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                  {formatBRL(directCosts.unitCost)} / {order.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Análise Comercial & Monitoramento de Preço (se aplicável) */}
          {monitoring.hasStipulatedPrice && (
            <div
              className={`print:bg-slate-50 p-4 rounded-2xl border print:border-slate-300 text-xs space-y-2.5 ${
                monitoring.level === 'exceeded'
                  ? 'bg-rose-500/10 border-rose-500/35'
                  : monitoring.level === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider print:text-black ${
                    monitoring.level === 'exceeded'
                      ? 'text-rose-700 dark:text-rose-300'
                      : monitoring.level === 'warning'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  5. Análise Comercial e Monitoramento de Custo vs. Preço
                </h4>

                {monitoring.level === 'exceeded' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-200 border border-rose-500/40 print:border-black print:text-black">
                    <AlertOctagon className="w-3 h-3 shrink-0" />
                    <span>Custo Acima do Preço (+{formatBRL(monitoring.excessAmount)})</span>
                  </span>
                )}
                {monitoring.level === 'warning' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 print:border-black print:text-black">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Atenção: {formatNumber(monitoring.consumptionPercent, 1)}% do Preço</span>
                  </span>
                )}
                {monitoring.level === 'healthy' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 print:border-black print:text-black">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>Dentro do Preço ({formatNumber(monitoring.consumptionPercent, 1)}%)</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-900 dark:text-white print:text-black font-mono tabular-nums">
                <div>
                  <span className="font-sans text-slate-500 dark:text-zinc-400 print:text-slate-600 block text-[10px]">Preço de Venda Unit.:</span>
                  <span className="font-bold">{formatBRL(monitoring.stipulatedUnitPrice)}</span>
                </div>
                <div>
                  <span className="font-sans text-slate-500 dark:text-zinc-400 print:text-slate-600 block text-[10px]">Venda Estipulada Total:</span>
                  <span className="font-bold">{formatBRL(monitoring.stipulatedTotalPrice)}</span>
                </div>
                <div>
                  <span className="font-sans text-slate-500 dark:text-zinc-400 print:text-slate-600 block text-[10px]">
                    {order.status === 'faturada' ? 'Lucro Bruto da OP:' : 'Saldo p/ Preço Estip.:'}
                  </span>
                  <span
                    className={`font-bold print:text-black ${
                      (order.status === 'faturada' ? directCosts.grossProfit : monitoring.remainingAmount) < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-300'
                    }`}
                  >
                    {formatBRL(order.status === 'faturada' ? directCosts.grossProfit : monitoring.remainingAmount)}
                  </span>
                </div>
                <div>
                  <span className="font-sans text-slate-500 dark:text-zinc-400 print:text-slate-600 block text-[10px]">
                    {order.status === 'faturada' ? 'Margem Bruta (%):' : 'Custo / Preço (%):'}
                  </span>
                  <span
                    className={`font-bold print:text-black ${
                      monitoring.level === 'exceeded' || (order.status === 'faturada' && directCosts.grossMarginPercent < 0)
                        ? 'text-rose-600 dark:text-rose-400'
                        : monitoring.level === 'warning'
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-emerald-600 dark:text-emerald-300'
                    }`}
                  >
                    {order.status === 'faturada'
                      ? `${formatNumber(directCosts.grossMarginPercent, 1)}%`
                      : `${formatNumber(monitoring.consumptionPercent, 1)}%`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Signature Footer on Print */}
          <div className="pt-8 mt-6 border-t border-slate-200/80 dark:border-white/[0.1] print:border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 dark:text-zinc-400 print:text-slate-600">
            <div>
              <div className="border-t border-slate-300 dark:border-white/25 print:border-black w-3/4 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-900 dark:text-white print:text-black">Contador / Controller Responsável</p>
              <p className="text-[10px]">CRC / Registro Profissional</p>
            </div>
            <div>
              <div className="border-t border-slate-300 dark:border-white/25 print:border-black w-3/4 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-900 dark:text-white print:text-black">Gerência de Produção & Fábrica</p>
              <p className="text-[10px]">Aprovação Técnica e Encerramento da OP</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
