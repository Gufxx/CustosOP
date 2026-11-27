import { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ProductionOrder, OrderStatus } from '../types/costing';

const ORDER_STATUS_OPTIONS: Array<{
  value: OrderStatus;
  label: string;
  dotClass: string;
}> = [
  {
    value: 'em_elaboracao',
    label: 'Em Elaboração (Ativo - PeE)',
    dotClass: 'bg-amber-400',
  },
  {
    value: 'encerrada',
    label: 'Concluída / Em Estoque (Ativo - PA)',
    dotClass: 'bg-sky-400',
  },
  {
    value: 'faturada',
    label: 'Faturada e Entregue (Resultado - CPV)',
    dotClass: 'bg-emerald-400',
  },
];

interface AddOrderModalProps {
  isOpen: boolean;
  orderToEdit?: ProductionOrder | null;
  onClose: () => void;
  onSaveOrder: (orderData: Partial<ProductionOrder>) => void;
}

export function AddOrderModal({
  isOpen,
  orderToEdit,
  onClose,
  onSaveOrder,
}: AddOrderModalProps) {
  const [code, setCode] = useState('');
  const [clientName, setClientName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('un');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [machineHours, setMachineHours] = useState('0');
  const [sellingPriceUnit, setSellingPriceUnit] = useState('');
  const [taxRatePercent, setTaxRatePercent] = useState('12');
  const [status, setStatus] = useState<OrderStatus>('em_elaboracao');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isStatusMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isStatusMenuOpen]);

  useEffect(() => {
    if (orderToEdit) {
      setCode(orderToEdit.code);
      setClientName(orderToEdit.clientName);
      setProductDescription(orderToEdit.productDescription);
      setQuantity(orderToEdit.quantity.toString());
      setUnit(orderToEdit.unit);
      setStartDate(orderToEdit.startDate);
      setTargetDate(orderToEdit.targetDate);
      setMachineHours((orderToEdit.machineHours || 0).toString());
      setSellingPriceUnit(orderToEdit.sellingPriceUnit ? orderToEdit.sellingPriceUnit.toString() : '');
      setTaxRatePercent((orderToEdit.taxRatePercent ?? 12).toString());
      setStatus(orderToEdit.status);
    } else {
      setCode(`OP-${Math.floor(100 + Math.random() * 900)}`);
      setClientName('');
      setProductDescription('');
      setQuantity('1');
      setUnit('un');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetDate('');
      setMachineHours('0');
      setSellingPriceUnit('');
      setTaxRatePercent('12');
      setStatus('em_elaboracao');
    }
    setIsStatusMenuOpen(false);
  }, [orderToEdit, isOpen]);

  const shouldReduceMotion = useReducedMotion();

  const selectedStatusOption =
    ORDER_STATUS_OPTIONS.find((opt) => opt.value === status) || ORDER_STATUS_OPTIONS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !clientName || !productDescription) return;

    onSaveOrder({
      code,
      clientName,
      productDescription,
      quantity: Math.max(1, parseFloat(quantity) || 1),
      unit,
      startDate,
      targetDate: targetDate || startDate,
      machineHours: parseFloat(machineHours) || 0,
      sellingPriceUnit: sellingPriceUnit ? parseFloat(sellingPriceUnit) : undefined,
      taxRatePercent: parseFloat(taxRatePercent) || 12,
      status,
    });

    onClose();
  };

  const inputClass =
    'w-full py-2 px-3 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.14] rounded-xl focus:ring-2 focus:ring-white/40 focus:outline-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500';
  const labelClass = 'block font-semibold text-slate-700 dark:text-zinc-200 mb-1.5';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 dark:bg-black/45 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(6px)' }
            }
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8, filter: 'blur(4px)' }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.01 }
                : { type: 'spring', stiffness: 360, damping: 28, mass: 0.82 }
            }
            className="dash-modal rounded-[28px] max-w-lg w-full overflow-visible relative"
          >
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
            {orderToEdit ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Defina os dados da encomenda e parâmetros fiscais
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Código da OP *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: OP-104"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} font-mono font-bold text-slate-900 dark:text-white`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Cliente / Encomendante *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Petrobras, Hospital Alfa..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Descrição e Especificação do Produto *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Ex: 5 Válvulas Esfera 8 polegadas em Aço Inox 316..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`${inputClass} font-bold font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Unidade
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`${inputClass} font-medium cursor-pointer`}
              >
                <option value="un" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">un (unidades)</option>
                <option value="conj" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">conj (conjunto)</option>
                <option value="pç" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">pç (peças)</option>
                <option value="kit" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">kit</option>
                <option value="lote" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">lote</option>
                <option value="kg" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">kg</option>
                <option value="m" className="bg-white dark:bg-[#141418] text-slate-900 dark:text-white">m (metros)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Horas-Máquina (h)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={machineHours}
                onChange={(e) => setMachineHours(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Previsão de Término
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className={labelClass}>
                Preço de Venda Unitário (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 12500,00"
                value={sellingPriceUnit}
                onChange={(e) => setSellingPriceUnit(e.target.value)}
                className={`${inputClass} font-semibold text-slate-900 dark:text-white font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Tributos s/ Vendas (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          {orderToEdit && (
            <div ref={statusDropdownRef} className="relative">
              <label className={labelClass}>
                Status Atual da Ordem
              </label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isStatusMenuOpen}
                onClick={() => setIsStatusMenuOpen((prev) => !prev)}
                className={`${inputClass} font-semibold cursor-pointer flex items-center justify-between gap-2 text-left`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${selectedStatusOption.dotClass}`} />
                  <span className="truncate text-slate-900 dark:text-white">
                    {selectedStatusOption.label}
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-slate-500 dark:text-zinc-300 transition-transform duration-200 ${
                    isStatusMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isStatusMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Status Atual da Ordem"
                  className="absolute left-0 right-0 bottom-full mb-1.5 z-30 rounded-2xl border border-slate-200 dark:border-white/20 bg-white/95 dark:bg-[#16161c]/95 backdrop-blur-2xl shadow-2xl p-1.5 space-y-1"
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => {
                    const isSelected = opt.value === status;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setStatus(opt.value);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white/15 dark:text-white font-semibold'
                            : 'text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/10 font-medium'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 flex items-center gap-3">
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
              {orderToEdit ? 'Atualizar OP' : 'Abrir Ordem de Produção'}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
