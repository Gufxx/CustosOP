/**
 * Tipos e Interfaces para o Sistema de Custos por Ordem de Produção (CustosOP)
 * Alinhado com a Teoria Contábil Brasileira (CPC 16 / NBC TG 16)
 */

export type OrderStatus = 'em_elaboracao' | 'encerrada' | 'faturada';

export interface DirectMaterialEntry {
  id: string;
  date: string;
  reqNumber: string; // Número da Requisição de Material (RMA)
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface DirectLaborEntry {
  id: string;
  date: string;
  workerName: string;
  role: string;
  hours: number;
  hourlyRate: number; // Taxa horária com encargos sociais
  totalCost: number;
}

export interface ProductionOrder {
  id: string;
  code: string; // Ex: OP-101
  clientName: string;
  productDescription: string;
  quantity: number;
  unit: string; // un, pç, kit, lote
  startDate: string;
  targetDate: string;
  completedDate?: string;
  status: OrderStatus;
  machineHours: number; // Base alternativa para rateio de CIF
  
  // Apontamentos diretos
  materials: DirectMaterialEntry[];
  labor: DirectLaborEntry[];
  
  // Dados comerciais para ordens encerradas/faturadas
  sellingPriceUnit?: number;
  taxRatePercent?: number; // % impostos sobre vendas (ICMS/PIS/COFINS)
  notes?: string;
}

export type CIFCategory = 
  | 'energia_eletrica'
  | 'depreciacao_maquinas'
  | 'aluguel_fabril'
  | 'manutencao_fabril'
  | 'supervisao_fabrica'
  | 'materiais_indiretos'
  | 'seguro_fabrica'
  | 'outros_cif';

export interface IndirectCostItem {
  id: string;
  code: string;
  description: string;
  category: CIFCategory;
  amount: number;
  date: string;
  documentRef?: string;
}

export type AllocationBase = 
  | 'horas_mod'        // Horas de Mão de Obra Direta
  | 'custo_mod'        // Valor da Mão de Obra Direta (R$)
  | 'material_direto'  // Valor de Material Direto (R$)
  | 'custo_primario'   // MD + MOD (R$)
  | 'horas_maquina'    // Horas de Máquina
  | 'unidades';        // Quantidade física de unidades

export type CIFMethod = 'taxa_real' | 'taxa_predeterminada';

export interface CIFConfiguration {
  method: CIFMethod;
  allocationBase: AllocationBase;
  predeterminedRate: number; // Taxa fixada a priori (R$ por unidade de base)
  budgetedCIF: number;       // CIF orçado
  budgetedBaseUnits: number; // Base orçada (ex: 500h)
}

export interface CompanyParameters {
  companyName: string;
  periodName: string; // Ex: Março/2026
  initialRawMaterials: number; // Saldo Inicial do Estoque de Matéria-Prima
  initialWIP: number;          // Saldo Inicial de Produtos em Elaboração
  initialFinishedGoods: number;// Saldo Inicial de Produtos Acabados
  commercialExpenses: number;  // Despesas com Vendas
  administrativeExpenses: number; // Despesas Administrativas
  standardTaxRate: number;     // % Impostos sobre Venda Padrão (ex: 12%)
}

export interface TAccountMovement {
  id: string;
  date?: string;
  label: string;
  amount: number;
  counterpart?: string;
  opCode?: string;
}

export interface TAccount {
  code: string;
  title: string;
  category: 'ativo_circulante' | 'passivo_circulante' | 'custos_producao' | 'resultado';
  initialBalance: number;
  debits: TAccountMovement[];
  credits: TAccountMovement[];
}

export interface OrderCostSummary {
  orderId: string;
  code: string;
  totalMD: number;
  totalMOD: number;
  totalMODHours: number;
  machineHours: number;
  costPrimario: number;       // MD + MOD
  cifAllocated: number;       // CIF apropriado
  costTransformacao: number;  // MOD + CIF
  totalManufacturingCost: number; // MD + MOD + CIF
  unitCost: number;           // Total / Quantidade
  
  // Vendas
  revenue: number;
  taxes: number;
  netRevenue: number;
  cpv: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export type GoalMetricType =
  | 'receita_bruta'
  | 'lucro_operacional'
  | 'margem_bruta'
  | 'saldo_caixa'
  | 'ordens_faturadas'
  | 'personalizado';

export interface FinancialGoal {
  id: string;
  title: string;
  category: string;
  metricType: GoalMetricType;
  targetValue: number;
  manualCurrentValue?: number;
  unit: 'brl' | 'percent' | 'count';
  deadline: string;
}

export type BudgetSourceKey =
  | 'md'
  | 'mod'
  | 'cif'
  | 'comercial'
  | 'administrativa'
  | 'personalizado';

export interface BudgetAllocation {
  id: string;
  title: string;
  sourceKey: BudgetSourceKey;
  plannedAmount: number;
  manualActualAmount?: number;
  periodLabel: string;
}

export type CashFlowPaymentMethod =
  | 'PIX'
  | 'Boleto'
  | 'Transferência TED'
  | 'Cartão Corporativo'
  | 'Débito Automático';

export interface CashFlowEntry {
  id: string;
  type: 'entrada' | 'saida';
  date: string;
  description: string;
  category: string;
  amount: number;
  status: 'realizado' | 'previsto';
  paymentMethod: CashFlowPaymentMethod;
  linkedOrderCode?: string;
}

