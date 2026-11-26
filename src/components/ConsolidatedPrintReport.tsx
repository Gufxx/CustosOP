import { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Check,
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
} from '../utils/costCalculations';
import { exportConsolidatedReportPDF } from '../utils/pdfExport';

export interface ConsolidatedReportProps {
  companyParams: CompanyParameters;
  scenarioName: string;
  cifConfig: CIFConfiguration;
  effectiveCIFRate: number;
  totalAllocationBase: number;
  totalActualCIF: number;
  totalAppliedCIF: number;
  totalManufacturingCost: number;
  totalMD: number;
  totalMOD: number;
  wipBalance: number;
  wipCount: number;
  finishedGoodsBalance: number;
  finishedCount: number;
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
}

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  em_elaboracao: 'Em Elaboração (PeE)',
  encerrada: 'Concluída (PA)',
  faturada: 'Faturada (CPV)',
};

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvDecimal(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugifyPeriod(periodName: string): string {
  return periodName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function ConsolidatedReportSheet(props: ConsolidatedReportProps) {
  const {
    companyParams,
    scenarioName,
    cifConfig,
    effectiveCIFRate,
    totalAllocationBase,
    totalActualCIF,
    totalAppliedCIF,
    totalManufacturingCost,
    totalMD,
    totalMOD,
    wipBalance,
    wipCount,
    finishedGoodsBalance,
    finishedCount,
    dre,
    orders,
    summaries,
  } = props;

  const verticalAnalysis = (value: number) => {
    if (dre.netRevenue <= 0) return '—';
    return `${formatNumber((value / dre.netRevenue) * 100, 1)}%`;
  };

  const totalInvoicedRevenue = orders.reduce((acc, op) => {
    if (op.status !== 'faturada') return acc;
    return acc + (summaries[op.id]?.revenue ?? 0);
  }, 0);

  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="bg-white text-black space-y-5 font-sans">
      {/* Institutional Accounting Header */}
      <header className="border-b-2 border-black pb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Relatório Contábil Consolidado · Custeio por Ordem de Produção (CPC 16)
          </p>
          <h1 className="text-xl font-black uppercase tracking-wide text-black mt-0.5">
            {companyParams.companyName}
          </h1>
          <p className="text-[11px] text-slate-700">
            Cenário: <strong>{scenarioName}</strong> · Controladoria &amp; Contabilidade de Custos
          </p>
        </div>
        <div className="text-right text-[11px] shrink-0">
          <p className="font-bold uppercase tracking-wider text-black">
            DRE &amp; Resumo de OPs
          </p>
          <p className="text-slate-700">
            Período: <strong>{companyParams.periodName}</strong>
          </p>
          <p className="text-slate-600">Emissão: {generatedAt}</p>
        </div>
      </header>

      {/* Consolidated Manufacturing & Inventory Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] break-inside-avoid">
        <div className="border border-slate-400 rounded-md p-2.5">
          <span className="text-[9px] uppercase font-bold text-slate-600 block">
            Custo Fabril Total
          </span>
          <span className="text-sm font-black font-mono tabular-nums text-black">
            {formatBRL(totalManufacturingCost)}
          </span>
          <span className="text-[9px] text-slate-600 block mt-0.5 font-mono tabular-nums">
            MD {formatBRL(totalMD)} · MOD {formatBRL(totalMOD)}
          </span>
        </div>

        <div className="border border-slate-400 rounded-md p-2.5">
          <span className="text-[9px] uppercase font-bold text-slate-600 block">
            Em Elaboração (PeE) · {wipCount} OP{wipCount !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-black font-mono tabular-nums text-black">
            {formatBRL(wipBalance)}
          </span>
          <span className="text-[9px] text-slate-600 block mt-0.5">
            Ativo Circulante — Estoques
          </span>
        </div>

        <div className="border border-slate-400 rounded-md p-2.5">
          <span className="text-[9px] uppercase font-bold text-slate-600 block">
            Produtos Acabados (PA) · {finishedCount} OP{finishedCount !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-black font-mono tabular-nums text-black">
            {formatBRL(finishedGoodsBalance)}
          </span>
          <span className="text-[9px] text-slate-600 block mt-0.5">
            Prontos para faturamento
          </span>
        </div>

        <div className="border border-black bg-slate-100 rounded-md p-2.5">
          <span className="text-[9px] uppercase font-bold text-slate-700 block">
            Critério de Rateio CIF
          </span>
          <span className="text-sm font-black font-mono tabular-nums text-black">
            {formatBRL(effectiveCIFRate)} / {getAllocationBaseUnit(cifConfig.allocationBase)}
          </span>
          <span className="text-[9px] text-slate-700 block mt-0.5">
            {cifConfig.method === 'taxa_real' ? 'Taxa Real' : 'Taxa Pré-Det.'} ·{' '}
            {getAllocationBaseLabel(cifConfig.allocationBase)}
          </span>
        </div>
      </div>

      {/* Section 1: Formal DRE Table */}
      <div className="space-y-2 break-inside-avoid">
        <div className="flex items-baseline justify-between border-b border-black pb-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-black">
            1. Demonstração do Resultado do Exercício (DRE)
          </h2>
          <span className="text-[10px] text-slate-700 font-medium">
            {dre.invoicedCount} Ordem(ns) Faturada(s) no Período
          </span>
        </div>

        <table className="w-full text-[11px] border border-slate-400 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 text-black font-bold">
              <th className="py-1.5 px-2.5 text-left">Conta / Rubrica Contábil</th>
              <th className="py-1.5 px-2.5 text-right w-36">Valor (R$)</th>
              <th className="py-1.5 px-2.5 text-right w-20">AV (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            <tr className="font-semibold">
              <td className="py-1.5 px-2.5">(=) Receita Bruta de Vendas (Ordens Faturadas)</td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                {formatBRL(dre.grossRevenue)}
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                {verticalAnalysis(dre.grossRevenue)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 pl-6 text-slate-700">
                (-) Tributos sobre Vendas e Serviços
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                ({formatBRL(dre.salesTaxes)})
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                {verticalAnalysis(dre.salesTaxes)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className="py-1.5 px-2.5">(=) Receita Operacional Líquida</td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                {formatBRL(dre.netRevenue)}
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                {dre.netRevenue > 0 ? '100,0%' : '—'}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 pl-6 text-slate-700">
                (-) Custo dos Produtos Vendidos (CPV Fabril das OPs)
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                ({formatBRL(dre.baseCPV)})
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                {verticalAnalysis(dre.baseCPV)}
              </td>
            </tr>
            {Math.abs(dre.cifVariance) > 0.01 && (
              <tr>
                <td className="py-1.5 px-2.5 pl-6 text-slate-700">
                  {dre.cifVariance > 0
                    ? '(-) Ajuste de Subaplicação de CIF ao CPV'
                    : '(+) Ajuste de Sobreaplicação de CIF ao CPV'}
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                  {dre.cifVariance > 0
                    ? `(${formatBRL(dre.cifVariance)})`
                    : `+ ${formatBRL(Math.abs(dre.cifVariance))}`}
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                  {verticalAnalysis(Math.abs(dre.cifVariance))}
                </td>
              </tr>
            )}
            <tr className="bg-slate-100 font-bold border-t border-slate-400">
              <td className="py-1.5 px-2.5">(=) Lucro Operacional Bruto</td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                {formatBRL(dre.grossProfit)}
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                {formatNumber(dre.grossMarginPercent, 1)}%
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 pl-6 text-slate-700">
                (-) Despesas com Vendas e Comerciais
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                ({formatBRL(dre.commercialExpenses)})
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                {verticalAnalysis(dre.commercialExpenses)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 px-2.5 pl-6 text-slate-700">
                (-) Despesas Administrativas e Gerais
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                ({formatBRL(dre.administrativeExpenses)})
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                {verticalAnalysis(dre.administrativeExpenses)}
              </td>
            </tr>
            <tr className="bg-slate-200 font-black border-t-2 border-black text-xs">
              <td className="py-2 px-2.5">(=) Resultado Operacional Líquido (LAJIR / EBIT)</td>
              <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                {formatBRL(dre.operatingProfit)}
              </td>
              <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                {formatNumber(dre.operatingMarginPercent, 1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Consolidated Summary of Production Orders */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-black pb-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-black">
            2. Resumo Consolidado das Ordens de Produção (Encomendas)
          </h2>
          <span className="text-[10px] text-slate-700 font-mono tabular-nums">
            CIF Real: {formatBRL(totalActualCIF)} · CIF Aplicado: {formatBRL(totalAppliedCIF)} · Base:{' '}
            {formatNumber(totalAllocationBase, 2)} {getAllocationBaseUnit(cifConfig.allocationBase)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border border-slate-400 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-black font-bold">
                <th className="py-1.5 px-2 text-left">OP</th>
                <th className="py-1.5 px-2 text-left">Cliente / Encomenda</th>
                <th className="py-1.5 px-2 text-left">Status</th>
                <th className="py-1.5 px-2 text-right">Qtde</th>
                <th className="py-1.5 px-2 text-right">MD</th>
                <th className="py-1.5 px-2 text-right">MOD</th>
                <th className="py-1.5 px-2 text-right">CIF</th>
                <th className="py-1.5 px-2 text-right">Custo Total</th>
                <th className="py-1.5 px-2 text-right">Custo Unit.</th>
                <th className="py-1.5 px-2 text-right">Receita Bruta</th>
                <th className="py-1.5 px-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {orders.map((op) => {
                const s = summaries[op.id] || {
                  totalMD: 0,
                  totalMOD: 0,
                  cifAllocated: 0,
                  totalManufacturingCost: 0,
                  unitCost: 0,
                  revenue: 0,
                  grossMarginPercent: 0,
                };

                return (
                  <tr key={op.id} className="break-inside-avoid">
                    <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap">{op.code}</td>
                    <td className="py-1.5 px-2">
                      <span className="font-semibold block">{op.clientName}</span>
                      <span className="text-[9px] text-slate-600">{op.productDescription}</span>
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">{STATUS_LABEL[op.status]}</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {op.quantity} {op.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatBRL(s.totalMD)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatBRL(s.totalMOD)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatBRL(s.cifAllocated)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                      {formatBRL(s.totalManufacturingCost)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatBRL(s.unitCost)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {op.status === 'faturada' ? formatBRL(s.revenue) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                      {op.status === 'faturada'
                        ? `${formatNumber(s.grossMarginPercent, 1)}%`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-black font-black">
                <td colSpan={4} className="py-1.5 px-2 uppercase text-[9px] tracking-wider">
                  Totais Consolidados ({orders.length} Ordem{orders.length !== 1 ? 'ns' : ''})
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatBRL(totalMD)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatBRL(totalMOD)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatBRL(totalAppliedCIF)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatBRL(totalManufacturingCost)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono">—</td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatBRL(totalInvoicedRevenue)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {dre.invoicedCount > 0 ? `${formatNumber(dre.grossMarginPercent, 1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Signatures Footer */}
      <footer className="pt-8 grid grid-cols-2 gap-10 text-center text-[10px] text-slate-700 break-inside-avoid">
        <div>
          <div className="border-t border-black w-3/4 mx-auto mb-1" />
          <p className="font-bold text-black">Contador / Controller Responsável</p>
          <p>CRC / Registro Profissional · CPC 16 / NBC TG 16</p>
        </div>
        <div>
          <div className="border-t border-black w-3/4 mx-auto mb-1" />
          <p className="font-bold text-black">Diretoria Industrial &amp; Controladoria</p>
          <p>Conferência de Estoques, CPV e Resultado</p>
        </div>
      </footer>
    </div>
  );
}

export function ConsolidatedPrintReport(props: ConsolidatedReportProps) {
  return (
    <section
      aria-label="Relatório Contábil Consolidado para Impressão"
      className="hidden print:block bg-white text-black p-2"
    >
      <ConsolidatedReportSheet {...props} />
    </section>
  );
}

interface ConsolidatedExportModalProps extends ConsolidatedReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConsolidatedExportModal({
  isOpen,
  onClose,
  ...reportProps
}: ConsolidatedExportModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [pdfGenerated, setPdfGenerated] = useState(false);

  if (!isOpen) return null;

  const {
    companyParams,
    scenarioName,
    dre,
    orders,
    summaries,
  } = reportProps;

  const periodSlug = slugifyPeriod(companyParams.periodName || 'periodo');

  const handlePrintOrPdf = () => {
    exportConsolidatedReportPDF(reportProps);
    setPdfGenerated(true);
    setTimeout(() => setPdfGenerated(false), 2600);

    try {
      if (window.self === window.top) {
        window.print();
      }
    } catch {
      // ignore blocked print in restricted iframe
    }
  };

  const handleDownloadCSV = () => {
    const lines: string[] = [];
    const pushRow = (cells: (string | number)[]) => {
      lines.push(cells.map(escapeCsvCell).join(';'));
    };

    pushRow(['RELATORIO CONTABIL CONSOLIDADO - CUSTOSOP (CPC 16)']);
    pushRow(['Empresa', companyParams.companyName]);
    pushRow(['Periodo', companyParams.periodName]);
    pushRow(['Cenario', scenarioName]);
    pushRow([]);

    pushRow(['1. DEMONSTRACAO DO RESULTADO DO EXERCICIO (DRE)', 'Valor (R$)', 'AV (%)']);
    const av = (val: number) =>
      dre.netRevenue > 0 ? formatCsvDecimal((val / dre.netRevenue) * 100) : '0,00';

    pushRow([
      '(=) Receita Bruta de Vendas (Ordens Faturadas)',
      formatCsvDecimal(dre.grossRevenue),
      av(dre.grossRevenue),
    ]);
    pushRow([
      '(-) Tributos sobre Vendas e Servicos',
      formatCsvDecimal(-dre.salesTaxes),
      av(dre.salesTaxes),
    ]);
    pushRow([
      '(=) Receita Operacional Liquida',
      formatCsvDecimal(dre.netRevenue),
      dre.netRevenue > 0 ? '100,00' : '0,00',
    ]);
    pushRow([
      '(-) Custo dos Produtos Vendidos (CPV Fabril das OPs)',
      formatCsvDecimal(-dre.baseCPV),
      av(dre.baseCPV),
    ]);
    if (Math.abs(dre.cifVariance) > 0.01) {
      pushRow([
        dre.cifVariance > 0
          ? '(-) Ajuste de Subaplicacao de CIF ao CPV'
          : '(+) Ajuste de Sobreaplicacao de CIF ao CPV',
        formatCsvDecimal(-dre.cifVariance),
        av(Math.abs(dre.cifVariance)),
      ]);
    }
    pushRow([
      '(=) Lucro Operacional Bruto',
      formatCsvDecimal(dre.grossProfit),
      formatCsvDecimal(dre.grossMarginPercent),
    ]);
    pushRow([
      '(-) Despesas com Vendas e Comerciais',
      formatCsvDecimal(-dre.commercialExpenses),
      av(dre.commercialExpenses),
    ]);
    pushRow([
      '(-) Despesas Administrativas e Gerais',
      formatCsvDecimal(-dre.administrativeExpenses),
      av(dre.administrativeExpenses),
    ]);
    pushRow([
      '(=) Resultado Operacional Liquido (LAJIR / EBIT)',
      formatCsvDecimal(dre.operatingProfit),
      formatCsvDecimal(dre.operatingMarginPercent),
    ]);

    pushRow([]);
    pushRow(['2. RESUMO CONSOLIDADO DAS ORDENS DE PRODUCAO']);
    pushRow([
      'Codigo OP',
      'Cliente',
      'Produto / Especificacao',
      'Status',
      'Quantidade',
      'Unidade',
      'Material Direto (R$)',
      'Mao de Obra Direta (R$)',
      'CIF Apropriado (R$)',
      'Custo Fabril Total (R$)',
      'Custo Unitario (R$)',
      'Receita Bruta (R$)',
      'Margem Bruta (%)',
    ]);

    orders.forEach((op) => {
      const s = summaries[op.id] || {
        totalMD: 0,
        totalMOD: 0,
        cifAllocated: 0,
        totalManufacturingCost: 0,
        unitCost: 0,
        revenue: 0,
        grossMarginPercent: 0,
      };
      pushRow([
        op.code,
        op.clientName,
        op.productDescription,
        STATUS_LABEL[op.status],
        op.quantity,
        op.unit,
        formatCsvDecimal(s.totalMD),
        formatCsvDecimal(s.totalMOD),
        formatCsvDecimal(s.cifAllocated),
        formatCsvDecimal(s.totalManufacturingCost),
        formatCsvDecimal(s.unitCost),
        op.status === 'faturada' ? formatCsvDecimal(s.revenue) : '0,00',
        op.status === 'faturada' ? formatCsvDecimal(s.grossMarginPercent) : '0,00',
      ]);
    });

    const csvWithBom = '\uFEFF' + lines.join('\r\n');
    triggerFileDownload(
      csvWithBom,
      `CustosOP-DRE-e-OPs-${periodSlug}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 dark:bg-black/45 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:hidden"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="dash-modal rounded-[28px] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Top Action Bar */}
        <div className="p-4 border-b border-slate-900/[0.08] dark:border-white/[0.12] flex flex-wrap items-center justify-between gap-3 bg-white/35 dark:bg-white/[0.04] backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 icon-calc-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                Exportar DRE &amp; Resumo das Ordens de Produção
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                Pré-visualização limpa em formato A4 para impressão, PDF ou planilha contábil
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="dash-glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              title="Baixar DRE e OPs em planilha CSV compatível com Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Planilha (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintOrPdf}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 border border-slate-900 dark:border-white shadow-lg transition-all cursor-pointer active:scale-95"
            >
              {pdfGenerated ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>PDF Gerado!</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Gerar PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/15 rounded-full transition-colors cursor-pointer"
              aria-label="Fechar pré-visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Crisp White A4 Paper Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-900/[0.06] dark:bg-black/30">
          <div className="max-w-[820px] mx-auto bg-white text-black rounded-xl shadow-2xl border border-slate-200 p-6 sm:p-8">
            <ConsolidatedReportSheet {...reportProps} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
