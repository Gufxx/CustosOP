import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  BudgetAllocation,
  BudgetSourceKey,
  CompanyParameters,
  FinancialGoal,
  GoalMetricType,
} from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';

interface GoalsAndBudgetsViewProps {
  companyParams: CompanyParameters;
  scenarioName: string;
  goals: FinancialGoal[];
  budgets: BudgetAllocation[];
  totalMD: number;
  totalMOD: number;
  totalActualCIF: number;
  cashNetRealized: number;
  dre: {
    grossRevenue: number;
    grossMarginPercent: number;
    operatingProfit: number;
    invoicedCount: number;
  };
  onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  onDeleteGoal: (id: string) => void;
  onAddBudget: (budget: Omit<BudgetAllocation, 'id'>) => void;
  onUpdateBudgetAmount: (id: string, plannedAmount: number) => void;
  onDeleteBudget: (id: string) => void;
  onResetDefaults: () => void;
}

const METRIC_LABELS: Record<GoalMetricType, string> = {
  receita_bruta: 'Receita Bruta Faturada (DRE)',
  lucro_operacional: 'Resultado Operacional (LAJIR)',
  margem_bruta: 'Margem Bruta Fabril (%)',
  saldo_caixa: 'Saldo Realizado de Caixa',
  ordens_faturadas: 'Ordens Faturadas (Qtde)',
  personalizado: 'Indicador Personalizado',
};

const SOURCE_LABELS: Record<BudgetSourceKey, string> = {
  md: 'Material Direto (MD Consumido)',
  mod: 'Mão de Obra Direta (MOD)',
  cif: 'Custos Indiretos de Fabricação (CIF Real)',
  comercial: 'Despesas Comerciais & Vendas',
  administrativa: 'Despesas Administrativas',
  personalizado: 'Centro de Custo Personalizado',
};

export function GoalsAndBudgetsView({
  companyParams,
  scenarioName,
  goals,
  budgets,
  totalMD,
  totalMOD,
  totalActualCIF,
  cashNetRealized,
  dre,
  onAddGoal,
  onDeleteGoal,
  onAddBudget,
  onUpdateBudgetAmount,
  onDeleteBudget,
  onResetDefaults,
}: GoalsAndBudgetsViewProps) {
  const [formMode, setFormMode] = useState<'goal' | 'budget'>('goal');

  // New Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState('Faturamento & Margem');
  const [goalMetricType, setGoalMetricType] = useState<GoalMetricType>('receita_bruta');
  const [goalTarget, setGoalTarget] = useState('50000');
  const [goalManualCurrent, setGoalManualCurrent] = useState('0');
  const [goalDeadline, setGoalDeadline] = useState('2026-04-30');

  // New Budget Form State
  const [budgetTitle, setBudgetTitle] = useState('');
  const [budgetSource, setBudgetSource] = useState<BudgetSourceKey>('personalizado');
  const [budgetPlanned, setBudgetPlanned] = useState('5000');
  const [budgetActualManual, setBudgetActualManual] = useState('3200');

  // Compute live current value for each goal
  const resolvedGoals = useMemo(() => {
    return goals.map((g) => {
      let currentValue = g.manualCurrentValue ?? 0;
      if (g.metricType === 'receita_bruta') currentValue = dre.grossRevenue;
      else if (g.metricType === 'lucro_operacional') currentValue = dre.operatingProfit;
      else if (g.metricType === 'margem_bruta') currentValue = dre.grossMarginPercent;
      else if (g.metricType === 'saldo_caixa') currentValue = cashNetRealized;
      else if (g.metricType === 'ordens_faturadas') currentValue = dre.invoicedCount;

      const rawPercent = g.targetValue > 0 ? (currentValue / g.targetValue) * 100 : 0;
      const progressPercent = Math.max(0, Math.min(100, rawPercent));
      const achieved = currentValue >= g.targetValue && g.targetValue > 0;

      return {
        ...g,
        currentValue,
        rawPercent,
        progressPercent,
        achieved,
      };
    });
  }, [goals, dre, cashNetRealized]);

  // Compute live realized vs planned for each budget
  const resolvedBudgets = useMemo(() => {
    return budgets.map((b) => {
      let actualAmount = b.manualActualAmount ?? 0;
      if (b.sourceKey === 'md') actualAmount = totalMD;
      else if (b.sourceKey === 'mod') actualAmount = totalMOD;
      else if (b.sourceKey === 'cif') actualAmount = totalActualCIF;
      else if (b.sourceKey === 'comercial') actualAmount = companyParams.commercialExpenses;
      else if (b.sourceKey === 'administrativa') actualAmount = companyParams.administrativeExpenses;

      const variance = b.plannedAmount - actualAmount; // positive = under budget (saving), negative = overrun
      const consumedPercent = b.plannedAmount > 0 ? (actualAmount / b.plannedAmount) * 100 : 0;
      const isExceeded = actualAmount > b.plannedAmount + 0.01;
      const isWarning = !isExceeded && consumedPercent >= 85;

      return {
        ...b,
        actualAmount,
        variance,
        consumedPercent,
        isExceeded,
        isWarning,
      };
    });
  }, [budgets, totalMD, totalMOD, totalActualCIF, companyParams]);

  const summary = useMemo(() => {
    const totalPlanned = resolvedBudgets.reduce((acc, b) => acc + b.plannedAmount, 0);
    const totalActual = resolvedBudgets.reduce((acc, b) => acc + b.actualAmount, 0);
    const globalVariance = totalPlanned - totalActual;
    const globalConsumed = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    const exceededCount = resolvedBudgets.filter((b) => b.isExceeded).length;
    const achievedGoalsCount = resolvedGoals.filter((g) => g.achieved).length;

    return {
      totalPlanned,
      totalActual,
      globalVariance,
      globalConsumed,
      exceededCount,
      achievedGoalsCount,
    };
  }, [resolvedBudgets, resolvedGoals]);

  const formatGoalValue = (val: number, unit: FinancialGoal['unit']) => {
    if (unit === 'percent') return `${formatNumber(val, 1)}%`;
    if (unit === 'count') return `${formatNumber(val, 0)} OPs`;
    return formatBRL(val);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = Number(goalTarget);
    if (!goalTitle.trim() || !Number.isFinite(targetVal) || targetVal <= 0) return;

    const unit: FinancialGoal['unit'] =
      goalMetricType === 'margem_bruta'
        ? 'percent'
        : goalMetricType === 'ordens_faturadas'
          ? 'count'
          : 'brl';

    onAddGoal({
      title: goalTitle.trim(),
      category: goalCategory.trim() || 'Operação',
      metricType: goalMetricType,
      targetValue: targetVal,
      manualCurrentValue:
        goalMetricType === 'personalizado' ? Math.max(0, Number(goalManualCurrent) || 0) : undefined,
      unit,
      deadline: goalDeadline || companyParams.periodName,
    });
    setGoalTitle('');
  };

  const handleSubmitBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const plannedVal = Number(budgetPlanned);
    if (!budgetTitle.trim() || !Number.isFinite(plannedVal) || plannedVal <= 0) return;

    onAddBudget({
      title: budgetTitle.trim(),
      sourceKey: budgetSource,
      plannedAmount: plannedVal,
      manualActualAmount:
        budgetSource === 'personalizado' ? Math.max(0, Number(budgetActualManual) || 0) : undefined,
      periodLabel: companyParams.periodName,
    });
    setBudgetTitle('');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
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
            <Target className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />
            Metas Estratégicas &amp; Controle Orçamentário
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Acompanhe desvios entre orçamento previsto e consumo real de MD, MOD, CIF, despesas e metas ligadas à DRE e ao Caixa.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.04] dark:bg-white/[0.06] hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.12] border border-slate-300/70 dark:border-white/15 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sincronizar do Cenário</span>
        </button>
      </div>

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Orçamento Total Previsto
          </span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBRL(summary.totalPlanned)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
            {resolvedBudgets.length} centro{resolvedBudgets.length !== 1 ? 's' : ''} de custo
          </div>
        </div>

        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Realizado Acumulado
          </span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatBRL(summary.totalActual)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400">
            {formatNumber(summary.globalConsumed, 1)}% do teto global
          </div>
        </div>

        <div className="dash-card rounded-[22px] p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Saldo / Desvio Orçamentário
          </span>
          <div
            className={`text-xl font-extrabold font-mono tabular-nums ${
              summary.globalVariance >= 0
                ? 'text-emerald-600 dark:text-emerald-300'
                : 'text-rose-600 dark:text-rose-300'
            }`}
          >
            {summary.globalVariance >= 0
              ? `+ ${formatBRL(summary.globalVariance)}`
              : `- ${formatBRL(Math.abs(summary.globalVariance))}`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-400">
            {summary.exceededCount > 0
              ? `${summary.exceededCount} teto(s) excedido(s)`
              : 'Dentro do orçamento global'}
          </div>
        </div>

        <div className="dash-hero-glass text-white rounded-[22px] p-4 space-y-1 border border-white/20">
          <span className="text-[11px] font-medium text-zinc-300">
            Metas Concluídas
          </span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-white">
            {summary.achievedGoalsCount} / {resolvedGoals.length}
          </div>
          <div className="text-[11px] text-zinc-300">
            Saldo de caixa: <span className="font-mono tabular-nums">{formatBRL(cashNetRealized)}</span>
          </div>
        </div>
      </div>

      {/* Main Split: Orçamentos (7 cols) + Metas & Cadastro (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Budget Allocations vs Realized */}
        <div className="lg:col-span-7 space-y-5">
          <div className="dash-card rounded-[24px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-900 dark:text-white" />
                  Execução Orçamentária (Orçado vs. Realizado)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Ajuste o teto orçado diretamente na linha para recalcular desvios em tempo real
                </p>
              </div>
            </div>

            {resolvedBudgets.length === 0 ? (
              <div className="dash-inset rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                Nenhum centro de orçamento cadastrado. Adicione um novo orçamento ao lado ou sincronize o cenário.
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedBudgets.map((b) => {
                  const barWidth = Math.min(100, Math.max(0, b.consumedPercent));
                  return (
                    <div
                      key={b.id}
                      className="dash-inset rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {b.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {SOURCE_LABELS[b.sourceKey]} · {b.periodLabel}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                            <span>Teto R$</span>
                            <input
                              type="number"
                              min={0}
                              step={250}
                              value={b.plannedAmount}
                              onChange={(e) =>
                                onUpdateBudgetAmount(
                                  b.id,
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              className="w-24 px-2 py-1 rounded-lg text-xs font-mono tabular-nums text-right bg-white/80 dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.16] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => onDeleteBudget(b.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            aria-label={`Remover orçamento ${b.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            b.isExceeded
                              ? 'bg-rose-500'
                              : b.isWarning
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                        <span className="text-slate-600 dark:text-zinc-300">
                          Realizado: <strong className="text-slate-900 dark:text-white">{formatBRL(b.actualAmount)}</strong> ({formatNumber(b.consumedPercent, 1)}%)
                        </span>

                        <span
                          className={`font-semibold inline-flex items-center gap-1 ${
                            b.isExceeded
                              ? 'text-rose-600 dark:text-rose-300'
                              : b.isWarning
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-emerald-600 dark:text-emerald-300'
                          }`}
                        >
                          {b.isExceeded ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              Estouro de {formatBRL(Math.abs(b.variance))}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Disponível: {formatBRL(b.variance)}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Strategic Goals Progress List */}
          <div className="dash-card rounded-[24px] p-5 space-y-4">
            <div className="border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-900 dark:text-white" />
                Metas Financeiras e Operacionais
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Progresso calculado automaticamente com base nos resultados atuais da empresa
              </p>
            </div>

            {resolvedGoals.length === 0 ? (
              <div className="dash-inset rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                Nenhuma meta cadastrada. Use o formulário ao lado para criar sua primeira meta.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resolvedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="dash-inset rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {g.category} · Prazo {g.deadline}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {g.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteGoal(g.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                        aria-label={`Remover meta ${g.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {formatGoalValue(g.currentValue, g.unit)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Meta: {formatGoalValue(g.targetValue, g.unit)}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            g.achieved ? 'bg-emerald-500' : 'bg-[#3B66F5] dark:bg-white'
                          }`}
                          style={{ width: `${g.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-zinc-400 truncate">
                          {METRIC_LABELS[g.metricType]}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-bold shrink-0 ${
                            g.achieved
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : 'text-slate-700 dark:text-zinc-200'
                          }`}
                        >
                          {formatNumber(g.rawPercent, 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Creation Form (Meta or Orçamento) */}
        <div className="lg:col-span-5 dash-card rounded-[24px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-900 dark:text-white" />
              Novo Registro
            </h4>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
              <button
                type="button"
                onClick={() => setFormMode('goal')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  formMode === 'goal'
                    ? 'dash-nav-pill-active font-semibold'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                Nova Meta
              </button>
              <button
                type="button"
                onClick={() => setFormMode('budget')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  formMode === 'budget'
                    ? 'dash-nav-pill-active font-semibold'
                    : 'text-slate-600 dark:text-zinc-400'
                }`}
              >
                Novo Orçamento
              </button>
            </div>
          </div>

          {formMode === 'goal' ? (
            <form onSubmit={handleSubmitGoal} className="space-y-3.5">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Título da Meta
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: Meta de Faturamento Mensal"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Indicador Vinculado (Atualização Automática)
                </span>
                <select
                  value={goalMetricType}
                  onChange={(e) => setGoalMetricType(e.target.value as GoalMetricType)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {(Object.keys(METRIC_LABELS) as GoalMetricType[]).map((key) => (
                    <option key={key} value={key}>
                      {METRIC_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                    {goalMetricType === 'margem_bruta'
                      ? 'Alvo (%)'
                      : goalMetricType === 'ordens_faturadas'
                        ? 'Alvo (Qtde OPs)'
                        : 'Valor Alvo (R$)'}
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    step={goalMetricType === 'margem_bruta' ? 0.5 : 100}
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                    Prazo / Competência
                  </span>
                  <input
                    type="text"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  />
                </label>
              </div>

              {goalMetricType === 'personalizado' && (
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                    Valor Atual Realizado (R$)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={goalManualCurrent}
                    onChange={(e) => setGoalManualCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  />
                </label>
              )}

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Área / Categoria
                </span>
                <input
                  type="text"
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 dash-cobalt-btn rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Meta</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitBudget} className="space-y-3.5">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Nome do Centro Orçamentário
                </span>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teto de Manutenção & Ferramental"
                  value={budgetTitle}
                  onChange={(e) => setBudgetTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Origem do Consumo Real
                </span>
                <select
                  value={budgetSource}
                  onChange={(e) => setBudgetSource(e.target.value as BudgetSourceKey)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {(Object.keys(SOURCE_LABELS) as BudgetSourceKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SOURCE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                    Teto Orçado (R$)
                  </span>
                  <input
                    type="number"
                    required
                    min={100}
                    step={250}
                    value={budgetPlanned}
                    onChange={(e) => setBudgetPlanned(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  />
                </label>

                {budgetSource === 'personalizado' && (
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                      Gasto Realizado (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={budgetActualManual}
                      onChange={(e) => setBudgetActualManual(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/75 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 dash-cobalt-btn rounded-full text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Orçamento</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
