import { jsPDF } from 'jspdf';
import {
  ProductionOrder,
  OrderCostSummary,
  CIFConfiguration,
  CompanyParameters,
  IndirectCostItem,
  CIFCategory,
  TAccount,
} from '../types/costing';
import {
  formatBRL,
  formatNumber,
  getAllocationBaseLabel,
  getAllocationBaseUnit,
  getOrderCostMonitoring,
} from './costCalculations';

const STATUS_LABEL: Record<ProductionOrder['status'], string> = {
  em_elaboracao: 'Em Elaboracao (PeE)',
  encerrada: 'Concluida / Estoque (PA)',
  faturada: 'Faturada / Entregue (CPV)',
};

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u00d7/g, 'x');
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportJobCostSheetPDF(params: {
  order: ProductionOrder;
  summary: OrderCostSummary;
  cifConfig: CIFConfiguration;
  effectiveCIFRate: number;
  companyParams: CompanyParameters;
}) {
  const { order, summary, cifConfig, effectiveCIFRate, companyParams } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 16;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(companyParams.companyName.toUpperCase()), margin, y);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENTO CONTABIL', pageWidth - margin, y - 3, { align: 'right' });
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(`FICHA DE CUSTO N. ${order.code}`), pageWidth - margin, y + 2, {
    align: 'right',
  });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Departamento de Contabilidade de Custos & Controladoria Fabril', margin, y);
  doc.text(sanitizePdfText(`Periodo: ${companyParams.periodName}`), pageWidth - margin, y + 2, {
    align: 'right',
  });

  y += 5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Order Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  const colW = contentWidth / 4;
  const metaItems = [
    { label: 'Cliente / Encomendante', value: order.clientName },
    { label: 'Status Contabil', value: STATUS_LABEL[order.status] },
    { label: 'Quantidade do Lote', value: `${order.quantity} ${order.unit}` },
    { label: 'Datas (Inicio / Entrega)', value: `${order.startDate} a ${order.targetDate}` },
  ];

  metaItems.forEach((item, idx) => {
    const x = margin + 3 + idx * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(item.value), x, y + 10, { maxWidth: colW - 5 });
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 14, pageWidth - margin - 3, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Descricao e Especificacao Tecnica do Produto', margin + 3, y + 18.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(order.productDescription), margin + 3, y + 23, {
    maxWidth: contentWidth - 6,
  });

  y += 33;

  // Section 1: Materiais Diretos (MD)
  ensureSpace(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. MATERIAIS DIRETOS REQUISITADOS (MD)', margin, y);
  doc.text(`Subtotal MD: ${formatBRL(summary.totalMD)}`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // MD Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Data', margin + 2, y + 4.3);
  doc.text('N. RMA', margin + 23, y + 4.3);
  doc.text('Codigo', margin + 43, y + 4.3);
  doc.text('Descricao do Material', margin + 65, y + 4.3);
  doc.text('Qtde', margin + 131, y + 4.3, { align: 'right' });
  doc.text('Custo Unit.', margin + 156, y + 4.3, { align: 'right' });
  doc.text('Custo Total', pageWidth - margin - 2, y + 4.3, { align: 'right' });
  y += 6.5;

  if (order.materials && order.materials.length > 0) {
    order.materials.forEach((m) => {
      ensureSpace(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(m.date, margin + 2, y + 4.5);
      doc.text(sanitizePdfText(m.reqNumber), margin + 23, y + 4.5);
      doc.text(sanitizePdfText(m.itemCode), margin + 43, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sanitizePdfText(m.description), margin + 65, y + 4.5, { maxWidth: 48 });
      doc.text(`${m.quantity} ${m.unit}`, margin + 131, y + 4.5, { align: 'right' });
      doc.text(formatBRL(m.unitCost), margin + 156, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(m.totalCost), pageWidth - margin - 2, y + 4.5, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 6.5;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum material direto requisitado ate o momento.', margin + 2, y + 4.5);
    y += 7;
  }

  y += 6;

  // Section 2: Mao de Obra Direta (MOD)
  ensureSpace(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. MAO DE OBRA DIRETA APONTADA (MOD)', margin, y);
  doc.text(
    `Subtotal MOD: ${formatBRL(summary.totalMOD)} (${summary.totalMODHours} h)`,
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Data', margin + 2, y + 4.3);
  doc.text('Colaborador / Operador', margin + 24, y + 4.3);
  doc.text('Funcao / Especialidade', margin + 74, y + 4.3);
  doc.text('Horas', margin + 125, y + 4.3, { align: 'right' });
  doc.text('Taxa Horaria', margin + 154, y + 4.3, { align: 'right' });
  doc.text('Custo Total', pageWidth - margin - 2, y + 4.3, { align: 'right' });
  y += 6.5;

  if (order.labor && order.labor.length > 0) {
    order.labor.forEach((l) => {
      ensureSpace(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(l.date, margin + 2, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sanitizePdfText(l.workerName), margin + 24, y + 4.5, { maxWidth: 46 });
      doc.text(sanitizePdfText(l.role), margin + 74, y + 4.5, { maxWidth: 38 });
      doc.text(`${l.hours} h`, margin + 125, y + 4.5, { align: 'right' });
      doc.text(`${formatBRL(l.hourlyRate)}/h`, margin + 154, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(l.totalCost), pageWidth - margin - 2, y + 4.5, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 6.5;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum apontamento de mao de obra direta registrado.', margin + 2, y + 4.5);
    y += 7;
  }

  y += 6;

  // Section 3: CIF
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. APROPRIACAO DE CUSTOS INDIRETOS (CIF)', margin, y);
  doc.text(`Subtotal CIF: ${formatBRL(summary.cifAllocated)}`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  const cifCols = contentWidth / 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Base de Rateio Adotada:', margin + 3, y + 5);
  doc.text('Taxa de CIF Aplicada:', margin + 3 + cifCols, y + 5);
  doc.text('Metodo de Custeio:', margin + 3 + cifCols * 2, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(getAllocationBaseLabel(cifConfig.allocationBase)), margin + 3, y + 10.5, {
    maxWidth: cifCols - 5,
  });
  doc.text(
    sanitizePdfText(
      `${formatBRL(effectiveCIFRate)} / ${getAllocationBaseUnit(cifConfig.allocationBase)}`
    ),
    margin + 3 + cifCols,
    y + 10.5
  );
  doc.text(
    cifConfig.method === 'taxa_real' ? 'Taxa Efetiva Real' : 'Taxa Pre-Determinada',
    margin + 3 + cifCols * 2,
    y + 10.5
  );

  y += 22;

  // Section 4: Synthesis
  ensureSpace(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. SINTESE E CUSTO UNITARIO DE FABRICACAO', margin, y);
  y += 4;

  const boxW = (contentWidth - 9) / 4;
  const synthCards = [
    { label: 'Custo Primario (MD+MOD)', value: formatBRL(summary.costPrimario), hi: false },
    { label: 'Transformacao (MOD+CIF)', value: formatBRL(summary.costTransformacao), hi: false },
    { label: 'Custo Fabril Total', value: formatBRL(summary.totalManufacturingCost), hi: true },
    { label: `Custo Unitario (/${order.unit})`, value: formatBRL(summary.unitCost), hi: true },
  ];

  synthCards.forEach((c, idx) => {
    const bx = margin + idx * (boxW + 3);
    doc.setFillColor(c.hi ? 241 : 255, c.hi ? 245 : 255, c.hi ? 249 : 255);
    doc.setDrawColor(c.hi ? 15 : 203, c.hi ? 23 : 213, c.hi ? 42 : 225);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label.toUpperCase(), bx + boxW / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(c.value, bx + boxW / 2, y + 12, { align: 'center' });
  });

  y += 22;

  // Section 5: Commercial Analysis & Cost Monitoring (if selling price exists)
  const monitoring = getOrderCostMonitoring(order, summary);
  if (monitoring.hasStipulatedPrice) {
    ensureSpace(24);
    if (monitoring.level === 'exceeded') {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(225, 29, 72);
    } else if (monitoring.level === 'warning') {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(217, 119, 6);
    } else {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(16, 185, 129);
    }
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    if (monitoring.level === 'exceeded') {
      doc.setTextColor(190, 18, 60);
    } else if (monitoring.level === 'warning') {
      doc.setTextColor(180, 83, 9);
    } else {
      doc.setTextColor(4, 120, 87);
    }
    doc.text('5. ANALISE COMERCIAL E MONITORAMENTO DE CUSTO VS. PRECO', margin + 3, y + 5);

    const statusTag =
      monitoring.level === 'exceeded'
        ? `CUSTO > PRECO (+${formatBRL(monitoring.excessAmount)})`
        : monitoring.level === 'warning'
          ? `ATENCAO: ${formatNumber(monitoring.consumptionPercent, 1)}% DO PRECO`
          : `DENTRO DO PRECO (${formatNumber(monitoring.consumptionPercent, 1)}%)`;
    doc.setFontSize(7.5);
    doc.text(statusTag, pageWidth - margin - 3, y + 5, { align: 'right' });

    const commCols = contentWidth / 4;
    const isInvoiced = order.status === 'faturada';
    const thirdVal = isInvoiced ? summary.grossProfit : monitoring.remainingAmount;
    const fourthVal = isInvoiced ? summary.grossMarginPercent : monitoring.consumptionPercent;
    const commItems = [
      { label: 'Preco Venda Unit.', val: formatBRL(monitoring.stipulatedUnitPrice) },
      { label: 'Venda Estipulada Total', val: formatBRL(monitoring.stipulatedTotalPrice) },
      {
        label: isInvoiced ? 'Lucro Bruto da OP' : 'Saldo p/ Preco Estip.',
        val: formatBRL(thirdVal),
      },
      {
        label: isInvoiced ? 'Margem Bruta (%)' : 'Custo / Preco (%)',
        val: `${formatNumber(fourthVal, 1)}%`,
      },
    ];
    commItems.forEach((ci, i) => {
      const cx = margin + 3 + i * commCols;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(ci.label, cx, y + 10.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      if (i >= 2 && (monitoring.level === 'exceeded' || thirdVal < 0)) {
        doc.setTextColor(190, 18, 60);
      } else {
        doc.setTextColor(15, 23, 42);
      }
      doc.text(ci.val, cx, y + 15);
    });
    y += 24;
  }

  // Signatures
  ensureSpace(26);
  y += 10;
  const sigW = contentWidth / 2 - 10;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin + 5, y, margin + 5 + sigW, y);
  doc.line(pageWidth - margin - 5 - sigW, y, pageWidth - margin - 5, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Contador / Controller Responsavel', margin + 5 + sigW / 2, y + 4.5, {
    align: 'center',
  });
  doc.text('Gerencia de Producao & Fabrica', pageWidth - margin - 5 - sigW / 2, y + 4.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CRC / Registro Profissional', margin + 5 + sigW / 2, y + 8.5, {
    align: 'center',
  });
  doc.text(
    'Aprovacao Tecnica e Encerramento da OP',
    pageWidth - margin - 5 - sigW / 2,
    y + 8.5,
    { align: 'center' }
  );

  doc.save(`Ficha-de-Custo-${slugify(order.code)}.pdf`);
}

export function exportConsolidatedReportPDF(params: {
  companyParams: CompanyParameters;
  scenarioName: string;
  cifConfig: CIFConfiguration;
  effectiveCIFRate: number;
  totalAllocationBase: number;
  totalActualCIF: number;
  totalAppliedCIF: number;
  totalManufacturingCost: number;
  totalMD: number;
  totalMOD: number;
  wipBalance: number;
  wipCount: number;
  finishedGoodsBalance: number;
  finishedCount: number;
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
}) {
  const {
    companyParams,
    scenarioName,
    cifConfig,
    effectiveCIFRate,
    totalAllocationBase,
    totalActualCIF,
    totalAppliedCIF,
    totalManufacturingCost,
    totalMD,
    totalMOD,
    wipBalance,
    wipCount,
    finishedGoodsBalance,
    finishedCount,
    dre,
    orders,
    summaries,
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 16;
    }
  };

  const generatedAt = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RELATORIO CONTABIL CONSOLIDADO · CUSTEIO POR ORDEM DE PRODUCAO (CPC 16)', margin, y);
  y += 5;

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(companyParams.companyName.toUpperCase()), margin, y);
  doc.setFontSize(10);
  doc.text('DRE & RESUMO DE OPs', pageWidth - margin, y - 1, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizePdfText(`Cenario: ${scenarioName} · Controladoria & Contabilidade de Custos`),
    margin,
    y
  );
  doc.text(
    sanitizePdfText(`Periodo: ${companyParams.periodName} · Emissao: ${generatedAt}`),
    pageWidth - margin,
    y,
    { align: 'right' }
  );

  y += 3.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Snapshot 4 cards
  const cardW = (contentWidth - 9) / 4;
  const kpis = [
    {
      label: 'CUSTO FABRIL TOTAL',
      val: formatBRL(totalManufacturingCost),
      sub: `MD ${formatBRL(totalMD)}`,
      hi: false,
    },
    {
      label: `EM ELABORACAO (${wipCount} OP)`,
      val: formatBRL(wipBalance),
      sub: 'Ativo Circulante - Estoques',
      hi: false,
    },
    {
      label: `ACABADOS (${finishedCount} OP)`,
      val: formatBRL(finishedGoodsBalance),
      sub: 'Prontos para faturamento',
      hi: false,
    },
    {
      label: 'TAXA CIF APLICADA',
      val: `${formatBRL(effectiveCIFRate)} / ${getAllocationBaseUnit(cifConfig.allocationBase)}`,
      sub: cifConfig.method === 'taxa_real' ? 'Taxa Efetiva Real' : 'Taxa Pre-Determinada',
      hi: true,
    },
  ];

  kpis.forEach((k, idx) => {
    const kx = margin + idx * (cardW + 3);
    doc.setFillColor(k.hi ? 241 : 255, k.hi ? 245 : 255, k.hi ? 249 : 255);
    doc.setDrawColor(k.hi ? 15 : 180, k.hi ? 23 : 190, k.hi ? 42 : 205);
    doc.setLineWidth(0.3);
    doc.roundedRect(kx, y, cardW, 17, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(k.label, kx + 2.5, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(k.val), kx + 2.5, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(k.sub), kx + 2.5, y + 14.8, { maxWidth: cardW - 5 });
  });

  y += 23;

  // Section 1: DRE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DEMONSTRACAO DO RESULTADO DO EXERCICIO (DRE)', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${dre.invoicedCount} Ordem(ns) Faturada(s)`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 2;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Conta / Rubrica Contabil', margin + 2.5, y + 4.5);
  doc.text('Valor (R$)', pageWidth - margin - 28, y + 4.5, { align: 'right' });
  doc.text('AV (%)', pageWidth - margin - 2.5, y + 4.5, { align: 'right' });
  y += 6.5;

  const av = (v: number) =>
    dre.netRevenue > 0 ? `${formatNumber((v / dre.netRevenue) * 100, 1)}%` : '-';

  const dreRows: { label: string; val: string; pct: string; bold?: boolean; bg?: boolean }[] = [
    {
      label: '(=) Receita Bruta de Vendas (Ordens Faturadas)',
      val: formatBRL(dre.grossRevenue),
      pct: av(dre.grossRevenue),
      bold: true,
    },
    {
      label: '    (-) Tributos sobre Vendas e Servicos',
      val: `(${formatBRL(dre.salesTaxes)})`,
      pct: av(dre.salesTaxes),
    },
    {
      label: '(=) Receita Operacional Liquida',
      val: formatBRL(dre.netRevenue),
      pct: dre.netRevenue > 0 ? '100,0%' : '-',
      bold: true,
      bg: true,
    },
    {
      label: '    (-) Custo dos Produtos Vendidos (CPV Fabril das OPs)',
      val: `(${formatBRL(dre.baseCPV)})`,
      pct: av(dre.baseCPV),
    },
  ];

  if (Math.abs(dre.cifVariance) > 0.01) {
    dreRows.push({
      label:
        dre.cifVariance > 0
          ? '    (-) Ajuste de Subaplicacao de CIF ao CPV'
          : '    (+) Ajuste de Sobreaplicacao de CIF ao CPV',
      val:
        dre.cifVariance > 0
          ? `(${formatBRL(dre.cifVariance)})`
          : `+ ${formatBRL(Math.abs(dre.cifVariance))}`,
      pct: av(Math.abs(dre.cifVariance)),
    });
  }

  dreRows.push(
    {
      label: '(=) Lucro Operacional Bruto',
      val: formatBRL(dre.grossProfit),
      pct: `${formatNumber(dre.grossMarginPercent, 1)}%`,
      bold: true,
      bg: true,
    },
    {
      label: '    (-) Despesas com Vendas e Comerciais',
      val: `(${formatBRL(dre.commercialExpenses)})`,
      pct: av(dre.commercialExpenses),
    },
    {
      label: '    (-) Despesas Administrativas e Gerais',
      val: `(${formatBRL(dre.administrativeExpenses)})`,
      pct: av(dre.administrativeExpenses),
    },
    {
      label: '(=) Resultado Operacional Liquido (LAJIR / EBIT)',
      val: formatBRL(dre.operatingProfit),
      pct: `${formatNumber(dre.operatingMarginPercent, 1)}%`,
      bold: true,
      bg: true,
    }
  );

  dreRows.forEach((r) => {
    ensureSpace(7);
    if (r.bg) {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6.2, 'F');
    }
    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(r.label, margin + 2.5, y + 4.3);
    doc.text(r.val, pageWidth - margin - 28, y + 4.3, { align: 'right' });
    doc.text(r.pct, pageWidth - margin - 2.5, y + 4.3, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.2, pageWidth - margin, y + 6.2);
    y += 6.2;
  });

  y += 7;

  // Section 2: Resumo das Ordens de Producao
  ensureSpace(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RESUMO CONSOLIDADO DAS ORDENS DE PRODUCAO', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    sanitizePdfText(
      `CIF Real: ${formatBRL(totalActualCIF)} · CIF Aplicado: ${formatBRL(totalAppliedCIF)} · Base: ${formatNumber(
        totalAllocationBase,
        2
      )} ${getAllocationBaseUnit(cifConfig.allocationBase)}`
    ),
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 2;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('OP', margin + 1.5, y + 4.3);
  doc.text('Cliente', margin + 15, y + 4.3);
  doc.text('Status', margin + 56, y + 4.3);
  doc.text('MD', margin + 96, y + 4.3, { align: 'right' });
  doc.text('MOD', margin + 116, y + 4.3, { align: 'right' });
  doc.text('CIF', margin + 136, y + 4.3, { align: 'right' });
  doc.text('Custo Total', margin + 160, y + 4.3, { align: 'right' });
  doc.text('Margem', pageWidth - margin - 1.5, y + 4.3, { align: 'right' });
  y += 6.5;

  orders.forEach((op) => {
    ensureSpace(8);
    const s = summaries[op.id] || {
      totalMD: 0,
      totalMOD: 0,
      cifAllocated: 0,
      totalManufacturingCost: 0,
      grossMarginPercent: 0,
    };
    const shortStatus =
      op.status === 'em_elaboracao' ? 'PeE' : op.status === 'encerrada' ? 'PA' : 'Faturada';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(op.code), margin + 1.5, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(sanitizePdfText(op.clientName), margin + 15, y + 4.5, { maxWidth: 38 });
    doc.text(shortStatus, margin + 56, y + 4.5);
    doc.text(formatBRL(s.totalMD), margin + 96, y + 4.5, { align: 'right' });
    doc.text(formatBRL(s.totalMOD), margin + 116, y + 4.5, { align: 'right' });
    doc.text(formatBRL(s.cifAllocated), margin + 136, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatBRL(s.totalManufacturingCost), margin + 160, y + 4.5, { align: 'right' });
    doc.text(
      op.status === 'faturada' ? `${formatNumber(s.grossMarginPercent, 1)}%` : '-',
      pageWidth - margin - 1.5,
      y + 4.5,
      { align: 'right' }
    );
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
    y += 6.5;
  });

  // Totals Row
  ensureSpace(10);
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(`TOTAIS (${orders.length} OPs)`, margin + 1.5, y + 4.8);
  doc.text(formatBRL(totalMD), margin + 96, y + 4.8, { align: 'right' });
  doc.text(formatBRL(totalMOD), margin + 116, y + 4.8, { align: 'right' });
  doc.text(formatBRL(totalAppliedCIF), margin + 136, y + 4.8, { align: 'right' });
  doc.text(formatBRL(totalManufacturingCost), margin + 160, y + 4.8, { align: 'right' });
  doc.text(
    dre.invoicedCount > 0 ? `${formatNumber(dre.grossMarginPercent, 1)}%` : '-',
    pageWidth - margin - 1.5,
    y + 4.8,
    { align: 'right' }
  );

  y += 16;

  // Signatures
  ensureSpace(22);
  const sigW = contentWidth / 2 - 10;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin + 5, y, margin + 5 + sigW, y);
  doc.line(pageWidth - margin - 5 - sigW, y, pageWidth - margin - 5, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Contador / Controller Responsavel', margin + 5 + sigW / 2, y + 4.5, {
    align: 'center',
  });
  doc.text('Diretoria Industrial & Controladoria', pageWidth - margin - 5 - sigW / 2, y + 4.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CRC / Registro Profissional · CPC 16', margin + 5 + sigW / 2, y + 8.5, {
    align: 'center',
  });
  doc.text(
    'Conferencia de Estoques, CPV e Resultado',
    pageWidth - margin - 5 - sigW / 2,
    y + 8.5,
    { align: 'center' }
  );

  doc.save(`CustosOP-DRE-e-OPs-${slugify(companyParams.periodName || 'periodo')}.pdf`);
}

export const CIF_CATEGORY_LABELS: Record<CIFCategory, string> = {
  energia_eletrica: 'Energia Eletrica Fabril',
  depreciacao_maquinas: 'Depreciacao de Maquinas e Equipamentos',
  aluguel_fabril: 'Aluguel e Ocupacao Fabril',
  manutencao_fabril: 'Manutencao e Lubrificantes',
  supervisao_fabrica: 'Supervisao e Engenharia de Fabrica',
  materiais_indiretos: 'Materiais Indiretos / Almoxarifado',
  seguro_fabrica: 'Seguros Industriais',
  outros_cif: 'Outros Custos Indiretos',
};

export type FullPdfTopicId =
  | 'orders_summary'
  | 'orders_job_sheets'
  | 'cif_criteria'
  | 'cif_by_category'
  | 'taccounts_inventory'
  | 'taccounts_production'
  | 'taccounts_result'
  | 'dre_statement'
  | 'dre_margins_stock';

export type FullPdfCategoryId = 'orders' | 'cif' | 'taccounts' | 'dre';

export interface FullPdfTopicDef {
  id: FullPdfTopicId;
  code: string;
  title: string;
  description: string;
}

export interface FullPdfCategoryDef {
  id: FullPdfCategoryId;
  code: string;
  title: string;
  subtitle: string;
  topics: FullPdfTopicDef[];
}

export const FULL_PDF_CATEGORIES: FullPdfCategoryDef[] = [
  {
    id: 'orders',
    code: 'Categoria 01',
    title: 'Ordens de Producao (Encomendas)',
    subtitle: 'Controle fisico e financeiro por lote fabricado',
    topics: [
      {
        id: 'orders_summary',
        code: 'Topico 1.1',
        title: 'Quadro Consolidado por Estagio (PeE, PA e Faturadas)',
        description: 'Comparativo de MD, MOD, CIF, custo total, custo unitario e margem por ordem.',
      },
      {
        id: 'orders_job_sheets',
        code: 'Topico 1.2',
        title: 'Fichas Tecnicas Detalhadas por Ordem de Producao',
        description: 'Requisicoes RMA, apontamentos de horas MOD e monitoramento comercial individual.',
      },
    ],
  },
  {
    id: 'cif',
    code: 'Categoria 02',
    title: 'Custos Indiretos de Fabricacao (CIF)',
    subtitle: 'Criterio de rateio, taxa efetiva e gastos fabris por natureza',
    topics: [
      {
        id: 'cif_criteria',
        code: 'Topico 2.1',
        title: 'Parametros de Rateio e Variacao (Sub/Sobreaplicacao)',
        description: 'Metodo adotado, base acumulada, taxa aplicada e comparativo Real vs. Aplicado.',
      },
      {
        id: 'cif_by_category',
        code: 'Topico 2.2',
        title: 'Lancamentos de CIF Agrupados por Categoria Fabril',
        description: 'Totalizacao por natureza de gasto indireto (Energia, Aluguel, Depreciacao, etc.).',
      },
    ],
  },
  {
    id: 'taccounts',
    code: 'Categoria 03',
    title: 'Razonetes Contabeis em T (Partidas Dobradas)',
    subtitle: 'Movimentacao analitica de debitos, creditos e saldos',
    topics: [
      {
        id: 'taccounts_inventory',
        code: 'Topico 3.1',
        title: 'Contas de Estoques e Ativo Circulante (MP, PeE e PA)',
        description: 'Fluxo de entradas, requisicoes e transferencias entre estoques fabris.',
      },
      {
        id: 'taccounts_production',
        code: 'Topico 3.2',
        title: 'Contas de Producao e Passivo (MOD e Controle de CIF)',
        description: 'Apropriacao da folha direta e absorcao dos custos indiretos.',
      },
      {
        id: 'taccounts_result',
        code: 'Topico 3.3',
        title: 'Contas de Resultado (CPV, Receita Bruta e ARE)',
        description: 'Encerramento das ordens faturadas e apuracao do resultado contabil.',
      },
    ],
  },
  {
    id: 'dre',
    code: 'Categoria 04',
    title: 'Apuracao de Resultados (DRE) & Fechamento',
    subtitle: 'Demonstrativo do periodo, estoques finais e assinaturas',
    topics: [
      {
        id: 'dre_statement',
        code: 'Topico 4.1',
        title: 'Demonstracao do Resultado do Exercicio (DRE) Consolidada',
        description: 'Receita Bruta, tributos, CPV ajustado, despesas operacionais e LAJIR/EBIT.',
      },
      {
        id: 'dre_margins_stock',
        code: 'Topico 4.2',
        title: 'Posicao Final de Estoques, Margens e Assinaturas',
        description: 'Saldos remanescentes de MP, PeE, PA e termo de encerramento contabil.',
      },
    ],
  },
];

export interface FullSystemPdfParams {
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
  selectedTopics: FullPdfTopicId[];
  customFilenameSuffix?: string;
}

export function exportFullSystemReportPDF(params: FullSystemPdfParams) {
  const {
    companyParams,
    scenarioName,
    cifConfig,
    cifItems,
    effectiveCIFRate,
    totalAllocationBase,
    totalActualCIF,
    totalAppliedCIF,
    cifVariance,
    totalManufacturingCost,
    totalMD,
    totalMOD,
    inventoryBalances,
    dre,
    orders,
    summaries,
    tAccounts,
    selectedTopics,
    customFilenameSuffix,
  } = params;

  const topicSet = new Set<FullPdfTopicId>(selectedTopics);
  if (topicSet.size === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const drawCategoryBanner = (code: string, title: string, subtitle: string) => {
    ensureSpace(22);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 13, 1.8, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(sanitizePdfText(code.toUpperCase()), margin + 4, y + 4.5);

    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizePdfText(title.toUpperCase()), margin + 4, y + 9.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(sanitizePdfText(subtitle), pageWidth - margin - 4, y + 9.5, { align: 'right' });

    y += 17;
  };

  const drawTopicHeader = (code: string, title: string, rightNote?: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(`${code} - ${title}`), margin, y);

    if (rightNote) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(sanitizePdfText(rightNote), pageWidth - margin, y, { align: 'right' });
    }

    y += 2;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // =========================================================================
  // COVER / EXECUTIVE SUMMARY & STRUCTURED INDEX
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOSSIE CONTABIL COMPLETO · CUSTOS POR ORDEM DE PRODUCAO (CPC 16 / NBC TG 16)', margin, y);
  y += 5;

  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(companyParams.companyName.toUpperCase()), margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizePdfText(`Cenario: ${scenarioName} · Periodo: ${companyParams.periodName}`),
    margin,
    y
  );
  doc.text(sanitizePdfText(`Emissao: ${generatedAt}`), pageWidth - margin, y, { align: 'right' });

  y += 4;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Executive KPI Strip
  const cardW = (contentWidth - 9) / 4;
  const execCards = [
    { label: 'CUSTO FABRIL TOTAL', value: formatBRL(totalManufacturingCost), sub: `${orders.length} OPs no periodo` },
    { label: 'EM ELABORACAO (PeE)', value: formatBRL(inventoryBalances.finalWIP), sub: `${inventoryBalances.wipOrdersCount} OP(s) ativas` },
    { label: 'ACABADOS (PA)', value: formatBRL(inventoryBalances.finalFinishedGoods), sub: `${inventoryBalances.finishedOrdersCount} OP(s) prontas` },
    { label: 'RESULTADO (LAJIR)', value: formatBRL(dre.operatingProfit), sub: `Margem ${formatNumber(dre.operatingMarginPercent, 1)}%` },
  ];

  execCards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + 2.5, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(c.value), cx + 2.5, y + 10.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(c.sub), cx + 2.5, y + 14.3, { maxWidth: cardW - 5 });
  });
  y += 22;

  // Structured Index of Included Categories & Topics
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INDICE DE CATEGORIAS E TOPICOS SELECIONADOS', margin, y);
  y += 3;

  const activeCategories = FULL_PDF_CATEGORIES.filter((cat) =>
    cat.topics.some((t) => topicSet.has(t.id))
  );

  activeCategories.forEach((cat) => {
    const includedTopics = cat.topics.filter((t) => topicSet.has(t.id));
    ensureSpace(8 + includedTopics.length * 5);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(`${cat.code}: ${cat.title}`), margin + 2.5, y + 4.2);
    y += 6.5;

    includedTopics.forEach((t) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(sanitizePdfText(`  - ${t.code}: ${t.title}`), margin + 3, y + 3.5);
      y += 4.8;
    });
    y += 1.5;
  });

  y += 5;

  // =========================================================================
  // CATEGORIA 01: ORDENS DE PRODUCAO
  // =========================================================================
  const hasOrdersCat = topicSet.has('orders_summary') || topicSet.has('orders_job_sheets');
  if (hasOrdersCat) {
    drawCategoryBanner(
      'Categoria 01',
      'Ordens de Producao (Encomendas)',
      `${orders.length} Ordem(ns) registrada(s)`
    );

    if (topicSet.has('orders_summary')) {
      drawTopicHeader(
        'Topico 1.1',
        'Quadro Consolidado das Ordens por Estagio Contabil',
        `Total Fabril: ${formatBRL(totalManufacturingCost)}`
      );

      ensureSpace(14);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text('OP', margin + 1.5, y + 4.3);
      doc.text('Cliente / Encomendante', margin + 16, y + 4.3);
      doc.text('Estagio', margin + 62, y + 4.3);
      doc.text('MD', margin + 98, y + 4.3, { align: 'right' });
      doc.text('MOD', margin + 118, y + 4.3, { align: 'right' });
      doc.text('CIF', margin + 138, y + 4.3, { align: 'right' });
      doc.text('Custo Total', margin + 162, y + 4.3, { align: 'right' });
      doc.text('Margem', pageWidth - margin - 1.5, y + 4.3, { align: 'right' });
      y += 6.5;

      orders.forEach((op) => {
        ensureSpace(7.5);
        const s = summaries[op.id] || {
          totalMD: 0,
          totalMOD: 0,
          cifAllocated: 0,
          totalManufacturingCost: 0,
          grossMarginPercent: 0,
        };
        const shortStatus =
          op.status === 'em_elaboracao'
            ? 'Em Elaboracao (PeE)'
            : op.status === 'encerrada'
              ? 'Acabados (PA)'
              : 'Faturada (CPV)';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(sanitizePdfText(op.code), margin + 1.5, y + 4.4);

        doc.setFont('helvetica', 'normal');
        doc.text(sanitizePdfText(op.clientName), margin + 16, y + 4.4, { maxWidth: 44 });
        doc.text(shortStatus, margin + 62, y + 4.4, { maxWidth: 26 });
        doc.text(formatBRL(s.totalMD), margin + 98, y + 4.4, { align: 'right' });
        doc.text(formatBRL(s.totalMOD), margin + 118, y + 4.4, { align: 'right' });
        doc.text(formatBRL(s.cifAllocated), margin + 138, y + 4.4, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(formatBRL(s.totalManufacturingCost), margin + 162, y + 4.4, { align: 'right' });
        doc.text(
          op.status === 'faturada' ? `${formatNumber(s.grossMarginPercent, 1)}%` : '-',
          pageWidth - margin - 1.5,
          y + 4.4,
          { align: 'right' }
        );
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 6.4, pageWidth - margin, y + 6.4);
        y += 6.4;
      });

      // Totals Row
      ensureSpace(9);
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 6.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`TOTAIS (${orders.length} OPs)`, margin + 1.5, y + 4.6);
      doc.text(formatBRL(totalMD), margin + 98, y + 4.6, { align: 'right' });
      doc.text(formatBRL(totalMOD), margin + 118, y + 4.6, { align: 'right' });
      doc.text(formatBRL(totalAppliedCIF), margin + 138, y + 4.6, { align: 'right' });
      doc.text(formatBRL(totalManufacturingCost), margin + 162, y + 4.6, { align: 'right' });
      doc.text(
        dre.invoicedCount > 0 ? `${formatNumber(dre.grossMarginPercent, 1)}%` : '-',
        pageWidth - margin - 1.5,
        y + 4.6,
        { align: 'right' }
      );
      y += 12;
    }

    if (topicSet.has('orders_job_sheets')) {
      drawTopicHeader(
        'Topico 1.2',
        'Fichas Tecnicas Individuais por Ordem de Producao',
        'Detalhamento de MD, MOD e CIF'
      );

      orders.forEach((op, idx) => {
        const s = summaries[op.id];
        if (!s) return;
        ensureSpace(40);

        // OP Subheader Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentWidth, 16, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(sanitizePdfText(`${op.code} - ${op.clientName}`), margin + 3, y + 5.2);

        doc.setFontSize(7.5);
        doc.text(
          sanitizePdfText(`${STATUS_LABEL[op.status]} · Lote: ${op.quantity} ${op.unit}`),
          pageWidth - margin - 3,
          y + 5.2,
          { align: 'right' }
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(sanitizePdfText(op.productDescription), margin + 3, y + 10.2, {
          maxWidth: contentWidth - 6,
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(
          sanitizePdfText(
            `MD: ${formatBRL(s.totalMD)}  |  MOD: ${formatBRL(s.totalMOD)} (${s.totalMODHours}h)  |  CIF: ${formatBRL(s.cifAllocated)}  |  Total: ${formatBRL(s.totalManufacturingCost)}  |  Unit.: ${formatBRL(s.unitCost)}`
          ),
          margin + 3,
          y + 14.3
        );
        y += 18;

        // Materials list (compact)
        if (op.materials && op.materials.length > 0) {
          ensureSpace(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text('Requisicoes de Material Direto (MD):', margin + 2, y + 3);
          y += 4.5;

          op.materials.forEach((m) => {
            ensureSpace(5.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(71, 85, 105);
            doc.text(
              sanitizePdfText(`${m.date} · ${m.reqNumber} · ${m.description} (${m.quantity} ${m.unit})`),
              margin + 4,
              y + 3.2,
              { maxWidth: contentWidth - 40 }
            );
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(formatBRL(m.totalCost), pageWidth - margin - 2, y + 3.2, { align: 'right' });
            y += 4.5;
          });
        }

        // Labor list (compact)
        if (op.labor && op.labor.length > 0) {
          ensureSpace(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text('Apontamentos de Mao de Obra Direta (MOD):', margin + 2, y + 3.5);
          y += 5;

          op.labor.forEach((l) => {
            ensureSpace(5.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(71, 85, 105);
            doc.text(
              sanitizePdfText(`${l.date} · ${l.workerName} (${l.role}) · ${l.hours}h x ${formatBRL(l.hourlyRate)}`),
              margin + 4,
              y + 3.2,
              { maxWidth: contentWidth - 40 }
            );
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(formatBRL(l.totalCost), pageWidth - margin - 2, y + 3.2, { align: 'right' });
            y += 4.5;
          });
        }

        // Commercial monitoring line
        const mon = getOrderCostMonitoring(op, s);
        if (mon.hasStipulatedPrice) {
          ensureSpace(7);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(51, 65, 85);
          doc.text(
            sanitizePdfText(
              `Preco Estipulado: ${formatBRL(mon.stipulatedTotalPrice)} · Consumo Custo/Preco: ${formatNumber(mon.consumptionPercent, 1)}%`
            ),
            margin + 2,
            y + 3.5
          );
          y += 6;
        }

        if (idx < orders.length - 1) {
          y += 3;
        }
      });

      y += 6;
    }
  }

  // =========================================================================
  // CATEGORIA 02: CUSTOS INDIRETOS DE FABRICACAO (CIF)
  // =========================================================================
  const hasCifCat = topicSet.has('cif_criteria') || topicSet.has('cif_by_category');
  if (hasCifCat) {
    drawCategoryBanner(
      'Categoria 02',
      'Custos Indiretos de Fabricacao (CIF)',
      `Total Real: ${formatBRL(totalActualCIF)}`
    );

    if (topicSet.has('cif_criteria')) {
      drawTopicHeader(
        'Topico 2.1',
        'Parametros de Rateio, Taxa Aplicada e Variacao',
        cifConfig.method === 'taxa_real' ? 'Taxa Efetiva Real' : 'Taxa Pre-Determinada'
      );

      ensureSpace(22);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

      const col4 = contentWidth / 4;
      const cifSummaryCells = [
        { k: 'Base de Rateio', v: getAllocationBaseLabel(cifConfig.allocationBase) },
        { k: 'Volume da Base', v: `${formatNumber(totalAllocationBase, 2)} ${getAllocationBaseUnit(cifConfig.allocationBase)}` },
        { k: 'Taxa de CIF Aplicada', v: `${formatBRL(effectiveCIFRate)} / ${getAllocationBaseUnit(cifConfig.allocationBase)}` },
        {
          k: 'Variacao (Real - Aplicado)',
          v:
            Math.abs(cifVariance) < 0.01
              ? 'Equilibrado (R$ 0,00)'
              : cifVariance > 0
                ? `Subaplicacao ${formatBRL(cifVariance)}`
                : `Sobreaplicacao ${formatBRL(Math.abs(cifVariance))}`,
        },
      ];

      cifSummaryCells.forEach((cell, idx) => {
        const cx = margin + 3 + idx * col4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(cell.k, cx, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        doc.text(sanitizePdfText(cell.v), cx, y + 11, { maxWidth: col4 - 5 });
      });

      y += 23;
    }

    if (topicSet.has('cif_by_category')) {
      drawTopicHeader(
        'Topico 2.2',
        'Lancamentos de CIF Agrupados por Categoria Fabril',
        `${cifItems.length} lancamento(s)`
      );

      const grouped = new Map<CIFCategory, IndirectCostItem[]>();
      cifItems.forEach((item) => {
        const list = grouped.get(item.category) || [];
        list.push(item);
        grouped.set(item.category, list);
      });

      if (grouped.size === 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Nenhum custo indireto de fabricacao lancado neste periodo.', margin, y + 4);
        y += 10;
      } else {
        grouped.forEach((items, category) => {
          const catTotal = items.reduce((acc, i) => acc + i.amount, 0);
          ensureSpace(16);

          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, contentWidth, 6.2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(
            sanitizePdfText(`${CIF_CATEGORY_LABELS[category] || category} (${items.length})`),
            margin + 2.5,
            y + 4.3
          );
          doc.text(formatBRL(catTotal), pageWidth - margin - 2.5, y + 4.3, { align: 'right' });
          y += 6.2;

          items.forEach((item) => {
            ensureSpace(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text(item.date, margin + 3, y + 4.2);
            doc.text(sanitizePdfText(item.code), margin + 24, y + 4.2);
            doc.setTextColor(15, 23, 42);
            doc.text(sanitizePdfText(item.description), margin + 42, y + 4.2, { maxWidth: 105 });
            doc.setFont('helvetica', 'bold');
            doc.text(formatBRL(item.amount), pageWidth - margin - 2.5, y + 4.2, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, y + 5.8, pageWidth - margin, y + 5.8);
            y += 5.8;
          });
          y += 3;
        });
      }

      y += 4;
    }
  }

  // =========================================================================
  // CATEGORIA 03: RAZONETES CONTABEIS EM T
  // =========================================================================
  const renderTAccountGroup = (topicCode: string, topicTitle: string, accounts: TAccount[]) => {
    drawTopicHeader(topicCode, topicTitle, `${accounts.length} conta(s)`);

    accounts.forEach((acc) => {
      const totalDebits =
        acc.initialBalance + acc.debits.reduce((sum, d) => sum + d.amount, 0);
      const totalCredits = acc.credits.reduce((sum, c) => sum + c.amount, 0);
      const finalBalance = totalDebits - totalCredits;
      const rows = Math.max(
        acc.debits.length + (acc.initialBalance > 0 ? 1 : 0),
        acc.credits.length,
        1
      );

      const estimatedHeight = 14 + rows * 4.8 + 12;
      ensureSpace(estimatedHeight);

      // T-Account Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text(sanitizePdfText(`${acc.code} - ${acc.title}`), margin + 2.5, y + 4.3);
      doc.setFontSize(7.2);
      doc.text(
        sanitizePdfText(
          `Saldo Final: ${formatBRL(Math.abs(finalBalance))} (${finalBalance >= 0 ? 'D' : 'C'})`
        ),
        pageWidth - margin - 2.5,
        y + 4.3,
        { align: 'right' }
      );
      y += 6.2;

      // T Top Line & Column Subheaders
      const midX = margin + contentWidth / 2;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.45);
      doc.line(margin, y, pageWidth - margin, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('DEBITO (D)', margin + 2, y + 3.8);
      doc.text('CREDITO (C)', midX + 3, y + 3.8);
      const bodyStartY = y + 4.8;

      const debitEntries = [
        ...(acc.initialBalance > 0
          ? [{ label: 'Saldo Inicial (SI)', amount: acc.initialBalance }]
          : []),
        ...acc.debits.map((d) => ({ label: d.label, amount: d.amount })),
      ];
      const creditEntries = acc.credits.map((c) => ({ label: c.label, amount: c.amount }));

      let rowY = bodyStartY;
      for (let i = 0; i < rows; i++) {
        const dItem = debitEntries[i];
        const cItem = creditEntries[i];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        if (dItem) {
          doc.setTextColor(51, 65, 85);
          doc.text(sanitizePdfText(dItem.label), margin + 2, rowY + 3.2, {
            maxWidth: contentWidth / 2 - 28,
          });
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(formatBRL(dItem.amount), midX - 2.5, rowY + 3.2, { align: 'right' });
        }

        if (cItem) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.text(sanitizePdfText(cItem.label), midX + 3, rowY + 3.2, {
            maxWidth: contentWidth / 2 - 28,
          });
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(formatBRL(cItem.amount), pageWidth - margin - 2, rowY + 3.2, {
            align: 'right',
          });
        }

        rowY += 4.8;
      }

      // Vertical T stem
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.35);
      doc.line(midX, y, midX, rowY + 1);

      // Totals underline
      doc.setDrawColor(148, 163, 184);
      doc.line(margin, rowY + 1, pageWidth - margin, rowY + 1);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(`Soma D: ${formatBRL(totalDebits)}`, midX - 2.5, rowY + 4.8, { align: 'right' });
      doc.text(`Soma C: ${formatBRL(totalCredits)}`, pageWidth - margin - 2, rowY + 4.8, {
        align: 'right',
      });

      y = rowY + 9;
    });
  };

  const hasTAccountsCat =
    topicSet.has('taccounts_inventory') ||
    topicSet.has('taccounts_production') ||
    topicSet.has('taccounts_result');

  if (hasTAccountsCat) {
    drawCategoryBanner(
      'Categoria 03',
      'Razonetes Contabeis em T',
      'Partidas dobradas da acumulacao de custos'
    );

    if (topicSet.has('taccounts_inventory')) {
      renderTAccountGroup(
        'Topico 3.1',
        'Contas de Estoques e Ativo Circulante (MP, PeE e PA)',
        tAccounts.filter((t) => t.category === 'ativo_circulante')
      );
    }

    if (topicSet.has('taccounts_production')) {
      renderTAccountGroup(
        'Topico 3.2',
        'Contas de Producao e Passivo (MOD e Controle de CIF)',
        tAccounts.filter(
          (t) => t.category === 'passivo_circulante' || t.category === 'custos_producao'
        )
      );
    }

    if (topicSet.has('taccounts_result')) {
      renderTAccountGroup(
        'Topico 3.3',
        'Contas de Resultado (CPV, Receita Bruta e ARE)',
        tAccounts.filter((t) => t.category === 'resultado')
      );
    }
  }

  // =========================================================================
  // CATEGORIA 04: DRE & FECHAMENTO
  // =========================================================================
  const hasDreCat = topicSet.has('dre_statement') || topicSet.has('dre_margins_stock');
  if (hasDreCat) {
    drawCategoryBanner(
      'Categoria 04',
      'Apuracao de Resultados (DRE) & Fechamento',
      `${dre.invoicedCount} Ordem(ns) faturada(s)`
    );

    if (topicSet.has('dre_statement')) {
      drawTopicHeader(
        'Topico 4.1',
        'Demonstracao do Resultado do Exercicio (DRE) Consolidada',
        `Periodo: ${companyParams.periodName}`
      );

      ensureSpace(68);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      doc.text('Conta / Rubrica Contabil', margin + 2.5, y + 4.4);
      doc.text('Valor (R$)', pageWidth - margin - 28, y + 4.4, { align: 'right' });
      doc.text('AV (%)', pageWidth - margin - 2.5, y + 4.4, { align: 'right' });
      y += 6.5;

      const av = (v: number) =>
        dre.netRevenue > 0 ? `${formatNumber((v / dre.netRevenue) * 100, 1)}%` : '-';

      const dreRows: { label: string; val: string; pct: string; bold?: boolean; bg?: boolean }[] = [
        {
          label: '(=) Receita Bruta de Vendas (Ordens Faturadas)',
          val: formatBRL(dre.grossRevenue),
          pct: av(dre.grossRevenue),
          bold: true,
        },
        {
          label: '    (-) Tributos sobre Vendas e Servicos',
          val: `(${formatBRL(dre.salesTaxes)})`,
          pct: av(dre.salesTaxes),
        },
        {
          label: '(=) Receita Operacional Liquida',
          val: formatBRL(dre.netRevenue),
          pct: dre.netRevenue > 0 ? '100,0%' : '-',
          bold: true,
          bg: true,
        },
        {
          label: '    (-) Custo dos Produtos Vendidos (CPV Fabril das OPs)',
          val: `(${formatBRL(dre.baseCPV)})`,
          pct: av(dre.baseCPV),
        },
      ];

      if (Math.abs(dre.cifVariance) > 0.01) {
        dreRows.push({
          label:
            dre.cifVariance > 0
              ? '    (-) Ajuste de Subaplicacao de CIF ao CPV'
              : '    (+) Ajuste de Sobreaplicacao de CIF ao CPV',
          val:
            dre.cifVariance > 0
              ? `(${formatBRL(dre.cifVariance)})`
              : `+ ${formatBRL(Math.abs(dre.cifVariance))}`,
          pct: av(Math.abs(dre.cifVariance)),
        });
      }

      dreRows.push(
        {
          label: '(=) Lucro Operacional Bruto',
          val: formatBRL(dre.grossProfit),
          pct: `${formatNumber(dre.grossMarginPercent, 1)}%`,
          bold: true,
          bg: true,
        },
        {
          label: '    (-) Despesas com Vendas e Comerciais',
          val: `(${formatBRL(dre.commercialExpenses)})`,
          pct: av(dre.commercialExpenses),
        },
        {
          label: '    (-) Despesas Administrativas e Gerais',
          val: `(${formatBRL(dre.administrativeExpenses)})`,
          pct: av(dre.administrativeExpenses),
        },
        {
          label: '(=) Resultado Operacional Liquido (LAJIR / EBIT)',
          val: formatBRL(dre.operatingProfit),
          pct: `${formatNumber(dre.operatingMarginPercent, 1)}%`,
          bold: true,
          bg: true,
        }
      );

      dreRows.forEach((r) => {
        ensureSpace(6.8);
        if (r.bg) {
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, contentWidth, 6.2, 'F');
        }
        doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        doc.text(r.label, margin + 2.5, y + 4.3);
        doc.text(r.val, pageWidth - margin - 28, y + 4.3, { align: 'right' });
        doc.text(r.pct, pageWidth - margin - 2.5, y + 4.3, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 6.2, pageWidth - margin, y + 6.2);
        y += 6.2;
      });
      y += 8;
    }

    if (topicSet.has('dre_margins_stock')) {
      drawTopicHeader(
        'Topico 4.2',
        'Posicao Final de Estoques, Margens Faturadas e Termo de Fechamento'
      );

      ensureSpace(22);
      const stockCardW = (contentWidth - 6) / 3;
      const stockBoxes = [
        { title: 'Estoque Final Materia-Prima (MP)', val: formatBRL(inventoryBalances.finalRawMaterials) },
        { title: `Estoque Final em Elaboracao (${inventoryBalances.wipOrdersCount} OP)`, val: formatBRL(inventoryBalances.finalWIP) },
        { title: `Estoque Final Acabados (${inventoryBalances.finishedOrdersCount} OP)`, val: formatBRL(inventoryBalances.finalFinishedGoods) },
      ];

      stockBoxes.forEach((sb, idx) => {
        const bx = margin + idx * (stockCardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(bx, y, stockCardW, 14, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sanitizePdfText(sb.title), bx + 2.5, y + 4.8);

        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(sb.val, bx + 2.5, y + 10.8);
      });
      y += 22;

      // Signatures
      ensureSpace(22);
      const sigW = contentWidth / 2 - 10;
      doc.setDrawColor(15, 23, 42);
      doc.line(margin + 5, y, margin + 5 + sigW, y);
      doc.line(pageWidth - margin - 5 - sigW, y, pageWidth - margin - 5, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Contador / Controller Responsavel', margin + 5 + sigW / 2, y + 4.5, {
        align: 'center',
      });
      doc.text('Diretoria Industrial & Controladoria', pageWidth - margin - 5 - sigW / 2, y + 4.5, {
        align: 'center',
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('CRC / Registro Profissional · CPC 16', margin + 5 + sigW / 2, y + 8.5, {
        align: 'center',
      });
      doc.text(
        'Conferencia Integral de Custos, Estoques e DRE',
        pageWidth - margin - 5 - sigW / 2,
        y + 8.5,
        { align: 'center' }
      );
    }
  }

  // Running Footer with Page Numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(`CustosOP · ${companyParams.companyName} (${companyParams.periodName})`),
      margin,
      pageHeight - 7
    );
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    });
  }

  const suffix = customFilenameSuffix ? `-${slugify(customFilenameSuffix)}` : '-Full';
  doc.save(`CustosOP-Dossie${suffix}-${slugify(companyParams.periodName || 'periodo')}.pdf`);
}

export interface CorporateIRPdfParams {
  companyName: string;
  cnpj: string;
  periodName: string;
  regimeLabel: string;
  periodicityLabel: string;
  activityLabel: string;
  scaleFactorLabel: string;
  grossRevenue: number;
  salesTaxes: number;
  netRevenue: number;
  adjustedCPV: number;
  operatingExpenses: number;
  accountingLAIR: number;
  additions: number;
  exclusions: number;
  taxLossOffset: number;
  taxBaseIRPJ: number;
  taxBaseCSLL: number;
  irpjNormal: number;
  irpjAdditional: number;
  taxIncentives: number;
  irrfWithheld: number;
  irpjDue: number;
  csllDue: number;
  totalTaxDue: number;
  effectiveRateOnRevenue: number;
  effectiveRateOnProfit: number;
  netProfitAfterTax: number;
  darfRows: { code: string; tax: string; dueDate: string; amount: number }[];
  regimeComparison: {
    regime: string;
    irpj: number;
    csll: number;
    total: number;
    recommended: boolean;
  }[];
}

export function exportCorporateIRReportPDF(params: CorporateIRPdfParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const generatedAt = new Date().toLocaleDateString('pt-BR');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SIMULADOR DE DECLARACAO DE IRPJ & CSLL (ECF / e-LALUR)', margin, y);
  y += 5;

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(params.companyName.toUpperCase()), margin, y);
  doc.setFontSize(9.5);
  doc.text(sanitizePdfText(`CNPJ: ${params.cnpj || '00.000.000/0001-00'}`), pageWidth - margin, y - 0.5, {
    align: 'right',
  });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizePdfText(`Regime: ${params.regimeLabel} · Apuracao: ${params.periodicityLabel} (${params.scaleFactorLabel})`),
    margin,
    y
  );
  doc.text(
    sanitizePdfText(`Competencia: ${params.periodName} · Emissao: ${generatedAt}`),
    pageWidth - margin,
    y,
    { align: 'right' }
  );

  y += 3.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // KPI Cards
  const cardW = (contentWidth - 9) / 4;
  const cards = [
    { label: 'LAIR CONTABIL', val: formatBRL(params.accountingLAIR), sub: `Rec. Bruta ${formatBRL(params.grossRevenue)}` },
    { label: 'IRPJ LIQUIDO', val: formatBRL(params.irpjDue), sub: `Normal + Adic. - Deducoes` },
    { label: 'CSLL A RECOLHER', val: formatBRL(params.csllDue), sub: `Base ${formatBRL(params.taxBaseCSLL)}` },
    { label: 'TOTAL IRPJ + CSLL', val: formatBRL(params.totalTaxDue), sub: `${formatNumber(params.effectiveRateOnRevenue, 2)}% s/ Rec. Bruta` },
  ];

  cards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, y, cardW, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + 2.5, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(c.val), cx + 2.5, y + 10.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizePdfText(c.sub), cx + 2.5, y + 14.3, { maxWidth: cardW - 5 });
  });
  y += 22;

  // Section 1: Memoria de Calculo ECF / e-LALUR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. MEMORIA DE APURACAO FISCAL (IRPJ & CSLL)', margin, y);
  y += 2;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  const lines: { label: string; value: string; bold?: boolean; highlight?: boolean }[] = [
    { label: 'Receita Bruta Considerada', value: formatBRL(params.grossRevenue) },
    { label: '(-) Tributos sobre Vendas (ICMS/PIS/COFINS)', value: `(${formatBRL(params.salesTaxes)})` },
    { label: '(=) Receita Liquida', value: formatBRL(params.netRevenue), bold: true },
    { label: '(-) CPV Ajustado e Despesas Operacionais', value: `(${formatBRL(params.adjustedCPV + params.operatingExpenses)})` },
    { label: '(=) Lucro Contabil Antes do IR/CSLL (LAIR)', value: formatBRL(params.accountingLAIR), bold: true, highlight: true },
    { label: '(+) Adicoes Fiscais no e-LALUR', value: `+ ${formatBRL(params.additions)}` },
    { label: '(-) Exclusoes Fiscais Permitidas', value: `(${formatBRL(params.exclusions)})` },
    { label: '(-) Compensacao de Prejuizo Fiscal (Trava 30%)', value: `(${formatBRL(params.taxLossOffset)})` },
    { label: '(=) Base de Calculo Tributavel IRPJ', value: formatBRL(params.taxBaseIRPJ), bold: true, highlight: true },
    { label: 'IRPJ Basico (15% sobre Base IRPJ)', value: formatBRL(params.irpjNormal) },
    { label: 'Adicional de IRPJ (10% sobre Excedente Legal)', value: formatBRL(params.irpjAdditional) },
    { label: '(-) Incentivos Fiscais (PAT / Lei do Bem) e IRRF Retido', value: `(${formatBRL(params.taxIncentives + params.irrfWithheld)})` },
    { label: '(=) IRPJ Liquido a Recolher', value: formatBRL(params.irpjDue), bold: true },
    { label: '(=) CSLL a Recolher', value: formatBRL(params.csllDue), bold: true },
    { label: '(=) Total Geral IRPJ + CSLL (Carga Tributaria)', value: formatBRL(params.totalTaxDue), bold: true, highlight: true },
    { label: '(=) Lucro Liquido Contabil Pos-IRPJ/CSLL', value: formatBRL(params.netProfitAfterTax), bold: true },
  ];

  lines.forEach((row) => {
    ensureSpace(6.8);
    if (row.highlight) {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6.2, 'F');
    }
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(row.label), margin + 2.5, y + 4.3);
    doc.text(sanitizePdfText(row.value), pageWidth - margin - 2.5, y + 4.3, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.2, pageWidth - margin, y + 6.2);
    y += 6.2;
  });

  y += 8;

  // Section 2: Comparativo entre Regimes
  ensureSpace(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. COMPARATIVO DE REGIMES TRIBUTARIOS (PLANEJAMENTO FISCAL)', margin, y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.text('Regime Tributario', margin + 2.5, y + 4.4);
  doc.text('IRPJ / Fração', margin + 96, y + 4.4, { align: 'right' });
  doc.text('CSLL / Fração', margin + 132, y + 4.4, { align: 'right' });
  doc.text('Total IRPJ + CSLL', pageWidth - margin - 2.5, y + 4.4, { align: 'right' });
  y += 6.5;

  params.regimeComparison.forEach((rc) => {
    ensureSpace(7);
    doc.setFont('helvetica', rc.recommended ? 'bold' : 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      sanitizePdfText(`${rc.regime}${rc.recommended ? ' (Menor Carga IR/CSLL)' : ''}`),
      margin + 2.5,
      y + 4.5
    );
    doc.text(formatBRL(rc.irpj), margin + 96, y + 4.5, { align: 'right' });
    doc.text(formatBRL(rc.csll), margin + 132, y + 4.5, { align: 'right' });
    doc.text(formatBRL(rc.total), pageWidth - margin - 2.5, y + 4.5, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
    y += 6.5;
  });

  y += 8;

  // Section 3: Guias DARF
  if (params.darfRows.length > 0) {
    ensureSpace(26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. PREVISAO DE GUIAS DARF / DAS A RECOLHER', margin, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFontSize(7.5);
    doc.text('Codigo Receita', margin + 2.5, y + 4.4);
    doc.text('Tributo / Documento', margin + 35, y + 4.4);
    doc.text('Vencimento Tipico', margin + 122, y + 4.4);
    doc.text('Valor Estimado', pageWidth - margin - 2.5, y + 4.4, { align: 'right' });
    y += 6.5;

    params.darfRows.forEach((d) => {
      ensureSpace(7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.text(sanitizePdfText(d.code), margin + 2.5, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.text(sanitizePdfText(d.tax), margin + 35, y + 4.5);
      doc.text(sanitizePdfText(d.dueDate), margin + 122, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(d.amount), pageWidth - margin - 2.5, y + 4.5, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 6.5;
    });
  }

  doc.save(`CustosOP-Declaracao-IR-${slugify(params.companyName || 'empresa')}.pdf`);
}


