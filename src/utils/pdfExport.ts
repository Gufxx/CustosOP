import { jsPDF } from 'jspdf';
import {
  ProductionOrder,
  OrderCostSummary,
  CIFConfiguration,
  CompanyParameters,
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
