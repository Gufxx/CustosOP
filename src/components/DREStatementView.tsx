import {
  TrendingUp,
  CheckCircle2,
  FileText,
  Printer,
} from 'lucide-react';
import { ProductionOrder, OrderCostSummary } from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';

interface DREStatementViewProps {
  dre: {
    grossRevenue: number;
    salesTaxes: number;
    netRevenue: number;
    baseCPV: number;
    cifVariance: number;
    adjustedCPV: number;
    grossProfit: number;
    grossMarginPercent: number;
    commercialExpenses: number;
    administrativeExpenses: number;
    totalOperatingExpenses: number;
    operatingProfit: number;
    operatingMarginPercent: number;
    invoicedCount: number;
  };
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  onExportPrint?: () => void;
}

export function DREStatementView({
  dre,
  orders,
  summaries,
  onExportPrint,
}: DREStatementViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formal DRE Statement Table (7 columns) */}
        <div className="lg:col-span-7 dash-card rounded-[24px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-900 dark:text-white" />
                Demonstração do Resultado do Exercício (DRE)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Apuração oficial de resultado das ordens faturadas e entregues no período
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 tabular-nums">
                {dre.invoicedCount} OP{dre.invoicedCount !== 1 ? 's' : ''} Faturada{dre.invoicedCount !== 1 ? 's' : ''}
              </span>
              {onExportPrint && (
                <button
                  type="button"
                  onClick={onExportPrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold dash-cobalt-btn rounded-full transition-all cursor-pointer whitespace-nowrap"
                  title="Imprimir ou gerar PDF consolidado da DRE e resumo das Ordens de Produção"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Exportar DRE &amp; OPs</span>
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-white/[0.07] text-xs">
            <div className="py-2.5 flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span>(=) Receita Bruta de Vendas (Ordens Faturadas)</span>
              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
                {formatBRL(dre.grossRevenue)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) Tributos sobre Vendas e Serviços</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-300">
                - {formatBRL(dre.salesTaxes)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white dash-inset px-3 rounded-xl">
              <span>(=) Receita Operacional Líquida</span>
              <span className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
                {formatBRL(dre.netRevenue)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) Custo dos Produtos Vendidos (CPV Fabril das OPs)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-300">
                - {formatBRL(dre.baseCPV)}
              </span>
            </div>

            {Math.abs(dre.cifVariance) > 0.01 && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>
                  {dre.cifVariance > 0
                    ? '(-) Ajuste de Subaplicação de CIF'
                    : '(+) Ajuste de Sobreaplicação de CIF'}
                </span>
                <span
                  className={`font-mono tabular-nums font-medium ${
                    dre.cifVariance > 0
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  {dre.cifVariance > 0
                    ? `- ${formatBRL(dre.cifVariance)}`
                    : `+ ${formatBRL(Math.abs(dre.cifVariance))}`}
                </span>
              </div>
            )}

            <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white bg-slate-900/[0.05] dark:bg-white/[0.1] px-3 rounded-xl border border-slate-300/70 dark:border-white/[0.18]">
              <div>
                <span className="font-extrabold">(=) Lucro Operacional Bruto</span>
                <span className="text-[11px] text-slate-600 dark:text-zinc-300 ml-2 font-medium tabular-nums">
                  (Margem Bruta: {formatNumber(dre.grossMarginPercent, 1)}%)
                </span>
              </div>
              <span className="font-mono tabular-nums text-sm font-extrabold text-slate-900 dark:text-white">
                {formatBRL(dre.grossProfit)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) Despesas com Vendas e Comerciais</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                - {formatBRL(dre.commercialExpenses)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) Despesas Administrativas e Gerais</span>
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                - {formatBRL(dre.administrativeExpenses)}
              </span>
            </div>

            <div
              className={`py-3 flex items-center justify-between font-bold text-sm px-3.5 rounded-2xl border ${
                dre.operatingProfit >= 0
                  ? 'dash-hero-glass text-white border-white/20'
                  : 'bg-rose-950 text-white border-rose-500/40'
              }`}
            >
              <div>
                <span>(=) Resultado Operacional Líquido</span>
                <span className="text-[11px] font-medium text-zinc-300 ml-2 tabular-nums">
                  (Margem Líquida: {formatNumber(dre.operatingMarginPercent, 1)}%)
                </span>
              </div>
              <span className="font-mono tabular-nums text-base tracking-tight text-emerald-300">
                {formatBRL(dre.operatingProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Highlights & Financial Insights (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="dash-card rounded-[24px] p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-900 dark:text-white" />
              Indicadores Financeiros de Custos
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="dash-inset p-3.5 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block">
                  Margem Bruta
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 block">
                  {formatNumber(dre.grossMarginPercent, 1)}%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-400 block mt-0.5">
                  Lucro Bruto / Rec. Líquida
                </span>
              </div>

              <div className="dash-inset p-3.5 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block">
                  Margem Líquida
                </span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300 font-mono tabular-nums mt-0.5 block">
                  {formatNumber(dre.operatingMarginPercent, 1)}%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-400 block mt-0.5">
                  Lucro Oper. / Rec. Líquida
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 pt-3 border-t border-slate-200/80 dark:border-white/[0.08] font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="font-sans">Participação do CPV na Receita:</span>
                <strong className="text-slate-900 dark:text-white">
                  {dre.netRevenue > 0
                    ? `${formatNumber((dre.adjustedCPV / dre.netRevenue) * 100, 1)}%`
                    : '0%'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="font-sans">Despesas Operacionais Totais:</span>
                <strong className="text-slate-900 dark:text-white">{formatBRL(dre.totalOperatingExpenses)}</strong>
              </div>
            </div>
          </div>

          <div className="dash-card rounded-[24px] p-4 text-xs space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
              Visão do Controller
            </h5>
            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
              No sistema de custeio por ordem, cada encomenda possui sua própria lucratividade individual. Ordens não finalizadas (PeE) ou concluídas sem faturamento (PA) <strong className="text-slate-900 dark:text-white">não transitam pelo resultado</strong> e permanecem ativadas no Balanço Patrimonial (Estoques), respeitando o Princípio da Competência e o CPC 16.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Rentabilidade Individual */}
      <div className="dash-card rounded-[24px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08]">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Análise de Rentabilidade por Ordem de Produção
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Desempenho financeiro individual de cada encomenda cadastrada
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200/80 dark:border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Custo Fabril Total</th>
                <th className="py-3 px-4 text-right">Custo Unitário</th>
                <th className="py-3 px-4 text-right">Preço de Venda</th>
                <th className="py-3 px-4 text-right">Receita Bruta</th>
                <th className="py-3 px-4 text-right">Lucro Bruto</th>
                <th className="py-3 px-4 text-right">Margem (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07]">
              {orders.map((op) => {
                const summary = summaries[op.id] || {
                  totalManufacturingCost: 0,
                  unitCost: 0,
                  revenue: 0,
                  grossProfit: 0,
                  grossMarginPercent: 0,
                };

                return (
                  <tr key={op.id} className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{op.code}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{op.clientName}</td>
                    <td className="py-2.5 px-4">
                      {op.status === 'em_elaboracao' && (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                          Em Elaboração
                        </span>
                      )}
                      {op.status === 'encerrada' && (
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                          Concluída (PA)
                        </span>
                      )}
                      {op.status === 'faturada' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                          Faturada
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                      {formatBRL(summary.totalManufacturingCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                      {formatBRL(summary.unitCost)} / {op.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                      {op.sellingPriceUnit ? formatBRL(op.sellingPriceUnit) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {op.status === 'faturada' ? formatBRL(summary.revenue) : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                      {op.status === 'faturada' ? (
                        <span
                          className={
                            summary.grossProfit >= 0
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-rose-600 dark:text-rose-300'
                          }
                        >
                          {formatBRL(summary.grossProfit)}
                        </span>
                      ) : (
                        <span className="font-sans font-normal text-slate-400 dark:text-zinc-500 italic">
                          Pendente faturamento
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                      {op.status === 'faturada' ? (
                        <span
                          className={
                            summary.grossMarginPercent >= 0
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-rose-600 dark:text-rose-300'
                          }
                        >
                          {formatNumber(summary.grossMarginPercent, 1)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
