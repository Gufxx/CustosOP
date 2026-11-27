import { useState, useMemo, type MouseEvent } from 'react';
import {
  Calculator,
  Check,
  CheckSquare,
  ClipboardList,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Square,
  TrendingUp,
} from 'lucide-react';
import {
  CompanyParameters,
  CIFConfiguration,
  IndirectCostItem,
  OrderCostSummary,
  ProductionOrder,
  TAccount,
  CIFCategory,
} from '../types/costing';
import { formatBRL, formatNumber, getAllocationBaseLabel } from '../utils/costCalculations';
import {
  CIF_CATEGORY_LABELS,
  exportFullSystemReportPDF,
  FULL_PDF_CATEGORIES,
  FullPdfCategoryId,
  FullPdfTopicId,
} from '../utils/pdfExport';

interface FullPdfExportViewProps {
  companyParams: CompanyParameters;
  scenarioName: string;
  cifConfig: CIFConfiguration;
  cifItems: IndirectCostItem[];
  effectiveCIFRate: number;
  totalAllocationBase: number;
  totalActualCIF: number;
  totalAppliedCIF: number;
  cifVariance: number;
  totalManufacturingCost: number;
  totalMD: number;
  totalMOD: number;
  inventoryBalances: {
    finalRawMaterials: number;
    finalWIP: number;
    finalFinishedGoods: number;
    wipOrdersCount: number;
    finishedOrdersCount: number;
    invoicedOrdersCount: number;
  };
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
  tAccounts: TAccount[];
}

const ALL_TOPIC_IDS: FullPdfTopicId[] = FULL_PDF_CATEGORIES.flatMap((c) =>
  c.topics.map((t) => t.id)
);

function handleCardMouseMove(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export function FullPdfExportView(props: FullPdfExportViewProps) {
  const {
    companyParams,
    scenarioName,
    cifConfig,
    cifItems,
    totalActualCIF,
    totalManufacturingCost,
    inventoryBalances,
    dre,
    orders,
    summaries,
    tAccounts,
  } = props;

  const [selectedTopics, setSelectedTopics] = useState<FullPdfTopicId[]>(ALL_TOPIC_IDS);
  const [exportedFeedback, setExportedFeedback] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedTopics), [selectedTopics]);

  const cifByCategory = useMemo(() => {
    const map = new Map<CIFCategory, { items: IndirectCostItem[]; total: number }>();
    cifItems.forEach((item) => {
      const existing = map.get(item.category) || { items: [], total: 0 };
      existing.items.push(item);
      existing.total += item.amount;
      map.set(item.category, existing);
    });
    return Array.from(map.entries());
  }, [cifItems]);

  const toggleTopic = (topicId: FullPdfTopicId) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleCategory = (catId: FullPdfCategoryId) => {
    const cat = FULL_PDF_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    const catTopicIds = cat.topics.map((t) => t.id);
    const allSelected = catTopicIds.every((id) => selectedSet.has(id));

    if (allSelected) {
      setSelectedTopics((prev) => prev.filter((id) => !catTopicIds.includes(id)));
    } else {
      setSelectedTopics((prev) => Array.from(new Set([...prev, ...catTopicIds])));
    }
  };

  const triggerFeedback = (label: string) => {
    setExportedFeedback(label);
    window.setTimeout(() => setExportedFeedback(null), 2600);
  };

  const handleExportFull = () => {
    if (selectedTopics.length === 0) return;
    exportFullSystemReportPDF({
      ...props,
      selectedTopics,
      customFilenameSuffix:
        selectedTopics.length === ALL_TOPIC_IDS.length ? 'Full' : 'Personalizado',
    });
    triggerFeedback('full');
  };

  const handleExportCategoryOnly = (catId: FullPdfCategoryId) => {
    const cat = FULL_PDF_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    exportFullSystemReportPDF({
      ...props,
      selectedTopics: cat.topics.map((t) => t.id),
      customFilenameSuffix: cat.id,
    });
    triggerFeedback(catId);
  };

  const getCategoryIcon = (catId: FullPdfCategoryId) => {
    switch (catId) {
      case 'orders':
        return <ClipboardList className="w-4 h-4" />;
      case 'cif':
        return <Calculator className="w-4 h-4" />;
      case 'taccounts':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'dre':
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getCategorySummaryMetric = (catId: FullPdfCategoryId) => {
    switch (catId) {
      case 'orders':
        return `${orders.length} OP(s) · ${formatBRL(totalManufacturingCost)}`;
      case 'cif':
        return `${cifItems.length} item(ns) · ${formatBRL(totalActualCIF)}`;
      case 'taccounts':
        return `${tAccounts.length} contas em T`;
      case 'dre':
        return `LAJIR ${formatBRL(dre.operatingProfit)}`;
    }
  };

  const getTopicMetricLabel = (topicId: FullPdfTopicId) => {
    switch (topicId) {
      case 'orders_summary':
        return `${orders.length} ordem(ns) · PeE ${inventoryBalances.wipOrdersCount} / PA ${inventoryBalances.finishedOrdersCount} / Fat. ${inventoryBalances.invoicedOrdersCount}`;
      case 'orders_job_sheets': {
        const totalMaterials = orders.reduce((acc, o) => acc + (o.materials?.length || 0), 0);
        const totalLabor = orders.reduce((acc, o) => acc + (o.labor?.length || 0), 0);
        return `${totalMaterials} RMAs · ${totalLabor} apontamentos MOD`;
      }
      case 'cif_criteria':
        return getAllocationBaseLabel(cifConfig.allocationBase);
      case 'cif_by_category':
        return `${cifByCategory.length} categoria(s) fabril(is) · ${formatBRL(totalActualCIF)}`;
      case 'taccounts_inventory':
        return '1.1.04 MP · 1.1.05 PeE · 1.1.06 PA';
      case 'taccounts_production':
        return '2.1.03 MOD · 5.1.02 Controle de CIF';
      case 'taccounts_result':
        return '4.1.01 CPV · 3.1.01 Receita · 3.9.01 ARE';
      case 'dre_statement':
        return `Rec. Líquida ${formatBRL(dre.netRevenue)} · Margem ${formatNumber(dre.operatingMarginPercent, 1)}%`;
      case 'dre_margins_stock':
        return `Estoques finais ${formatBRL(inventoryBalances.finalRawMaterials + inventoryBalances.finalWIP + inventoryBalances.finalFinishedGoods)}`;
    }
  };

  const selectedCategoriesCount = FULL_PDF_CATEGORIES.filter((cat) =>
    cat.topics.some((t) => selectedSet.has(t.id))
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Control & Full Export Action Card */}
      <div
        onMouseMove={handleCardMouseMove}
        className="dash-card apple-card-spotlight rounded-[26px] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 icon-calc-accent" />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Exportação Full em PDF por Tópico e Categoria de Sistema
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {companyParams.companyName} · {companyParams.periodName} · {selectedCategoriesCount}{' '}
              categoria(s) e {selectedTopics.length} de {ALL_TOPIC_IDS.length} tópico(s)
              selecionado(s)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedTopics(ALL_TOPIC_IDS)}
            className="dash-glass-pill px-3.5 py-2 rounded-full text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Selecionar Tudo
          </button>
          <button
            type="button"
            onClick={() =>
              setSelectedTopics(['orders_summary', 'cif_criteria', 'dre_statement', 'dre_margins_stock'])
            }
            className="dash-glass-pill px-3.5 py-2 rounded-full text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Resumo Executivo
          </button>
          <button
            type="button"
            onClick={() => setSelectedTopics([])}
            className="dash-glass-pill px-3.5 py-2 rounded-full text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Limpar
          </button>

          <button
            type="button"
            disabled={selectedTopics.length === 0}
            onClick={handleExportFull}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold dash-cobalt-btn rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {exportedFeedback === 'full' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>PDF Completo Gerado!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {selectedTopics.length === ALL_TOPIC_IDS.length
                    ? 'Exportar Full PDF'
                    : `Exportar PDF (${selectedTopics.length} tópicos)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 System Categories Grid with Topic Checkboxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {FULL_PDF_CATEGORIES.map((category) => {
          const selectedCount = category.topics.filter((t) => selectedSet.has(t.id)).length;
          const allSelected = selectedCount === category.topics.length;

          return (
            <section
              key={category.id}
              onMouseMove={handleCardMouseMove}
              className="dash-card apple-card-spotlight rounded-[26px] p-5 sm:p-6 flex flex-col justify-between gap-5"
            >
              {/* Category Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                    {getCategoryIcon(category.id)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {category.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {getCategorySummaryMetric(category.id)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      {category.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {category.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium dash-glass-pill text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>{allSelected ? 'Desmarcar' : 'Marcar tudo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCategoryOnly(category.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold dash-glass-pill text-slate-800 dark:text-white hover:border-slate-400 dark:hover:border-white/35 transition-colors cursor-pointer"
                    title={`Exportar PDF apenas de ${category.title}`}
                  >
                    {exportedFeedback === category.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Gerado</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF Categoria</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Topics List separated by clean hairlines */}
              <div className="divide-y divide-slate-200/80 dark:divide-white/[0.08] border-t border-slate-200/80 dark:border-white/[0.08]">
                {category.topics.map((topic) => {
                  const checked = selectedSet.has(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className="w-full text-left py-3.5 flex items-start gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg transition-colors"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                          checked
                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-zinc-950'
                            : 'border-slate-300 dark:border-white/25 bg-transparent'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </span>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span
                            className={`text-xs sm:text-[13px] font-semibold transition-colors ${
                              checked
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-zinc-400'
                            }`}
                          >
                            {topic.code} · {topic.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                          {topic.description}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-zinc-300">
                          {getTopicMetricLabel(topic.id)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Live Structured Outline Preview of Selected Topics */}
      <div className="dash-card rounded-[26px] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Prévia da Estrutura do Dossiê PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Cenário {scenarioName} · Separação automática por Categoria de Sistema e Tópico
              </p>
            </div>
          </div>

          <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-zinc-300">
            {selectedTopics.length} de {ALL_TOPIC_IDS.length} tópicos ativos
          </span>
        </div>

        {selectedTopics.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              Nenhum tópico selecionado para composição do dossiê PDF.
            </p>
            <button
              type="button"
              onClick={() => setSelectedTopics(ALL_TOPIC_IDS)}
              className="px-4 py-2 text-xs font-semibold dash-cobalt-btn rounded-full cursor-pointer"
            >
              Restaurar Todos os Tópicos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview Column 1: Orders + CIF Categories */}
            <div className="space-y-4">
              {(selectedSet.has('orders_summary') || selectedSet.has('orders_job_sheets')) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Categoria 01 · Ordens de Produção
                  </h4>
                  <div className="dash-inset rounded-2xl p-3.5 space-y-2 text-xs">
                    {orders.map((op) => {
                      const s = summaries[op.id];
                      return (
                        <div
                          key={op.id}
                          className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0 border-slate-200/70 dark:border-white/[0.07]"
                        >
                          <span className="text-slate-700 dark:text-zinc-200 truncate">
                            <strong className="font-mono">{op.code}</strong> · {op.clientName}
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatBRL(s?.totalManufacturingCost || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selectedSet.has('cif_criteria') || selectedSet.has('cif_by_category')) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Categoria 02 · Custos Indiretos por Categoria Fabril
                  </h4>
                  <div className="dash-inset rounded-2xl p-3.5 space-y-2 text-xs">
                    {cifByCategory.map(([cat, info]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0 border-slate-200/70 dark:border-white/[0.07]"
                      >
                        <span className="text-slate-700 dark:text-zinc-200 truncate">
                          {CIF_CATEGORY_LABELS[cat] || cat} ({info.items.length})
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatBRL(info.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Column 2: T-Accounts + DRE */}
            <div className="space-y-4">
              {(selectedSet.has('taccounts_inventory') ||
                selectedSet.has('taccounts_production') ||
                selectedSet.has('taccounts_result')) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Categoria 03 · Razonetes Contábeis Selecionados
                  </h4>
                  <div className="dash-inset rounded-2xl p-3.5 space-y-2 text-xs">
                    {tAccounts
                      .filter((acc) => {
                        if (acc.category === 'ativo_circulante')
                          return selectedSet.has('taccounts_inventory');
                        if (
                          acc.category === 'passivo_circulante' ||
                          acc.category === 'custos_producao'
                        )
                          return selectedSet.has('taccounts_production');
                        return selectedSet.has('taccounts_result');
                      })
                      .map((acc) => {
                        const dTotal =
                          acc.initialBalance + acc.debits.reduce((s, d) => s + d.amount, 0);
                        const cTotal = acc.credits.reduce((s, c) => s + c.amount, 0);
                        const bal = dTotal - cTotal;
                        return (
                          <div
                            key={acc.code}
                            className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0 border-slate-200/70 dark:border-white/[0.07]"
                          >
                            <span className="text-slate-700 dark:text-zinc-200 truncate">
                              <strong className="font-mono">{acc.code}</strong> · {acc.title}
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {formatBRL(Math.abs(bal))} ({bal >= 0 ? 'D' : 'C'})
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {(selectedSet.has('dre_statement') || selectedSet.has('dre_margins_stock')) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Categoria 04 · Síntese da DRE &amp; Estoques
                  </h4>
                  <div className="dash-inset rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-white/[0.07]">
                      <span className="text-slate-700 dark:text-zinc-200">Receita Líquida</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatBRL(dre.netRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-white/[0.07]">
                      <span className="text-slate-700 dark:text-zinc-200">Lucro Bruto</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatBRL(dre.grossProfit)} ({formatNumber(dre.grossMarginPercent, 1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-700 dark:text-zinc-200">
                        Resultado Operacional (LAJIR)
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatBRL(dre.operatingProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
