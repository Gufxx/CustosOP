import { useState, useEffect, useMemo } from 'react';
import { Building2, Moon, Printer, Trash2, X } from 'lucide-react';
import {
  ProductionOrder,
  IndirectCostItem,
  CIFConfiguration,
  CompanyParameters,
  OrderStatus,
  DirectMaterialEntry,
  DirectLaborEntry,
} from './types/costing';
import {
  MOCK_SCENARIOS,
  PredefinedScenario,
} from './data/mockScenarios';
import {
  calculateAllOrdersCosts,
  calculateInventoryBalances,
  generateConsolidatedDRE,
  generateTAccounts,
} from './utils/costCalculations';
import { Header, AppTab } from './components/Header';
import { NocturnalBackdrop } from './components/NocturnalBackdrop';
import { CostOverviewCards } from './components/CostOverviewCards';
import { ProductionOrdersList } from './components/ProductionOrdersList';
import { CIFAllocationManager } from './components/CIFAllocationManager';
import { TAccountsViewer } from './components/TAccountsViewer';
import { DREStatementView } from './components/DREStatementView';
import { JobCostSheetModal } from './components/JobCostSheetModal';
import { AddOrderModal } from './components/AddOrderModal';
import { AddCostEntryModal } from './components/AddCostEntryModal';
import { TheoryGuideModal } from './components/TheoryGuideModal';
import {
  ConsolidatedPrintReport,
  ConsolidatedExportModal,
} from './components/ConsolidatedPrintReport';

const STORAGE_KEY = 'custos_op_app_data_v1';
const THEME_KEY = 'custos_op_theme_v1';

export default function App() {
  // Theme state synced to <html class="dark">
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Scenario selection
  const [currentScenario, setCurrentScenario] = useState<PredefinedScenario>(MOCK_SCENARIOS[0]);

  // Main state
  const [orders, setOrders] = useState<ProductionOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.orders) return parsed.orders;
      }
    } catch (e) {
      console.error(e);
    }
    return MOCK_SCENARIOS[0].orders;
  });

  const [cifItems, setCifItems] = useState<IndirectCostItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cifItems) return parsed.cifItems;
      }
    } catch (e) {
      console.error(e);
    }
    return MOCK_SCENARIOS[0].cifItems;
  });

  const [cifConfig, setCifConfig] = useState<CIFConfiguration>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cifConfig) return parsed.cifConfig;
      }
    } catch (e) {
      console.error(e);
    }
    return MOCK_SCENARIOS[0].cifConfig;
  });

  const [companyParams, setCompanyParams] = useState<CompanyParameters>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.companyParams) return parsed.companyParams;
      }
    } catch (e) {
      console.error(e);
    }
    return MOCK_SCENARIOS[0].companyParams;
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppTab>('orders');

  // Modals state
  const [selectedCostSheetOrder, setSelectedCostSheetOrder] = useState<ProductionOrder | null>(null);
  const [selectedAddCostOrder, setSelectedAddCostOrder] = useState<ProductionOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ProductionOrder | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!pendingConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingConfirm]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orders,
          cifItems,
          cifConfig,
          companyParams,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }, [orders, cifItems, cifConfig, companyParams]);

  // Load a predefined scenario
  const handleSelectScenario = (scenario: PredefinedScenario) => {
    setCurrentScenario(scenario);
    setOrders(scenario.orders);
    setCifItems(scenario.cifItems);
    setCifConfig(scenario.cifConfig);
    setCompanyParams(scenario.companyParams);
  };

  // Perform core Brazilian cost calculations dynamically
  const cifAnalysis = useMemo(() => {
    return calculateAllOrdersCosts(orders, cifItems, cifConfig);
  }, [orders, cifItems, cifConfig]);

  const totalMDConsumed = useMemo(() => {
    return Object.values(cifAnalysis.summaries).reduce((acc, s) => acc + s.totalMD, 0);
  }, [cifAnalysis]);

  const totalMODConsumed = useMemo(() => {
    return Object.values(cifAnalysis.summaries).reduce((acc, s) => acc + s.totalMOD, 0);
  }, [cifAnalysis]);

  const totalManufacturingCost = useMemo(() => {
    return Object.values(cifAnalysis.summaries).reduce(
      (acc, s) => acc + s.totalManufacturingCost,
      0
    );
  }, [cifAnalysis]);

  const inventoryBalances = useMemo(() => {
    return calculateInventoryBalances(
      orders,
      cifAnalysis.summaries,
      companyParams,
      totalMDConsumed
    );
  }, [orders, cifAnalysis.summaries, companyParams, totalMDConsumed]);

  const dre = useMemo(() => {
    return generateConsolidatedDRE(
      orders,
      cifAnalysis.summaries,
      cifAnalysis.cifVariance,
      companyParams
    );
  }, [orders, cifAnalysis.summaries, cifAnalysis.cifVariance, companyParams]);

  const tAccounts = useMemo(() => {
    return generateTAccounts(
      orders,
      cifItems,
      cifAnalysis.summaries,
      companyParams,
      cifAnalysis,
      dre
    );
  }, [orders, cifItems, cifAnalysis.summaries, companyParams, cifAnalysis, dre]);

  // Order CRUD & workflow operations
  const handleSaveOrder = (orderData: Partial<ProductionOrder>) => {
    if (orderToEdit) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderToEdit.id ? ({ ...o, ...orderData } as ProductionOrder) : o))
      );
      setOrderToEdit(null);
    } else {
      const newOrder: ProductionOrder = {
        id: `op-${Date.now()}`,
        code: orderData.code || `OP-${orders.length + 101}`,
        clientName: orderData.clientName || 'Novo Cliente',
        productDescription: orderData.productDescription || 'Especificação do produto',
        quantity: orderData.quantity || 1,
        unit: orderData.unit || 'un',
        startDate: orderData.startDate || new Date().toISOString().split('T')[0],
        targetDate: orderData.targetDate || new Date().toISOString().split('T')[0],
        machineHours: orderData.machineHours || 0,
        status: 'em_elaboracao',
        materials: [],
        labor: [],
        sellingPriceUnit: orderData.sellingPriceUnit,
        taxRatePercent: orderData.taxRatePercent ?? 12,
      };
      setOrders((prev) => [...prev, newOrder]);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    setPendingConfirm({
      title: targetOrder
        ? `Excluir ${targetOrder.code}?`
        : 'Excluir Ordem de Produção?',
      description: targetOrder
        ? `A ordem "${targetOrder.code}" (${targetOrder.clientName}) e todos os seus apontamentos de MD, MOD e CIF serão removidos.`
        : 'Tem certeza de que deseja excluir esta Ordem de Produção?',
      confirmLabel: 'Excluir Ordem',
      onConfirm: () => {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSelectedCostSheetOrder((prev) => (prev?.id === orderId ? null : prev));
        setSelectedAddCostOrder((prev) => (prev?.id === orderId ? null : prev));
        setOrderToEdit((prev) => (prev?.id === orderId ? null : prev));
      },
    });
  };

  const handleChangeOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            completedDate:
              newStatus === 'encerrada' || newStatus === 'faturada'
                ? new Date().toISOString().split('T')[0]
                : o.completedDate,
          };
        }
        return o;
      })
    );
  };

  // Direct costs handling
  const handleAddMaterial = (orderId: string, material: Omit<DirectMaterialEntry, 'id'>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const newEntry: DirectMaterialEntry = {
            id: `mat-${Date.now()}`,
            ...material,
          };
          return {
            ...o,
            materials: [...(o.materials || []), newEntry],
          };
        }
        return o;
      })
    );
  };

  const handleAddLabor = (orderId: string, labor: Omit<DirectLaborEntry, 'id'>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const newEntry: DirectLaborEntry = {
            id: `lab-${Date.now()}`,
            ...labor,
          };
          return {
            ...o,
            labor: [...(o.labor || []), newEntry],
          };
        }
        return o;
      })
    );
  };

  const handleUpdateMachineHours = (orderId: string, hours: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, machineHours: hours } : o))
    );
  };

  // Indirect costs (CIF) handling
  const handleAddCIFItem = (item: Omit<IndirectCostItem, 'id'>) => {
    const newItem: IndirectCostItem = {
      id: `cif-${Date.now()}`,
      ...item,
    };
    setCifItems((prev) => [...prev, newItem]);
  };

  const handleDeleteCIFItem = (itemId: string) => {
    setCifItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-[#F5F5F7] relative overflow-x-clip">
      <NocturnalBackdrop />

      {/* Top Bar Layout (matching reference image_a56beec9.png) */}
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenTheory={() => setIsTheoryModalOpen(true)}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 space-y-5 max-w-[1440px] w-full mx-auto print:hidden">
        {/* Compact Workspace Context & Theme Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="relative flex items-center">
              <Building2 className="w-3.5 h-3.5 absolute left-3.5 text-slate-700 dark:text-white pointer-events-none" />
              <select
                aria-label="Selecionar caso prático ou cenário industrial"
                value={currentScenario.id}
                onChange={(e) => {
                  const sc = MOCK_SCENARIOS.find((s) => s.id === e.target.value);
                  if (sc) handleSelectScenario(sc);
                }}
                className="dash-glass-pill text-slate-900 dark:text-white text-xs font-medium pl-9 pr-8 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer transition-colors max-w-[240px] sm:max-w-none truncate"
              >
                {MOCK_SCENARIOS.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    className="bg-white dark:bg-[#09090B] text-slate-900 dark:text-white"
                  >
                    Cenário: {s.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-500 dark:text-zinc-400 hidden sm:inline">
              {companyParams.companyName} · {companyParams.periodName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Minimalist Dark Mode Switch */}
            <div className="dash-glass-pill rounded-full px-3 py-1 flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200">
                <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-white" />
                <span className="hidden sm:inline">Modo Escuro</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Alternar entre modo claro e escuro"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  isDark
                    ? 'bg-white/25 border-white/30'
                    : 'bg-slate-300/80 border-slate-400/30'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isDark ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="dash-glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Exportar / imprimir DRE e resumo das Ordens de Produção"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar DRE &amp; OPs</span>
            </button>
          </div>
        </div>

        {/* Full-Width CIF Banner + 4-Column KPI Row (matching reference layout) */}
        <CostOverviewCards
          totalManufacturingCost={totalManufacturingCost}
          totalMD={totalMDConsumed}
          totalMOD={totalMODConsumed}
          totalCIF={cifAnalysis.totalAppliedCIF}
          wipBalance={inventoryBalances.finalWIP}
          wipCount={inventoryBalances.wipOrdersCount}
          finishedGoodsBalance={inventoryBalances.finalFinishedGoods}
          finishedCount={inventoryBalances.finishedOrdersCount}
          cpvBalance={inventoryBalances.baseCPV}
          invoicedCount={inventoryBalances.invoicedOrdersCount}
          grossRevenue={dre.grossRevenue}
          grossMarginPercent={dre.grossMarginPercent}
          cifConfig={cifConfig}
          effectiveCIFRate={cifAnalysis.effectiveCIFRate}
          totalAllocationBase={cifAnalysis.totalAllocationBase}
          cifVariance={cifAnalysis.cifVariance}
          onJumpToCIF={() => setActiveTab('cif')}
        />

        {/* Active Workspace Section */}
        {activeTab === 'orders' && (
          <ProductionOrdersList
            orders={orders}
            summaries={cifAnalysis.summaries}
            onOpenCostSheet={(op) => setSelectedCostSheetOrder(op)}
            onOpenAddCost={(op) => setSelectedAddCostOrder(op)}
            onOpenEditOrder={(op) => {
              setOrderToEdit(op);
              setIsNewOrderModalOpen(true);
            }}
            onOpenNewOrder={() => {
              setOrderToEdit(null);
              setIsNewOrderModalOpen(true);
            }}
            onDeleteOrder={handleDeleteOrder}
            onChangeOrderStatus={handleChangeOrderStatus}
          />
        )}

        {activeTab === 'cif' && (
          <CIFAllocationManager
            cifItems={cifItems}
            cifConfig={cifConfig}
            orders={orders}
            summaries={cifAnalysis.summaries}
            effectiveCIFRate={cifAnalysis.effectiveCIFRate}
            totalAllocationBase={cifAnalysis.totalAllocationBase}
            totalActualCIF={cifAnalysis.totalActualCIF}
            totalAppliedCIF={cifAnalysis.totalAppliedCIF}
            cifVariance={cifAnalysis.cifVariance}
            onUpdateConfig={setCifConfig}
            onAddCIFItem={handleAddCIFItem}
            onDeleteCIFItem={handleDeleteCIFItem}
          />
        )}

        {activeTab === 'taccounts' && (
          <TAccountsViewer tAccounts={tAccounts} />
        )}

        {activeTab === 'dre' && (
          <DREStatementView
            dre={dre}
            orders={orders}
            summaries={cifAnalysis.summaries}
            onExportPrint={() => setIsExportModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] mt-8 py-5 text-xs text-slate-500 dark:text-zinc-400 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong className="text-slate-900 dark:text-white">CustosOP</strong> — Gestão e Acumulação de Custos por Ordem de Produção (CPC 16 / NBC TG 16).
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
            Ambiente prático para Contadores, Controllers e Estudantes de Contabilidade de Custos.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedCostSheetOrder && (
        <JobCostSheetModal
          order={selectedCostSheetOrder}
          summary={cifAnalysis.summaries[selectedCostSheetOrder.id]}
          cifConfig={cifConfig}
          effectiveCIFRate={cifAnalysis.effectiveCIFRate}
          companyParams={companyParams}
          onClose={() => setSelectedCostSheetOrder(null)}
        />
      )}

      {selectedAddCostOrder && (
        <AddCostEntryModal
          order={selectedAddCostOrder}
          onClose={() => setSelectedAddCostOrder(null)}
          onAddMaterial={handleAddMaterial}
          onAddLabor={handleAddLabor}
          onUpdateMachineHours={handleUpdateMachineHours}
        />
      )}

      <AddOrderModal
        isOpen={isNewOrderModalOpen}
        orderToEdit={orderToEdit}
        onClose={() => {
          setIsNewOrderModalOpen(false);
          setOrderToEdit(null);
        }}
        onSaveOrder={handleSaveOrder}
      />

      <TheoryGuideModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
      />

      <ConsolidatedExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        companyParams={companyParams}
        scenarioName={currentScenario.name}
        cifConfig={cifConfig}
        effectiveCIFRate={cifAnalysis.effectiveCIFRate}
        totalAllocationBase={cifAnalysis.totalAllocationBase}
        totalActualCIF={cifAnalysis.totalActualCIF}
        totalAppliedCIF={cifAnalysis.totalAppliedCIF}
        totalManufacturingCost={totalManufacturingCost}
        totalMD={totalMDConsumed}
        totalMOD={totalMODConsumed}
        wipBalance={inventoryBalances.finalWIP}
        wipCount={inventoryBalances.wipOrdersCount}
        finishedGoodsBalance={inventoryBalances.finalFinishedGoods}
        finishedCount={inventoryBalances.finishedOrdersCount}
        dre={dre}
        orders={orders}
        summaries={cifAnalysis.summaries}
      />

      {/* Consolidated Print-Only Accounting Report (active when single Job Cost Sheet modal is not open) */}
      {!selectedCostSheetOrder && (
        <ConsolidatedPrintReport
          companyParams={companyParams}
          scenarioName={currentScenario.name}
          cifConfig={cifConfig}
          effectiveCIFRate={cifAnalysis.effectiveCIFRate}
          totalAllocationBase={cifAnalysis.totalAllocationBase}
          totalActualCIF={cifAnalysis.totalActualCIF}
          totalAppliedCIF={cifAnalysis.totalAppliedCIF}
          totalManufacturingCost={totalManufacturingCost}
          totalMD={totalMDConsumed}
          totalMOD={totalMODConsumed}
          wipBalance={inventoryBalances.finalWIP}
          wipCount={inventoryBalances.wipOrdersCount}
          finishedGoodsBalance={inventoryBalances.finalFinishedGoods}
          finishedCount={inventoryBalances.finishedOrdersCount}
          dre={dre}
          orders={orders}
          summaries={cifAnalysis.summaries}
        />
      )}

      {/* Custom In-App Confirmation Modal (replaces browser confirm() blocked in iframe) */}
      {pendingConfirm && (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setPendingConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="dash-modal rounded-[26px] max-w-md w-full overflow-hidden relative p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPendingConfirm(null)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Fechar confirmação"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3
                  id="confirm-dialog-title"
                  className="text-base font-bold text-slate-900 dark:text-white tracking-tight"
                >
                  {pendingConfirm.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {pendingConfirm.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-slate-300/70 dark:border-white/15 rounded-full transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingConfirm.onConfirm();
                  setPendingConfirm(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-full transition-colors cursor-pointer bg-rose-600 hover:bg-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{pendingConfirm.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
