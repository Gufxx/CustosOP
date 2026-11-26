import {
  ProductionOrder,
  IndirectCostItem,
  CIFConfiguration,
  CompanyParameters,
  OrderCostSummary,
  TAccount,
  AllocationBase,
} from '../types/costing';

/**
 * Formata valores numéricos para o padrão de moeda brasileiro (BRL)
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/**
 * Formata números com precisão decimal configurada
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

/**
 * Retorna o rótulo legível da base de rateio
 */
export function getAllocationBaseLabel(base: AllocationBase): string {
  switch (base) {
    case 'horas_mod':
      return 'Horas de Mão de Obra Direta (h MOD)';
    case 'custo_mod':
      return 'Valor da Mão de Obra Direta (R$ MOD)';
    case 'material_direto':
      return 'Valor do Material Direto (R$ MD)';
    case 'custo_primario':
      return 'Custo Primário (MD + MOD)';
    case 'horas_maquina':
      return 'Horas-Máquina (h Máq)';
    case 'unidades':
      return 'Quantidade Produzida (Unidades)';
    default:
      return base;
  }
}

export function getAllocationBaseUnit(base: AllocationBase): string {
  switch (base) {
    case 'horas_mod':
      return 'h';
    case 'custo_mod':
      return 'R$';
    case 'material_direto':
      return 'R$';
    case 'custo_primario':
      return 'R$';
    case 'horas_maquina':
      return 'h';
    case 'unidades':
      return 'un';
    default:
      return '';
  }
}

/**
 * Calcula os custos diretos (MD e MOD) de uma ordem de produção
 */
export function calculateOrderDirectCosts(order: ProductionOrder) {
  const totalMD = (order.materials || []).reduce((acc, m) => acc + (m.totalCost || 0), 0);
  const totalMOD = (order.labor || []).reduce((acc, l) => acc + (l.totalCost || 0), 0);
  const totalMODHours = (order.labor || []).reduce((acc, l) => acc + (l.hours || 0), 0);
  const costPrimario = totalMD + totalMOD;

  return {
    totalMD,
    totalMOD,
    totalMODHours,
    costPrimario,
    machineHours: order.machineHours || 0,
  };
}

/**
 * Retorna o valor da base de rateio para uma ordem específica
 */
export function getOrderBaseValue(order: ProductionOrder, base: AllocationBase): number {
  const direct = calculateOrderDirectCosts(order);
  switch (base) {
    case 'horas_mod':
      return direct.totalMODHours;
    case 'custo_mod':
      return direct.totalMOD;
    case 'material_direto':
      return direct.totalMD;
    case 'custo_primario':
      return direct.costPrimario;
    case 'horas_maquina':
      return direct.machineHours;
    case 'unidades':
      return order.quantity || 0;
    default:
      return 0;
  }
}

/**
 * Realiza a apropriação dos Custos Indiretos de Fabricação (CIF)
 * e compila o sumário completo de custos de cada Ordem de Produção
 */
export function calculateAllOrdersCosts(
  orders: ProductionOrder[],
  cifItems: IndirectCostItem[],
  cifConfig: CIFConfiguration
) {
  const totalActualCIF = cifItems.reduce((acc, item) => acc + (item.amount || 0), 0);

  // Calcula o total da base de rateio somando todas as OPs do período
  const totalAllocationBase = orders.reduce((acc, op) => {
    return acc + getOrderBaseValue(op, cifConfig.allocationBase);
  }, 0);

  // Determina a taxa de aplicação de CIF (R$ por unidade de base)
  let effectiveCIFRate = 0;
  if (cifConfig.method === 'taxa_real') {
    effectiveCIFRate = totalAllocationBase > 0 ? totalActualCIF / totalAllocationBase : 0;
  } else {
    effectiveCIFRate = cifConfig.predeterminedRate || 0;
  }

  let totalAppliedCIF = 0;

  const summaries: Record<string, OrderCostSummary> = {};

  orders.forEach((op) => {
    const direct = calculateOrderDirectCosts(op);
    const orderBaseValue = getOrderBaseValue(op, cifConfig.allocationBase);
    
    // CIF Apropriado = Base da OP * Taxa de CIF
    const cifAllocated = orderBaseValue * effectiveCIFRate;
    totalAppliedCIF += cifAllocated;

    const costTransformacao = direct.totalMOD + cifAllocated;
    const totalManufacturingCost = direct.totalMD + direct.totalMOD + cifAllocated;
    const unitCost = op.quantity > 0 ? totalManufacturingCost / op.quantity : 0;

    // Faturamento e DRE da Ordem
    const unitPrice = op.sellingPriceUnit || 0;
    const revenue = unitPrice * op.quantity;
    const taxPercent = op.taxRatePercent ?? 12;
    const taxes = (revenue * taxPercent) / 100;
    const netRevenue = revenue - taxes;
    const cpv = op.status === 'faturada' ? totalManufacturingCost : 0;
    const grossProfit = op.status === 'faturada' ? netRevenue - cpv : 0;
    const grossMarginPercent = revenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    summaries[op.id] = {
      orderId: op.id,
      code: op.code,
      totalMD: direct.totalMD,
      totalMOD: direct.totalMOD,
      totalMODHours: direct.totalMODHours,
      machineHours: direct.machineHours,
      costPrimario: direct.costPrimario,
      cifAllocated,
      costTransformacao,
      totalManufacturingCost,
      unitCost,
      revenue,
      taxes,
      netRevenue,
      cpv,
      grossProfit,
      grossMarginPercent,
    };
  });

  // Variação de CIF (quando se usa taxa pré-determinada)
  // Subaplicação = Real > Aplicado (Prejuízo ou custo adicional)
  // Sobreaplicação = Aplicado > Real (Custo em excesso apropriado)
  const cifVariance = totalActualCIF - totalAppliedCIF;
  const isSubapplied = cifVariance > 0.001;
  const isOverapplied = cifVariance < -0.001;

  return {
    totalActualCIF,
    totalAllocationBase,
    effectiveCIFRate,
    totalAppliedCIF,
    cifVariance,
    isSubapplied,
    isOverapplied,
    summaries,
  };
}

export type OrderCostMonitoringLevel = 'exceeded' | 'warning' | 'healthy' | 'unpriced';

export interface OrderCostMonitoring {
  level: OrderCostMonitoringLevel;
  hasStipulatedPrice: boolean;
  stipulatedUnitPrice: number;
  stipulatedTotalPrice: number;
  accumulatedCost: number;
  accumulatedUnitCost: number;
  consumptionPercent: number;
  excessAmount: number;
  remainingAmount: number;
}

/**
 * Avalia o monitoramento entre custo fabril acumulado e preço de venda estipulado
 */
export function getOrderCostMonitoring(
  order: ProductionOrder,
  summary?: OrderCostSummary
): OrderCostMonitoring {
  const stipulatedUnitPrice = order.sellingPriceUnit || 0;
  const hasStipulatedPrice = stipulatedUnitPrice > 0;
  const stipulatedTotalPrice = hasStipulatedPrice ? stipulatedUnitPrice * (order.quantity || 0) : 0;
  const accumulatedCost = summary?.totalManufacturingCost || 0;
  const accumulatedUnitCost = summary?.unitCost || 0;

  if (!hasStipulatedPrice || stipulatedTotalPrice <= 0) {
    return {
      level: 'unpriced',
      hasStipulatedPrice: false,
      stipulatedUnitPrice: 0,
      stipulatedTotalPrice: 0,
      accumulatedCost,
      accumulatedUnitCost,
      consumptionPercent: 0,
      excessAmount: 0,
      remainingAmount: 0,
    };
  }

  const consumptionPercent = (accumulatedCost / stipulatedTotalPrice) * 100;
  const excessAmount = Math.max(0, accumulatedCost - stipulatedTotalPrice);
  const remainingAmount = stipulatedTotalPrice - accumulatedCost;

  let level: OrderCostMonitoringLevel = 'healthy';
  if (accumulatedCost > stipulatedTotalPrice + 0.005) {
    level = 'exceeded';
  } else if (consumptionPercent >= 85) {
    level = 'warning';
  }

  return {
    level,
    hasStipulatedPrice: true,
    stipulatedUnitPrice,
    stipulatedTotalPrice,
    accumulatedCost,
    accumulatedUnitCost,
    consumptionPercent,
    excessAmount,
    remainingAmount,
  };
}

/**
 * Calcula a posição dos estoques patrimoniais fabris
 */
export function calculateInventoryBalances(
  orders: ProductionOrder[],
  summaries: Record<string, OrderCostSummary>,
  companyParams: CompanyParameters,
  totalMDConsumed: number
) {
  // 1. Estoque de Matéria-Prima
  const finalRawMaterials = companyParams.initialRawMaterials - totalMDConsumed;

  // 2. Produtos em Elaboração (PeE): OPs que estão com status 'em_elaboracao'
  const wipOrders = orders.filter((o) => o.status === 'em_elaboracao');
  const finalWIP = wipOrders.reduce((acc, o) => acc + (summaries[o.id]?.totalManufacturingCost || 0), 0);

  // 3. Produtos Acabados (PA): OPs concluídas mas ainda não faturadas
  const finishedGoodsOrders = orders.filter((o) => o.status === 'encerrada');
  const finalFinishedGoods = finishedGoodsOrders.reduce(
    (acc, o) => acc + (summaries[o.id]?.totalManufacturingCost || 0),
    0
  );

  // 4. CPV: OPs que já foram faturadas e entregues aos clientes
  const invoicedOrders = orders.filter((o) => o.status === 'faturada');
  const baseCPV = invoicedOrders.reduce((acc, o) => acc + (summaries[o.id]?.totalManufacturingCost || 0), 0);

  return {
    finalRawMaterials,
    finalWIP,
    finalFinishedGoods,
    baseCPV,
    wipOrdersCount: wipOrders.length,
    finishedOrdersCount: finishedGoodsOrders.length,
    invoicedOrdersCount: invoicedOrders.length,
  };
}

/**
 * Gera a DRE consolidada do período contábil
 */
export function generateConsolidatedDRE(
  orders: ProductionOrder[],
  summaries: Record<string, OrderCostSummary>,
  cifVariance: number,
  companyParams: CompanyParameters
) {
  const invoicedOrders = orders.filter((o) => o.status === 'faturada');

  const grossRevenue = invoicedOrders.reduce((acc, o) => acc + (summaries[o.id]?.revenue || 0), 0);
  const salesTaxes = invoicedOrders.reduce((acc, o) => acc + (summaries[o.id]?.taxes || 0), 0);
  const netRevenue = grossRevenue - salesTaxes;

  const baseCPV = invoicedOrders.reduce((acc, o) => acc + (summaries[o.id]?.cpv || 0), 0);

  // Ajuste de variação de CIF no CPV (critério padrão de contabilidade gerencial/fiscal de encerramento no CPV)
  const adjustedCPV = baseCPV + cifVariance;
  const grossProfit = netRevenue - adjustedCPV;
  const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const totalOperatingExpenses =
    (companyParams.commercialExpenses || 0) + (companyParams.administrativeExpenses || 0);

  const operatingProfit = grossProfit - totalOperatingExpenses;
  const operatingMarginPercent = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0;

  return {
    grossRevenue,
    salesTaxes,
    netRevenue,
    baseCPV,
    cifVariance,
    adjustedCPV,
    grossProfit,
    grossMarginPercent,
    commercialExpenses: companyParams.commercialExpenses || 0,
    administrativeExpenses: companyParams.administrativeExpenses || 0,
    totalOperatingExpenses,
    operatingProfit,
    operatingMarginPercent,
    invoicedCount: invoicedOrders.length,
  };
}

/**
 * Constrói os Razonetes Contábeis em T
 * Espelha fielmente a mecânica de débitos e créditos da contabilidade de custos
 */
export function generateTAccounts(
  orders: ProductionOrder[],
  cifItems: IndirectCostItem[],
  summaries: Record<string, OrderCostSummary>,
  companyParams: CompanyParameters,
  cifAnalysis: ReturnType<typeof calculateAllOrdersCosts>,
  dre: ReturnType<typeof generateConsolidatedDRE>
): TAccount[] {
  // 1. Almoxarifado de Matérias-Primas (Ativo)
  const rawMatDebits = [
    {
      id: 'rm-si',
      label: 'Saldo Inicial (SI)',
      amount: companyParams.initialRawMaterials,
    },
  ];
  const rawMatCredits = orders.flatMap((op) =>
    (op.materials || []).map((m) => ({
      id: `rm-m-${m.id}`,
      label: `Req. ${m.reqNumber} (${op.code})`,
      amount: m.totalCost,
      opCode: op.code,
    }))
  );

  // 2. Salários e Encargos a Pagar / Mão de Obra Direta
  const totalMODCost = orders.reduce((acc, op) => acc + (summaries[op.id]?.totalMOD || 0), 0);
  const laborCredits = [
    {
      id: 'mod-folha',
      label: 'Folha de Pagamento MOD apurada no período',
      amount: totalMODCost,
    },
  ];
  const laborDebits = orders.flatMap((op) =>
    (op.labor || []).map((l) => ({
      id: `mod-l-${l.id}`,
      label: `Apont. ${l.workerName} (${op.code})`,
      amount: l.totalCost,
      opCode: op.code,
    }))
  );

  // 3. Controle de Custos Indiretos de Fabricação (CIF)
  const cifDebits = cifItems.map((item) => ({
    id: `cif-d-${item.id}`,
    label: `${item.description}`,
    amount: item.amount,
  }));
  const cifCredits = orders.map((op) => ({
    id: `cif-c-${op.id}`,
    label: `Apropriação CIF -> ${op.code}`,
    amount: summaries[op.id]?.cifAllocated || 0,
    opCode: op.code,
  }));
  if (Math.abs(cifAnalysis.cifVariance) > 0.01) {
    if (cifAnalysis.isSubapplied) {
      cifCredits.push({
        id: 'cif-var-sub',
        label: 'Ajuste de Subaplicação -> CPV',
        amount: cifAnalysis.cifVariance,
        opCode: 'Ajuste',
      });
    } else {
      cifDebits.push({
        id: 'cif-var-over',
        label: 'Ajuste de Sobreaplicação -> CPV',
        amount: Math.abs(cifAnalysis.cifVariance),
      });
    }
  }

  // 4. Estoque de Produtos em Elaboração (PeE)
  const wipDebits = [
    ...(companyParams.initialWIP > 0
      ? [{ id: 'wip-si', label: 'Saldo Inicial (SI)', amount: companyParams.initialWIP }]
      : []),
    ...orders.flatMap((op) => [
      {
        id: `wip-md-${op.id}`,
        label: `MD aplicado ${op.code}`,
        amount: summaries[op.id]?.totalMD || 0,
        opCode: op.code,
      },
      {
        id: `wip-mod-${op.id}`,
        label: `MOD apropriada ${op.code}`,
        amount: summaries[op.id]?.totalMOD || 0,
        opCode: op.code,
      },
      {
        id: `wip-cif-${op.id}`,
        label: `CIF rateado ${op.code}`,
        amount: summaries[op.id]?.cifAllocated || 0,
        opCode: op.code,
      },
    ]),
  ];

  // Transferência das OPs encerradas ou faturadas para Produtos Acabados (PA)
  const finishedOrInvoicedOrders = orders.filter((op) => op.status === 'encerrada' || op.status === 'faturada');
  const wipCredits = finishedOrInvoicedOrders.map((op) => ({
    id: `wip-transf-pa-${op.id}`,
    label: `Conclusão e transf. p/ PA (${op.code})`,
    amount: summaries[op.id]?.totalManufacturingCost || 0,
    opCode: op.code,
  }));

  // 5. Estoque de Produtos Acabados (PA)
  const paDebits = [
    ...(companyParams.initialFinishedGoods > 0
      ? [{ id: 'pa-si', label: 'Saldo Inicial (SI)', amount: companyParams.initialFinishedGoods }]
      : []),
    ...finishedOrInvoicedOrders.map((op) => ({
      id: `pa-d-wip-${op.id}`,
      label: `Entrada da OP concluída ${op.code}`,
      amount: summaries[op.id]?.totalManufacturingCost || 0,
      opCode: op.code,
    })),
  ];

  // Baixa das OPs faturadas para CPV
  const invoicedOrders = orders.filter((op) => op.status === 'faturada');
  const paCredits = invoicedOrders.map((op) => ({
    id: `pa-c-cpv-${op.id}`,
    label: `Baixa p/ entrega ao cliente (${op.code})`,
    amount: summaries[op.id]?.totalManufacturingCost || 0,
    opCode: op.code,
  }));

  // 6. Custo dos Produtos Vendidos (CPV)
  const cpvDebits = [
    ...invoicedOrders.map((op) => ({
      id: `cpv-d-${op.id}`,
      label: `Custo Fabril ${op.code}`,
      amount: summaries[op.id]?.totalManufacturingCost || 0,
      opCode: op.code,
    })),
    ...(Math.abs(cifAnalysis.cifVariance) > 0.01 && cifAnalysis.isSubapplied
      ? [
          {
            id: 'cpv-d-var-sub',
            label: 'Variação CIF (Subaplicação)',
            amount: cifAnalysis.cifVariance,
          },
        ]
      : []),
  ];
  const cpvCredits = [
    ...(Math.abs(cifAnalysis.cifVariance) > 0.01 && cifAnalysis.isOverapplied
      ? [
          {
            id: 'cpv-c-var-over',
            label: 'Variação CIF (Sobreaplicação)',
            amount: Math.abs(cifAnalysis.cifVariance),
          },
        ]
      : []),
    ...(dre.adjustedCPV > 0
      ? [
          {
            id: 'cpv-c-are',
            label: 'Encerramento para ARE',
            amount: dre.adjustedCPV,
          },
        ]
      : []),
  ];

  // 7. Receita Bruta de Vendas
  const salesCredits = invoicedOrders.map((op) => ({
    id: `sales-c-${op.id}`,
    label: `Faturamento ${op.code}`,
    amount: summaries[op.id]?.revenue || 0,
    opCode: op.code,
  }));
  const salesDebits = [
    ...(dre.grossRevenue > 0
      ? [
          {
            id: 'sales-d-are',
            label: 'Encerramento para ARE',
            amount: dre.grossRevenue,
          },
        ]
      : []),
  ];

  // 8. Apuração do Resultado do Exercício (ARE)
  const areCredits = [
    ...(dre.grossRevenue > 0
      ? [
          {
            id: 'are-c-rev',
            label: 'Receita Bruta transferida',
            amount: dre.grossRevenue,
          },
        ]
      : []),
  ];
  const areDebits = [
    ...(dre.salesTaxes > 0
      ? [{ id: 'are-d-taxes', label: 'Tributos sobre Vendas', amount: dre.salesTaxes }]
      : []),
    ...(dre.adjustedCPV > 0
      ? [{ id: 'are-d-cpv', label: 'CPV do período', amount: dre.adjustedCPV }]
      : []),
    ...(dre.totalOperatingExpenses > 0
      ? [
          {
            id: 'are-d-exp',
            label: 'Despesas Adm. e Comerciais',
            amount: dre.totalOperatingExpenses,
          },
        ]
      : []),
  ];

  return [
    {
      code: '1.1.04',
      title: 'Almoxarifado de Matérias-Primas',
      category: 'ativo_circulante',
      initialBalance: companyParams.initialRawMaterials,
      debits: rawMatDebits,
      credits: rawMatCredits,
    },
    {
      code: '2.1.03',
      title: 'Salários e Encargos a Pagar (MOD)',
      category: 'passivo_circulante',
      initialBalance: 0,
      debits: laborDebits,
      credits: laborCredits,
    },
    {
      code: '5.1.02',
      title: 'Controle de Custos Indiretos (CIF)',
      category: 'custos_producao',
      initialBalance: 0,
      debits: cifDebits,
      credits: cifCredits,
    },
    {
      code: '1.1.05',
      title: 'Estoque de Produtos em Elaboração (PeE)',
      category: 'ativo_circulante',
      initialBalance: companyParams.initialWIP,
      debits: wipDebits,
      credits: wipCredits,
    },
    {
      code: '1.1.06',
      title: 'Estoque de Produtos Acabados (PA)',
      category: 'ativo_circulante',
      initialBalance: companyParams.initialFinishedGoods,
      debits: paDebits,
      credits: paCredits,
    },
    {
      code: '4.1.01',
      title: 'Custo dos Produtos Vendidos (CPV)',
      category: 'resultado',
      initialBalance: 0,
      debits: cpvDebits,
      credits: cpvCredits,
    },
    {
      code: '3.1.01',
      title: 'Receita Bruta de Vendas',
      category: 'resultado',
      initialBalance: 0,
      debits: salesDebits,
      credits: salesCredits,
    },
    {
      code: '3.9.01',
      title: 'Apuração do Resultado do Exercício (ARE)',
      category: 'resultado',
      initialBalance: 0,
      debits: areDebits,
      credits: areCredits,
    },
  ];
}
