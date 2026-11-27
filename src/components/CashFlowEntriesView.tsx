import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CashFlowEntry,
  CashFlowPaymentMethod,
  CompanyParameters,
} from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';

interface DerivedCashEntry extends CashFlowEntry {
  isDerived?: boolean;
}

interface CashFlowEntriesViewProps {
  companyParams: CompanyParameters;
  scenarioName: string;
  entries: CashFlowEntry[];
  derivedEntries: CashFlowEntry[];
  onAddEntry: (entry: Omit<CashFlowEntry, 'id'>) => void;
  onToggleEntryStatus: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onResetDefaults: () => void;
}

const PAYMENT_METHODS: CashFlowPaymentMethod[] = [
  'PIX',
  'Transferência TED',
  'Boleto',
  'Cartão Corporativo',
  'Débito Automático',
];

const CATEGORIES_BY_TYPE: Record<'entrada' | 'saida', string[]> = {
  entrada: [
    'Faturamento de OPs',
    'Sinal / Adiantamento de Cliente',
    'Rendimento Financeiro',
    'Aporte de Capital',
    'Outras Receitas',
  ],
  saida: [
    'Compra de Matéria-Prima',
    'Folha & Encargos (MOD)',
    'Custos Indiretos (CIF)',
    'Despesas Administrativas',
    'Despesas Comerciais',
    'Tributos & Guias DARF',
    'Investimento / Maquinário',
  ],
};

export function CashFlowEntriesView({
  companyParams,
  scenarioName,
  entries,
  derivedEntries,
  onAddEntry,
  onToggleEntryStatus,
  onDeleteEntry,
  onResetDefaults,
}: CashFlowEntriesViewProps) {
  const [includeOperationalSync, setIncludeOperationalSync] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'realizado' | 'previsto'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for new manual entry
  const [entryType, setEntryType] = useState<'entrada' | 'saida'>('entrada');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES_BY_TYPE.entrada[1]);
  const [amount, setAmount] = useState('4500');
  const [date, setDate] = useState('2026-03-28');
  const [status, setStatus] = useState<'realizado' | 'previsto'>('realizado');
  const [paymentMethod, setPaymentMethod] = useState<CashFlowPaymentMethod>('PIX');
  const [linkedOrderCode, setLinkedOrderCode] = useState('');

  const handleEntryTypeChange = (nextType: 'entrada' | 'saida') => {
    setEntryType(nextType);
    setCategory(CATEGORIES_BY_TYPE[nextType][0]);
  };

  const combinedEntries = useMemo<DerivedCashEntry[]>(() => {
    const manualList: DerivedCashEntry[] = entries.map((e) => ({ ...e, isDerived: false }));
    const syncedList: DerivedCashEntry[] = includeOperationalSync
      ? derivedEntries.map((e) => ({ ...e, isDerived: true }))
      : [];

    return [...syncedList, ...manualList].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, derivedEntries, includeOperationalSync]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedEntries.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (
        q &&
        !item.description.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q) &&
        !(item.linkedOrderCode || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [combinedEntries, typeFilter, statusFilter, searchQuery]);

  const totals = useMemo(() => {
    let inflowsRealized = 0;
    let inflowsProjected = 0;
    let outflowsRealized = 0;
    let outflowsProjected = 0;

    combinedEntries.forEach((item) => {
      if (item.type === 'entrada') {
        if (item.status === 'realizado') inflowsRealized += item.amount;
        else inflowsProjected += item.amount;
      } else {
        if (item.status === 'realizado') outflowsRealized += item.amount;
        else outflowsProjected += item.amount;
      }
    });

    const totalInflows = inflowsRealized + inflowsProjected;
    const totalOutflows = outflowsRealized + outflowsProjected;
    const netRealized = inflowsRealized - outflowsRealized;
    const netProjected = totalInflows - totalOutflows;
    const inflowShare =
      totalInflows + totalOutflows > 0
        ? (totalInflows / (totalInflows + totalOutflows)) * 100
        : 50;

    return {
      inflowsRealized,
      inflowsProjected,
      outflowsRealized,
      outflowsProjected,
      totalInflows,
      totalOutflows,
      netRealized,
      netProjected,
      inflowShare,
    };
  }, [combinedEntries]);

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    onAddEntry({
      type: entryType,
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      category: category.trim() || 'Movimentação Geral',
      amount: numericAmount,
      status,
      paymentMethod,
      linkedOrderCode: linkedOrderCode.trim() || undefined,
    });

    setDescription('');
    setLinkedOrderCode('');
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="dash-card rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span>{companyParams.companyName}</span>
            <span aria-hidden="true">·</span>
            <span>{scenarioName}</span>
            <span aria-hidden="true">·</span>
            <span>{companyParams.periodName}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />
            Entradas &amp; Saídas Financeiras (Fluxo de Caixa)
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Consolida recebimentos das OPs faturadas, desembolsos fabris (MOD, CIF e despesas) e lançamentos extras de tesouraria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIncludeOperationalSync((v) => !v)}
            className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              includeOperationalSync
                ? 'dash-nav-pill-active font-semibold'
                : 'text-slate-600 dark:text-zinc-300 border-slate-300/70 dark:border-white/15 bg-slate-900/[0.03] dark:bg-white/[0.04]'
            }`}
          >
            {includeOperationalSync ? 'Integração OPs & CIF: Ativa' : 'Integração OPs & CIF: Oculta'}
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.04] dark:bg-white/[0.06] hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.12] border border-slate-300/70 dark:border-white/15 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Entradas Totais</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
          </span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
            {formatBRL(totals.totalInflows)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400">
            Realizadas: {formatBRL(totals.inflowsRealized)}
          </div>
        </div>

        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Saídas Totais</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300" />
          </span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-rose-600 dark:text-rose-300">
            {formatBRL(totals.totalOutflows)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400">
            Realizadas: {formatBRL(totals.outflowsRealized)}
          </div>
        </div>

        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Saldo Realizado em Caixa
          </span>
          <div
            className={`text-xl font-extrabold font-mono tabular-nums ${
              totals.netRealized >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-rose-600 dark:text-rose-300'
            }`}
          >
            {formatBRL(totals.netRealized)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
            Apenas movimentações liquidadas
          </div>
        </div>

        <div className="dash-hero-glass text-white rounded-[22px] p-4 space-y-1 border border-white/20">
          <span className="text-[11px] font-medium text-zinc-300">
            Saldo Projetado (c/ Previstos)
          </span>
          <div
            className={`text-xl font-extrabold font-mono tabular-nums ${
              totals.netProjected >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {formatBRL(totals.netProjected)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-300">
            Proporção Entradas: {formatNumber(totals.inflowShare, 1)}%
          </div>
        </div>
      </div>

      {/* Main Split: Ledger Table (8 cols) + New Entry Form (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Ledger */}
        <div className="lg:col-span-8 dash-card rounded-[24px] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Extrato de Movimentações ({filteredEntries.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Clique no status de lançamentos manuais para alternar entre Realizado e Previsto
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar descrição ou OP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
                {(
                  [
                    { id: 'all', label: 'Tudo' },
                    { id: 'entrada', label: 'Entradas' },
                    { id: 'saida', label: 'Saídas' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeFilter(t.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      typeFilter === t.id
                        ? 'dash-nav-pill-active font-semibold'
                        : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
                {(
                  [
                    { id: 'all', label: 'Todos Status' },
                    { id: 'realizado', label: 'Realizados' },
                    { id: 'previsto', label: 'Previstos' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      statusFilter === s.id
                        ? 'dash-nav-pill-active font-semibold'
                        : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-zinc-400">
              Nenhuma movimentação encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200/80 dark:border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Descrição &amp; Categoria</th>
                    <th className="py-2.5 px-4">Meio</th>
                    <th className="py-2.5 px-4">Situação</th>
                    <th className="py-2.5 px-4 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07]">
                  {filteredEntries.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.description}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                          {item.category}
                          {item.linkedOrderCode ? ` · ${item.linkedOrderCode}` : ''}
                          {item.isDerived ? ' · Sincronizado da Fábrica' : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                        {item.paymentMethod}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {item.isDerived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                            {item.status === 'realizado' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {item.status === 'realizado' ? 'Realizado' : 'Previsto'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleEntryStatus(item.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline cursor-pointer"
                            title="Alternar entre Realizado e Previsto"
                          >
                            {item.status === 'realizado' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                                <span className="text-emerald-700 dark:text-emerald-300">Realizado</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-amber-700 dark:text-amber-300">Previsto</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                          item.type === 'entrada'
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-rose-600 dark:text-rose-300'
                        }`}
                      >
                        {item.type === 'entrada' ? '+ ' : '- '}
                        {formatBRL(item.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.isDerived ? (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">Auto</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            aria-label={`Excluir lançamento ${item.description}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 Cols: New Cash Entry Form */}
        <div className="lg:col-span-4 dash-card rounded-[24px] p-5 space-y-4">
          <div className="border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-900 dark:text-white" />
              Registrar Movimentação
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Adicione novas entradas ou saídas manuais ao fluxo de caixa
            </p>
          </div>

          <form onSubmit={handleSubmitEntry} className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
              <button
                type="button"
                onClick={() => handleEntryTypeChange('entrada')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  entryType === 'entrada'
                    ? 'dash-nav-pill-active font-semibold'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span>Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => handleEntryTypeChange('saida')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  entryType === 'saida'
                    ? 'dash-nav-pill-active font-semibold'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                <span>Saída</span>
              </button>
            </div>

            <label className="space-y-1 block">
              <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                Descrição do Lançamento
              </span>
              <input
                type="text"
                required
                placeholder={
                  entryType === 'entrada'
                    ? 'Ex: Sinal 50% OP-103 Clínica Gama'
                    : 'Ex: Compra de insumos para estoque'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Valor (R$)
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Data
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                Categoria Financeira
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                {CATEGORIES_BY_TYPE[entryType].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Forma Pagto.
                </span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as CashFlowPaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Status
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'realizado' | 'previsto')}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <option value="realizado">Realizado</option>
                  <option value="previsto">Previsto</option>
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                OP Relacionada (Opcional)
              </span>
              <input
                type="text"
                placeholder="Ex: OP-102"
                value={linkedOrderCode}
                onChange={(e) => setLinkedOrderCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              />
            </label>

            <button
              type="submit"
              className="w-full py-2.5 px-4 dash-cobalt-btn rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{entryType === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
