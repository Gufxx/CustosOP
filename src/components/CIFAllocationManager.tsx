import { useState } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  X,
} from 'lucide-react';
import {
  IndirectCostItem,
  CIFConfiguration,
  ProductionOrder,
  OrderCostSummary,
  AllocationBase,
  CIFMethod,
  CIFCategory,
} from '../types/costing';
import {
  formatBRL,
  formatNumber,
  getAllocationBaseUnit,
  getOrderBaseValue,
} from '../utils/costCalculations';

interface CIFAllocationManagerProps {
  cifItems: IndirectCostItem[];
  cifConfig: CIFConfiguration;
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  effectiveCIFRate: number;
  totalAllocationBase: number;
  totalActualCIF: number;
  totalAppliedCIF: number;
  cifVariance: number;
  onUpdateConfig: (newConfig: CIFConfiguration) => void;
  onAddCIFItem: (item: Omit<IndirectCostItem, 'id'>) => void;
  onDeleteCIFItem: (itemId: string) => void;
}

export function CIFAllocationManager({
  cifItems,
  cifConfig,
  orders,
  summaries,
  effectiveCIFRate,
  totalAllocationBase,
  totalActualCIF,
  totalAppliedCIF,
  cifVariance,
  onUpdateConfig,
  onAddCIFItem,
  onDeleteCIFItem,
}: CIFAllocationManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<CIFCategory>('energia_eletrica');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDocRef, setNewDocRef] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreateCIF = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount.replace(',', '.'));
    if (!newDesc || isNaN(amountNum) || amountNum <= 0) return;

    onAddCIFItem({
      code: `CIF-${cifItems.length + 1}`,
      description: newDesc,
      category: newCategory,
      amount: amountNum,
      date: newDate,
      documentRef: newDocRef || undefined,
    });

    setNewDesc('');
    setNewAmount('');
    setNewDocRef('');
    setShowAddModal(false);
  };

  const getCategoryLabel = (cat: CIFCategory) => {
    switch (cat) {
      case 'energia_eletrica':
        return 'Energia Elétrica Fabril';
      case 'depreciacao_maquinas':
        return 'Depreciação de Máquinas';
      case 'aluguel_fabril':
        return 'Aluguel do Pavilhão';
      case 'manutencao_fabril':
        return 'Manutenção Fabril';
      case 'supervisao_fabrica':
        return 'Supervisão de Produção';
      case 'materiais_indiretos':
        return 'Materiais Indiretos';
      case 'seguro_fabrica':
        return 'Seguro da Fábrica';
      default:
        return 'Outros CIF';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Card */}
      <div className="dash-card rounded-[24px] p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Parametrização do Rateio de CIF
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure os critérios de apropriação dos Custos Indiretos de Fabricação conforme a teoria contábil
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
              Método de Apropriação
            </label>
            <select
              value={cifConfig.method}
              onChange={(e) =>
                onUpdateConfig({
                  ...cifConfig,
                  method: e.target.value as CIFMethod,
                })
              }
              className="w-full text-xs font-medium bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-white/40 focus:outline-none cursor-pointer"
            >
              <option value="taxa_real" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Taxa Efetiva Real (A posteriori - 100% Incorrido)
              </option>
              <option value="taxa_predeterminada" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Taxa Pré-Determinada (A priori - Orçada)
              </option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5">
              {cifConfig.method === 'taxa_real'
                ? 'Rateia exatamente o total dos gastos indiretos reais apurados no período.'
                : 'Usa taxa fixada no início do período orçado. Apura sub/sobreaplicação ao final.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
              Base de Rateio (Direcionador de Custo)
            </label>
            <select
              value={cifConfig.allocationBase}
              onChange={(e) =>
                onUpdateConfig({
                  ...cifConfig,
                  allocationBase: e.target.value as AllocationBase,
                })
              }
              className="w-full text-xs font-medium bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-white/40 focus:outline-none cursor-pointer"
            >
              <option value="horas_mod" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Horas de Mão de Obra Direta (h MOD)
              </option>
              <option value="custo_mod" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Valor da Mão de Obra Direta (R$ MOD)
              </option>
              <option value="material_direto" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Valor do Material Direto (R$ MD)
              </option>
              <option value="custo_primario" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Custo Primário (MD + MOD)
              </option>
              <option value="horas_maquina" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Horas-Máquina (h Máq)
              </option>
              <option value="unidades" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">
                Quantidade Produzida (Unidades)
              </option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 tabular-nums">
              Base total apurada:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatNumber(totalAllocationBase, 2)}{' '}
                {getAllocationBaseUnit(cifConfig.allocationBase)}
              </strong>
            </p>
          </div>

          {cifConfig.method === 'taxa_predeterminada' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                Taxa Pré-Determinada (R$ / unidade de base)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-900 dark:text-white">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={cifConfig.predeterminedRate}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...cifConfig,
                      predeterminedRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs font-bold pl-9 pr-3 py-2.5 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white font-mono tabular-nums"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5">
                Taxa fixada por {getAllocationBaseUnit(cifConfig.allocationBase)}
              </p>
            </div>
          )}
        </div>

        {/* Calculation formula banner */}
        <div className="dash-inset p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-200">Fórmula Vigente:</span>
            <code className="bg-slate-900/[0.06] dark:bg-white/[0.1] px-3 py-1 rounded-full border border-slate-300/70 dark:border-white/[0.18] text-slate-900 dark:text-white font-mono font-bold tabular-nums">
              Taxa CIF = {formatBRL(effectiveCIFRate)} por{' '}
              {getAllocationBaseUnit(cifConfig.allocationBase)}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-zinc-300 font-mono tabular-nums">
            <span>
              CIF Real: <strong className="text-slate-900 dark:text-white">{formatBRL(totalActualCIF)}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              CIF Apropriado: <strong className="text-slate-900 dark:text-white">{formatBRL(totalAppliedCIF)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Predetermined Rate Variance Alert */}
      {cifConfig.method === 'taxa_predeterminada' && Math.abs(cifVariance) > 0.01 && (
        <div
          className={`rounded-[22px] p-4 border flex items-start gap-3.5 ${
            cifVariance > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
          }`}
        >
          {cifVariance > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {cifVariance > 0
                ? `Variação de CIF: Subaplicação de ${formatBRL(cifVariance)}`
                : `Variação de CIF: Sobreaplicação de ${formatBRL(Math.abs(cifVariance))}`}
            </h4>
            <p className="opacity-90 leading-relaxed">
              {cifVariance > 0 ? (
                <>
                  Os custos indiretos <strong>reais</strong> incorridos ({formatBRL(totalActualCIF)}) foram superiores aos
                  custos <strong>aplicados</strong> ({formatBRL(totalAppliedCIF)}). Na prática contábil brasileira (Eliseu Martins),
                  essa subaplicação representa uma insuficiência de custos alocados e é transferida como <strong>ajuste ao Custo dos Produtos Vendidos (CPV)</strong> no encerramento do exercício.
                </>
              ) : (
                <>
                  Os custos indiretos <strong>aplicados</strong> ({formatBRL(totalAppliedCIF)}) excederam os gastos <strong>reais</strong> ({formatBRL(totalActualCIF)}).
                  Esse excesso alocado aos produtos é creditado como <strong>redução do CPV</strong> (ou rateado proporcionalmente entre PeE, PA e CPV).
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Planilha de Rateio de CIF às Ordens de Produção */}
      <div className="dash-card rounded-[24px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08]">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Planilha de Rateio e Apropriação de CIF
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Demonstração detalhada do cálculo de rateio entre todas as ordens de produção ativas no período
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200/80 dark:border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Ordem (OP)</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Base da OP</th>
                <th className="py-3 px-4 text-right">% Partic.</th>
                <th className="py-3 px-4 text-right">Taxa Aplicada</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">CIF Apropriado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07]">
              {orders.map((op) => {
                const opBase = getOrderBaseValue(op, cifConfig.allocationBase);
                const sharePercent = totalAllocationBase > 0 ? (opBase / totalAllocationBase) * 100 : 0;
                const allocated = summaries[op.id]?.cifAllocated || 0;

                return (
                  <tr key={op.id} className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{op.code}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{op.clientName}</td>
                    <td className="py-2.5 px-4 text-center">
                      {op.status === 'em_elaboracao' && (
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">PeE</span>
                      )}
                      {op.status === 'encerrada' && (
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">PA</span>
                      )}
                      {op.status === 'faturada' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">Faturada</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(opBase, 2)} {getAllocationBaseUnit(cifConfig.allocationBase)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                      {formatNumber(sharePercent, 1)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                      {formatBRL(effectiveCIFRate)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white text-sm">
                      {formatBRL(allocated)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900/[0.03] dark:bg-white/[0.04] font-bold border-t border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white">
              <tr>
                <td colSpan={3} className="py-3 px-4">Total Geral</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatNumber(totalAllocationBase, 2)}{' '}
                  {getAllocationBaseUnit(cifConfig.allocationBase)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">100,0%</td>
                <td className="py-3 px-4 text-right">—</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white text-sm">
                  {formatBRL(totalAppliedCIF)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lista de Gastos Indiretos Incorridos no Período */}
      <div className="dash-card rounded-[24px] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Custos Indiretos de Fabricação Incorridos (Controle de CIF)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Comprovantes e lançamentos reais de gastos fabris do período contábil
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 dash-cobalt-btn text-white text-xs font-semibold rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar Gasto CIF</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/[0.03] dark:bg-white/[0.04] text-slate-700 dark:text-zinc-300 font-semibold border-b border-slate-200/80 dark:border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição do Custo Indireto</th>
                <th className="py-3 px-4">Categoria Contábil</th>
                <th className="py-3 px-4">Documento / NF</th>
                <th className="py-3 px-4 text-right">Valor Incorrido</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07]">
              {cifItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{item.code}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-zinc-400 font-mono tabular-nums">{item.date}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{item.description}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-zinc-300">
                    {getCategoryLabel(item.category)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400 text-[11px]">
                    {item.documentRef || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatBRL(item.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteCIFItem(item.id)}
                      className="text-slate-400 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-300 p-1 rounded-full hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir Custo Indireto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900/[0.03] dark:bg-white/[0.04] font-bold border-t border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white">
              <tr>
                <td colSpan={5} className="py-3 px-4">
                  Total de Custos Indiretos Incorridos (CIF Real)
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white text-sm">
                  {formatBRL(totalActualCIF)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal para Adicionar Novo Custo Indireto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="dash-modal rounded-[26px] max-w-md w-full overflow-hidden relative">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-6 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Lançar Gasto CIF
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Registre um novo Custo Indireto de Fabricação
              </p>
            </div>

            <form onSubmit={handleCreateCIF} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                  Descrição do Custo Fabril *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Energia Elétrica dos Motores..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                    Categoria Contábil
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CIFCategory)}
                    className="w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="energia_eletrica" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Energia Elétrica Fabril</option>
                    <option value="depreciacao_maquinas" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Depreciação de Máquinas</option>
                    <option value="aluguel_fabril" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Aluguel do Pavilhão</option>
                    <option value="manutencao_fabril" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Manutenção Fabril</option>
                    <option value="supervisao_fabrica" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Supervisão de Produção</option>
                    <option value="materiais_indiretos" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Materiais Indiretos</option>
                    <option value="seguro_fabrica" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Seguro da Fábrica</option>
                    <option value="outros_cif" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">Outros CIF</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 3500,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                    Data do Fato Gerador
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
                    Documento / Nota Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: NF-e 44521"
                    value={newDocRef}
                    onChange={(e) => setNewDocRef(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.12] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-300/70 dark:border-white/15 rounded-full font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 dash-cobalt-btn text-white rounded-full font-semibold transition-all cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
