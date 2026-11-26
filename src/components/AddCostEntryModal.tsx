import { useState } from 'react';
import { X, Package, Users, Cpu } from 'lucide-react';
import { ProductionOrder, DirectMaterialEntry, DirectLaborEntry } from '../types/costing';
import { formatBRL } from '../utils/costCalculations';

interface AddCostEntryModalProps {
  order: ProductionOrder | null;
  onClose: () => void;
  onAddMaterial: (orderId: string, material: Omit<DirectMaterialEntry, 'id'>) => void;
  onAddLabor: (orderId: string, labor: Omit<DirectLaborEntry, 'id'>) => void;
  onUpdateMachineHours: (orderId: string, hours: number) => void;
}

export function AddCostEntryModal({
  order,
  onClose,
  onAddMaterial,
  onAddLabor,
  onUpdateMachineHours,
}: AddCostEntryModalProps) {
  const [activeTab, setActiveTab] = useState<'material' | 'labor' | 'machine'>('material');

  // Material State
  const [matDate, setMatDate] = useState(new Date().toISOString().split('T')[0]);
  const [matReqNumber, setMatReqNumber] = useState(`RMA-${Math.floor(100 + Math.random() * 900)}`);
  const [matItemCode, setMatItemCode] = useState('MP-');
  const [matDescription, setMatDescription] = useState('');
  const [matQuantity, setMatQuantity] = useState('1');
  const [matUnit, setMatUnit] = useState('un');
  const [matUnitCost, setMatUnitCost] = useState('');

  // Labor State
  const [labDate, setLabDate] = useState(new Date().toISOString().split('T')[0]);
  const [labWorkerName, setLabWorkerName] = useState('');
  const [labRole, setLabRole] = useState('');
  const [labHours, setLabHours] = useState('8');
  const [labHourlyRate, setLabHourlyRate] = useState('50');

  // Machine Hours State
  const [machHours, setMachHours] = useState(order?.machineHours?.toString() || '0');

  if (!order) return null;

  const matQtyNum = parseFloat(matQuantity) || 0;
  const matCostNum = parseFloat(matUnitCost.replace(',', '.')) || 0;
  const matTotalCost = matQtyNum * matCostNum;

  const labHoursNum = parseFloat(labHours) || 0;
  const labRateNum = parseFloat(labHourlyRate.replace(',', '.')) || 0;
  const labTotalCost = labHoursNum * labRateNum;

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matDescription || matTotalCost <= 0) return;

    onAddMaterial(order.id, {
      date: matDate,
      reqNumber: matReqNumber,
      itemCode: matItemCode || 'MP-GERAL',
      description: matDescription,
      quantity: matQtyNum,
      unit: matUnit,
      unitCost: matCostNum,
      totalCost: matTotalCost,
    });

    onClose();
  };

  const handleSaveLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labWorkerName || labTotalCost <= 0) return;

    onAddLabor(order.id, {
      date: labDate,
      workerName: labWorkerName,
      role: labRole || 'Operador Especializado',
      hours: labHoursNum,
      hourlyRate: labRateNum,
      totalCost: labTotalCost,
    });

    onClose();
  };

  const handleSaveMachineHours = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMachineHours(order.id, parseFloat(machHours) || 0);
    onClose();
  };

  const inputClass =
    'w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.14] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500';
  const labelClass = 'block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 dark:bg-black/45 backdrop-blur-md flex items-center justify-center p-4 print:hidden">
      <div className="dash-modal rounded-[28px] max-w-md w-full overflow-hidden relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight pr-8">
            Lançamento de Custos Diretos
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
            Ordem: <strong className="text-slate-900 dark:text-white">{order.code}</strong> · {order.clientName}
          </p>
        </div>

        {/* Pill Tab Selector */}
        <div className="mx-6 mt-4 flex rounded-full bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/[0.1] p-1 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('material')}
            className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'material'
                ? 'dash-nav-pill-active'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Material (MD)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('labor')}
            className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'labor'
                ? 'dash-nav-pill-active'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mão de Obra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('machine')}
            className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'machine'
                ? 'dash-nav-pill-active'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Horas-Máq.</span>
          </button>
        </div>

        {/* Form Material Direto */}
        {activeTab === 'material' && (
          <form onSubmit={handleSaveMaterial} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nº RMA *</label>
                <input
                  type="text"
                  required
                  value={matReqNumber}
                  onChange={(e) => setMatReqNumber(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>Data da Saída</label>
                <input
                  type="date"
                  value={matDate}
                  onChange={(e) => setMatDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Cód. Item</label>
                <input
                  type="text"
                  value={matItemCode}
                  onChange={(e) => setMatItemCode(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Descrição do Material *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aço 1045, Chapa MDF 18mm..."
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Quantidade *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={matQuantity}
                  onChange={(e) => setMatQuantity(e.target.value)}
                  className={`${inputClass} font-bold font-mono tabular-nums`}
                />
              </div>
              <div>
                <label className={labelClass}>Unidade</label>
                <select
                  value={matUnit}
                  onChange={(e) => setMatUnit(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="un" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">un</option>
                  <option value="chapa" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">chapa</option>
                  <option value="kg" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">kg</option>
                  <option value="m" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">m</option>
                  <option value="m2" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">m²</option>
                  <option value="conj" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">conj</option>
                  <option value="litro" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">litro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Custo Unit. (R$) *</label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={matUnitCost}
                  onChange={(e) => setMatUnitCost(e.target.value)}
                  className={`${inputClass} font-semibold text-right font-mono tabular-nums`}
                />
              </div>
            </div>

            {/* Total MD Preview */}
            <div className="dash-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-200">Total Material Direto:</span>
              <span className="font-mono tabular-nums text-sm font-extrabold text-slate-900 dark:text-white">
                {formatBRL(matTotalCost)}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-300/70 dark:border-white/15 rounded-full font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 dash-cobalt-btn text-white rounded-full font-semibold transition-all cursor-pointer"
              >
                Apropriar Material
              </button>
            </div>
          </form>
        )}

        {/* Form Mão de Obra Direta */}
        {activeTab === 'labor' && (
          <form onSubmit={handleSaveLabor} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Colaborador / Operador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Santos"
                  value={labWorkerName}
                  onChange={(e) => setLabWorkerName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Data do Apontamento</label>
                <input
                  type="date"
                  value={labDate}
                  onChange={(e) => setLabDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Função / Centro de Trabalho</label>
              <input
                type="text"
                placeholder="Ex: Torneiro Especializado, Soldador TIG..."
                value={labRole}
                onChange={(e) => setLabRole(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Horas Trabalhadas (h) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.25"
                  required
                  value={labHours}
                  onChange={(e) => setLabHours(e.target.value)}
                  className={`${inputClass} font-bold font-mono tabular-nums`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Taxa Horária c/ Encargos (R$/h) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 55,00"
                  value={labHourlyRate}
                  onChange={(e) => setLabHourlyRate(e.target.value)}
                  className={`${inputClass} font-semibold text-right font-mono tabular-nums`}
                />
              </div>
            </div>

            {/* Total MOD Preview */}
            <div className="dash-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-200">Total Mão de Obra Direta:</span>
              <span className="font-mono tabular-nums text-sm font-extrabold text-slate-900 dark:text-white">
                {formatBRL(labTotalCost)}
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-300/70 dark:border-white/15 rounded-full font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 dash-cobalt-btn text-white rounded-full font-semibold transition-all cursor-pointer"
              >
                Apropriar Mão de Obra
              </button>
            </div>
          </form>
        )}

        {/* Form Horas-Máquina */}
        {activeTab === 'machine' && (
          <form onSubmit={handleSaveMachineHours} className="p-6 space-y-4 text-xs">
            <div>
              <label className={labelClass}>
                Horas-Máquina Acumuladas nesta Ordem (h)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={machHours}
                onChange={(e) => setMachHours(e.target.value)}
                className={`${inputClass} font-bold text-base font-mono tabular-nums`}
              />
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">
                Utilizado quando o critério de rateio de Custos Indiretos (CIF) é baseado em Horas-Máquina.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/10 border border-slate-300/70 dark:border-white/15 rounded-full font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 dash-cobalt-btn text-white rounded-full font-semibold transition-all cursor-pointer"
              >
                Atualizar Horas-Máquina
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
