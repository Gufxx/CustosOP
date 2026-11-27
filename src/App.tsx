import { useState, useEffect, useMemo } from 'react';
import { Home, LogOut, Menu, Moon, Printer, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ProductionOrder,
  IndirectCostItem,
  CIFConfiguration,
  CompanyParameters,
  OrderStatus,
  DirectMaterialEntry,
  DirectLaborEntry,
  FinancialGoal,
  BudgetAllocation,
  CashFlowEntry,
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
import { AppTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ScenarioSelectorDropdown } from './components/ScenarioSelectorDropdown';
import { NocturnalBackdrop } from './components/NocturnalBackdrop';
import { CostOverviewCards } from './components/CostOverviewCards';
import { Dashboard3DChartsView } from './components/Dashboard3DChartsView';
import { ProductionOrdersList } from './components/ProductionOrdersList';
import { CIFAllocationManager } from './components/CIFAllocationManager';
import { TAccountsViewer } from './components/TAccountsViewer';
import { DREStatementView } from './components/DREStatementView';
import { CorporateIRSimulatorView } from './components/CorporateIRSimulatorView';
import { GoalsAndBudgetsView } from './components/GoalsAndBudgetsView';
import { CashFlowEntriesView } from './components/CashFlowEntriesView';
import { JobCostSheetModal } from './components/JobCostSheetModal';
import { AddOrderModal } from './components/AddOrderModal';
import { AddCostEntryModal } from './components/AddCostEntryModal';
import { TheoryGuideModal } from './components/TheoryGuideModal';
import { LandingPage } from './components/LandingPage';
import { LoginPage, AuthUser } from './components/LoginPage';
import { FullPdfExportView } from './components/FullPdfExportView';
import {
  ConsolidatedPrintReport,
  ConsolidatedExportModal,
} from './components/ConsolidatedPrintReport';

const STORAGE_KEY = 'custos_op_app_data_v1';
const THEME_KEY = 'custos_op_theme_v1';
const AUTH_KEY = 'custos_op_auth_session_v1';

type AppView = 'landing' | 'login' | 'dashboard';

const TAB_ORDER: AppTab[] = [
  'overview',
  'orders',
  'cif',
  'taccounts',
  'dre',
  'ir',
  'goals',
  'cashflow',
  'export',
];

function buildDefaultGoals(scenario: PredefinedScenario): FinancialGoal[] {
  const period = scenario.companyParams.periodName;
  const estRevenueTarget = Math.max(
    45000,
    Math.round(
      scenario.orders.reduce(
        (acc, op) => acc + (op.sellingPriceUnit || 0) * (op.quantity || 1),
        0
      ) * 0.85
    )
  );
  return [
    {
      id: `goal-${scenario.id}-rev`,
      title: 'Meta de Faturamento do Período',
      category: 'Receita & Vendas',
      metricType: 'receita_bruta',
      targetValue: estRevenueTarget,
      unit: 'brl',
      deadline: period,
    },
    {
      id: `goal-${scenario.id}-margin`,
      title: 'Margem Bruta Fabril Mínima',
      category: 'Rentabilidade',
      metricType: 'margem_bruta',
      targetValue: 35,
      unit: 'percent',
      deadline: period,
    },
    {
      id: `goal-${scenario.id}-ebit`,
      title: 'Resultado Operacional (LAJIR)',
      category: 'Resultado Líquido',
      metricType: 'lucro_operacional',
      targetValue: 15000,
      unit: 'brl',
      deadline: period,
    },
    {
      id: `goal-${scenario.id}-cash`,
      title: 'Reserva Mínima de Caixa Realizado',
      category: 'Tesouraria',
      metricType: 'saldo_caixa',
      targetValue: 18000,
      unit: 'brl',
      deadline: period,
    },
  ];
}

function buildDefaultBudgets(scenario: PredefinedScenario): BudgetAllocation[] {
  const period = scenario.companyParams.periodName;
  const scenarioMD = scenario.orders.reduce(
    (acc, op) => acc + op.materials.reduce((mAcc, m) => mAcc + m.totalCost, 0),
    0
  );
  const scenarioMOD = scenario.orders.reduce(
    (acc, op) => acc + op.labor.reduce((lAcc, l) => lAcc + l.totalCost, 0),
    0
  );
  const scenarioCIF = scenario.cifItems.reduce((acc, c) => acc + c.amount, 0);
  return [
    {
      id: `bud-${scenario.id}-md`,
      title: 'Orçamento de Matéria-Prima (MD)',
      sourceKey: 'md',
      plannedAmount: Math.max(10000, Math.ceil((scenarioMD * 1.1) / 500) * 500),
      periodLabel: period,
    },
    {
      id: `bud-${scenario.id}-mod`,
      title: 'Teto de Mão de Obra Direta (MOD)',
      sourceKey: 'mod',
      plannedAmount: Math.max(6000, Math.ceil((scenarioMOD * 1.12) / 500) * 500),
      periodLabel: period,
    },
    {
      id: `bud-${scenario.id}-cif`,
      title: 'Orçamento de Custos Indiretos (CIF)',
      sourceKey: 'cif',
      plannedAmount: Math.max(8000, scenario.cifConfig.budgetedCIF || Math.ceil(scenarioCIF * 1.05)),
      periodLabel: period,
    },
    {
      id: `bud-${scenario.id}-adm`,
      title: 'Despesas Administrativas',
      sourceKey: 'administrativa',
      plannedAmount: Math.max(4000, Math.ceil((scenario.companyParams.administrativeExpenses * 1.05) / 250) * 250),
      periodLabel: period,
    },
    {
      id: `bud-${scenario.id}-com`,
      title: 'Despesas Comerciais & Marketing',
      sourceKey: 'comercial',
      plannedAmount: Math.max(3000, Math.ceil((scenario.companyParams.commercialExpenses * 1.1) / 250) * 250),
      periodLabel: period,
    },
  ];
}

function buildDefaultCashEntries(scenario: PredefinedScenario): CashFlowEntry[] {
  const firstDate = scenario.orders[0]?.startDate || '2026-03-01';
  const midDate = scenario.orders[1]?.startDate || '2026-03-10';
  return [
    {
      id: `cf-${scenario.id}-1`,
      type: 'entrada',
      date: firstDate,
      description: 'Saldo Inicial de Caixa & Disponibilidades',
      category: 'Aporte de Capital',
      amount: 25000,
      status: 'realizado',
      paymentMethod: 'Transferência TED',
    },
    {
      id: `cf-${scenario.id}-2`,
      type: 'entrada',
      date: midDate,
      description: 'Sinal de Adiantamento (Cliente Encomenda Ativa)',
      category: 'Sinal / Adiantamento de Cliente',
      amount: 9500,
      status: 'realizado',
      paymentMethod: 'PIX',
      linkedOrderCode: scenario.orders[scenario.orders.length - 1]?.code,
    },
    {
      id: `cf-${scenario.id}-3`,
      type: 'saida',
      date: midDate,
      description: 'Reposição de Estoque de Insumos no Almoxarifado',
      category: 'Compra de Matéria-Prima',
      amount: 12400,
      status: 'realizado',
      paymentMethod: 'Boleto',
    },
  ];
}

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

  // Auth session state
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
      if (saved) return JSON.parse(saved) as AuthUser;
    } catch {
      // ignore
    }
    return null;
  });

  // Top-level page view ('landing' | 'login' | 'dashboard')
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const hash = window.location.hash;
    if (hash === '#/login') return 'login';
    if (hash === '#/painel') {
      try {
        const hasSession =
          Boolean(localStorage.getItem(AUTH_KEY)) || Boolean(sessionStorage.getItem(AUTH_KEY));
        return hasSession ? 'dashboard' : 'login';
      } catch {
        return 'login';
      }
    }
    return 'landing';
  });

  const [pendingScenario, setPendingScenario] = useState<PredefinedScenario | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/login') {
        setCurrentView('login');
      } else if (hash === '#/painel') {
        setCurrentView(authUser ? 'dashboard' : 'login');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [authUser]);

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    const targetHash = view === 'login' ? '#/login' : view === 'dashboard' ? '#/painel' : '#/';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

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

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.goals)) return parsed.goals;
      }
    } catch {
      // ignore
    }
    return buildDefaultGoals(MOCK_SCENARIOS[0]);
  });

  const [budgets, setBudgets] = useState<BudgetAllocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.budgets)) return parsed.budgets;
      }
    } catch {
      // ignore
    }
    return buildDefaultBudgets(MOCK_SCENARIOS[0]);
  });

  const [cashEntries, setCashEntries] = useState<CashFlowEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.cashEntries)) return parsed.cashEntries;
      }
    } catch {
      // ignore
    }
    return buildDefaultCashEntries(MOCK_SCENARIOS[0]);
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [tabDirection, setTabDirection] = useState<number>(1);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleChangeTab = (nextTab: AppTab) => {
    if (nextTab === activeTab) return;
    const prevIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(nextTab);
    setTabDirection(nextIdx >= prevIdx ? 1 : -1);
    setActiveTab(nextTab);
  };

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
          goals,
          budgets,
          cashEntries,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }, [orders, cifItems, cifConfig, companyParams, goals, budgets, cashEntries]);

  // Load a predefined scenario
  const handleSelectScenario = (scenario: PredefinedScenario) => {
    setCurrentScenario(scenario);
    setOrders(scenario.orders);
    setCifItems(scenario.cifItems);
    setCifConfig(scenario.cifConfig);
    setCompanyParams(scenario.companyParams);
    setGoals(buildDefaultGoals(scenario));
    setBudgets(buildDefaultBudgets(scenario));
    setCashEntries(buildDefaultCashEntries(scenario));
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

  // Derived operational cashflow entries synced from OPs, MOD, CIF, and expenses
  const derivedCashEntries = useMemo<CashFlowEntry[]>(() => {
    const list: CashFlowEntry[] = [];

    orders.forEach((op) => {
      const s = cifAnalysis.summaries[op.id];
      if (!s) return;
      if (op.status === 'faturada' && s.revenue > 0) {
        list.push({
          id: `auto-rev-${op.id}`,
          type: 'entrada',
          date: op.completedDate || op.targetDate,
          description: `Recebimento Faturamento · ${op.clientName}`,
          category: 'Faturamento de OPs',
          amount: s.revenue,
          status: 'realizado',
          paymentMethod: 'Transferência TED',
          linkedOrderCode: op.code,
        });
      } else if (op.status === 'encerrada' && s.revenue > 0) {
        list.push({
          id: `auto-prev-rev-${op.id}`,
          type: 'entrada',
          date: op.targetDate,
          description: `Previsão de Faturamento · ${op.clientName}`,
          category: 'Faturamento de OPs',
          amount: s.revenue,
          status: 'previsto',
          paymentMethod: 'Boleto',
          linkedOrderCode: op.code,
        });
      }
    });

    if (totalMODConsumed > 0) {
      list.push({
        id: 'auto-mod-folha',
        type: 'saida',
        date: orders[0]?.targetDate || '2026-03-28',
        description: 'Folha de Pagamento & Encargos (MOD Apontada)',
        category: 'Folha & Encargos (MOD)',
        amount: totalMODConsumed,
        status: 'realizado',
        paymentMethod: 'Transferência TED',
      });
    }

    cifItems.forEach((cif) => {
      list.push({
        id: `auto-cif-${cif.id}`,
        type: 'saida',
        date: cif.date,
        description: `${cif.code} · ${cif.description}`,
        category: 'Custos Indiretos (CIF)',
        amount: cif.amount,
        status: 'realizado',
        paymentMethod: 'Débito Automático',
      });
    });

    if (companyParams.commercialExpenses + companyParams.administrativeExpenses > 0) {
      list.push({
        id: 'auto-opex',
        type: 'saida',
        date: orders[0]?.targetDate || '2026-03-30',
        description: 'Despesas Comerciais e Administrativas do Período',
        category: 'Despesas Administrativas',
        amount: companyParams.commercialExpenses + companyParams.administrativeExpenses,
        status: 'realizado',
        paymentMethod: 'PIX',
      });
    }

    return list;
  }, [orders, cifAnalysis.summaries, totalMODConsumed, cifItems, companyParams]);

  const cashNetRealized = useMemo(() => {
    return [...derivedCashEntries, ...cashEntries].reduce((acc, item) => {
      if (item.status !== 'realizado') return acc;
      return item.type === 'entrada' ? acc + item.amount : acc - item.amount;
    }, 0);
  }, [derivedCashEntries, cashEntries]);

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

  const handleLoginSuccess = (user: AuthUser, remember: boolean) => {
    setAuthUser(user);
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(AUTH_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    if (pendingScenario) {
      handleSelectScenario(pendingScenario);
      setPendingScenario(null);
    }
    navigateTo('dashboard');
  };

  const handleLogout = () => {
    setAuthUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
    navigateTo('landing');
  };

  const windowVariants = {
    enter: (direction: number) =>
      shouldReduceMotion
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: direction > 0 ? 18 : -18,
            scale: 0.985,
            filter: 'blur(6px)',
          },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: shouldReduceMotion
        ? { duration: 0.01 }
        : {
            duration: 0.28,
            ease: [0.16, 1, 0.3, 1] as const,
          },
    },
    exit: (direction: number) =>
      shouldReduceMotion
        ? { opacity: 0 }
        : {
            opacity: 0,
            y: direction > 0 ? -12 : 12,
            scale: 0.988,
            filter: 'blur(4px)',
            transition: {
              duration: 0.16,
              ease: [0.4, 0, 1, 1] as const,
            },
          },
  };

  const viewTransition = shouldReduceMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {currentView === 'landing' && (
        <motion.div
          key="view-landing"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.988, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01, filter: 'blur(6px)' }}
          transition={viewTransition}
        >
          <LandingPage
            theme={theme}
            onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
            isAuthenticated={Boolean(authUser)}
            onNavigateToLogin={(scenario) => {
              if (scenario) setPendingScenario(scenario);
              navigateTo('login');
            }}
            onNavigateToDashboard={(scenario) => {
              if (scenario) handleSelectScenario(scenario);
              navigateTo('dashboard');
            }}
            onOpenTheory={() => setIsTheoryModalOpen(true)}
          />
          <TheoryGuideModal
            isOpen={isTheoryModalOpen}
            onClose={() => setIsTheoryModalOpen(false)}
          />
        </motion.div>
      )}

      {currentView === 'login' && (
        <motion.div
          key="view-login"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015, y: -10, filter: 'blur(6px)' }}
          transition={viewTransition}
        >
          <LoginPage
            theme={theme}
            onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
            pendingScenario={pendingScenario}
            onBackToSite={() => navigateTo('landing')}
            onLoginSuccess={handleLoginSuccess}
          />
        </motion.div>
      )}

      {currentView === 'dashboard' && (
        <motion.div
          key="view-dashboard"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.988, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, filter: 'blur(6px)' }}
          transition={viewTransition}
          className="min-h-screen flex bg-transparent text-slate-900 dark:text-[#F5F5F7] relative overflow-x-clip"
        >
      <NocturnalBackdrop />

      {/* Left Glass Side Panel Navigation */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={handleChangeTab}
        theme={theme}
        onChangeTheme={setTheme}
        onOpenTheory={() => setIsTheoryModalOpen(true)}
        onResetCurrent={() => {
          setPendingConfirm({
            title: `Reiniciar ${currentScenario.name}?`,
            description:
              'Todas as alterações locais de ordens, apontamentos e rateios serão restauradas aos valores originais deste cenário.',
            confirmLabel: 'Reiniciar Cenário',
            onConfirm: () => handleSelectScenario(currentScenario),
          });
        }}
        onOpenNewOrder={() => {
          setOrderToEdit(null);
          setIsNewOrderModalOpen(true);
        }}
        onNavigateLanding={() => navigateTo('landing')}
        onLogout={handleLogout}
        userEmail={authUser?.email}
        ordersCount={orders.length}
        cifCount={cifItems.length}
        tAccountsCount={tAccounts.length}
        goalsCount={goals.length}
        cashEntriesCount={cashEntries.length + derivedCashEntries.length}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Right Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 space-y-5 max-w-[1440px] w-full mx-auto print:hidden">
          {/* Compact Workspace Context & Mobile Menu Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden dash-glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                aria-label="Abrir painel lateral de navegação"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>

              <ScenarioSelectorDropdown
                scenarios={MOCK_SCENARIOS}
                currentScenario={currentScenario}
                onSelectScenario={handleSelectScenario}
              />

              <span className="text-slate-500 dark:text-zinc-400 hidden sm:inline">
                {companyParams.companyName} · {companyParams.periodName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mobile/Quick Dark Mode Switch (desktop also has it in Sidebar) */}
              <div className="lg:hidden dash-glass-pill rounded-full px-3 py-1 flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-white" />
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label="Alternar entre modo claro e escuro"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus:outline-none ${
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

              <button
                type="button"
                onClick={() => navigateTo('landing')}
                className="dash-glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Ir para a página principal do site"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Site</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="dash-glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title={authUser ? `Encerrar sessão de ${authUser.email}` : 'Sair do painel'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Full-Width CIF Banner + 4-Column KPI Row */}
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
            onJumpToCIF={() => handleChangeTab('cif')}
          />

          {/* Active Workspace Section with Directional Window Switch Animation */}
          <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
            <motion.div
              key={activeTab}
              custom={tabDirection}
              variants={windowVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="will-change-transform"
            >
              {activeTab === 'overview' && (
                <Dashboard3DChartsView
                  theme={theme}
                  scenarioName={currentScenario.name}
                  companyParams={companyParams}
                  orders={orders}
                  summaries={cifAnalysis.summaries}
                  cifItems={cifItems}
                  cifConfig={cifConfig}
                  totalActualCIF={cifAnalysis.totalActualCIF}
                  totalAppliedCIF={cifAnalysis.totalAppliedCIF}
                  totalMD={totalMDConsumed}
                  totalMOD={totalMODConsumed}
                  totalManufacturingCost={totalManufacturingCost}
                  inventoryBalances={inventoryBalances}
                  dre={dre}
                  onOpenCostSheet={(op) => setSelectedCostSheetOrder(op)}
                  onNavigateTab={handleChangeTab}
                />
              )}

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

          {activeTab === 'ir' && (
            <CorporateIRSimulatorView
              companyParams={companyParams}
              scenarioName={currentScenario.name}
              dre={dre}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsAndBudgetsView
              companyParams={companyParams}
              scenarioName={currentScenario.name}
              goals={goals}
              budgets={budgets}
              totalMD={totalMDConsumed}
              totalMOD={totalMODConsumed}
              totalActualCIF={cifAnalysis.totalActualCIF}
              cashNetRealized={cashNetRealized}
              dre={dre}
              onAddGoal={(goal) =>
                setGoals((prev) => [...prev, { id: `goal-${Date.now()}`, ...goal }])
              }
              onDeleteGoal={(id) =>
                setGoals((prev) => prev.filter((g) => g.id !== id))
              }
              onAddBudget={(budget) =>
                setBudgets((prev) => [...prev, { id: `bud-${Date.now()}`, ...budget }])
              }
              onUpdateBudgetAmount={(id, plannedAmount) =>
                setBudgets((prev) =>
                  prev.map((b) => (b.id === id ? { ...b, plannedAmount } : b))
                )
              }
              onDeleteBudget={(id) =>
                setBudgets((prev) => prev.filter((b) => b.id !== id))
              }
              onResetDefaults={() => {
                setGoals(buildDefaultGoals(currentScenario));
                setBudgets(buildDefaultBudgets(currentScenario));
              }}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowEntriesView
              companyParams={companyParams}
              scenarioName={currentScenario.name}
              entries={cashEntries}
              derivedEntries={derivedCashEntries}
              onAddEntry={(entry) =>
                setCashEntries((prev) => [{ id: `cf-${Date.now()}`, ...entry }, ...prev])
              }
              onToggleEntryStatus={(id) =>
                setCashEntries((prev) =>
                  prev.map((e) =>
                    e.id === id
                      ? { ...e, status: e.status === 'realizado' ? 'previsto' : 'realizado' }
                      : e
                  )
                )
              }
              onDeleteEntry={(id) =>
                setCashEntries((prev) => prev.filter((e) => e.id !== id))
              }
              onResetDefaults={() => setCashEntries(buildDefaultCashEntries(currentScenario))}
            />
          )}

          {activeTab === 'export' && (
            <FullPdfExportView
              companyParams={companyParams}
              scenarioName={currentScenario.name}
              cifConfig={cifConfig}
              cifItems={cifItems}
              effectiveCIFRate={cifAnalysis.effectiveCIFRate}
              totalAllocationBase={cifAnalysis.totalAllocationBase}
              totalActualCIF={cifAnalysis.totalActualCIF}
              totalAppliedCIF={cifAnalysis.totalAppliedCIF}
              cifVariance={cifAnalysis.cifVariance}
              totalManufacturingCost={totalManufacturingCost}
              totalMD={totalMDConsumed}
              totalMOD={totalMODConsumed}
              inventoryBalances={inventoryBalances}
              dre={dre}
              orders={orders}
              summaries={cifAnalysis.summaries}
              tAccounts={tAccounts}
            />
          )}
            </motion.div>
          </AnimatePresence>
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
      </div>

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

      <AnimatePresence>
        {selectedAddCostOrder && (
          <AddCostEntryModal
            key={selectedAddCostOrder.id}
            order={selectedAddCostOrder}
            onClose={() => setSelectedAddCostOrder(null)}
            onAddMaterial={handleAddMaterial}
            onAddLabor={handleAddLabor}
            onUpdateMachineHours={handleUpdateMachineHours}
          />
        )}
      </AnimatePresence>

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
      <AnimatePresence>
        {pendingConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.18 }}
            className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            onClick={() => setPendingConfirm(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94, y: 12, filter: 'blur(6px)' }
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
                  : { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }
              }
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
