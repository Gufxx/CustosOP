import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calculator,
  CheckCircle2,
  FileDown,
  Landmark,
  Receipt,
  RotateCcw,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import { CompanyParameters } from '../types/costing';
import { formatBRL, formatNumber } from '../utils/costCalculations';
import { exportCorporateIRReportPDF } from '../utils/pdfExport';

type TaxRegime = 'lucro_real' | 'lucro_presumido' | 'simples_nacional';
type ScaleMode = 'mensal_1x' | 'trimestral_3x' | 'anual_12x';
type PresumedActivity = 'industria' | 'misto' | 'servicos';

interface CorporateIRSimulatorViewProps {
  companyParams: CompanyParameters;
  scenarioName: string;
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
}

interface RegimeResult {
  id: TaxRegime;
  label: string;
  shortDesc: string;
  taxBaseIRPJ: number;
  taxBaseCSLL: number;
  irpjNormal: number;
  irpjAdditional: number;
  taxIncentivesUsed: number;
  irrfApplied: number;
  irpjDue: number;
  csllDue: number;
  totalIRCSLL: number;
  totalDAS?: number;
  effectiveRateOnRevenue: number;
  effectiveRateOnLAIR: number;
  netProfitAfterTax: number;
  taxLossOffsetUsed: number;
  exceedsSimplesLimit?: boolean;
  simplesEffectiveBracketRate?: number;
}

const SCALE_CONFIG: Record<
  ScaleMode,
  {
    label: string;
    periodicityLabel: string;
    multiplier: number;
    additionalThreshold: number;
    darfDueNote: string;
  }
> = {
  mensal_1x: {
    label: 'Período DRE (1x)',
    periodicityLabel: 'Apuração Mensal',
    multiplier: 1,
    additionalThreshold: 20000,
    darfDueNote: 'Último dia útil do mês subsequente',
  },
  trimestral_3x: {
    label: 'Trimestre (3x)',
    periodicityLabel: 'Apuração Trimestral',
    multiplier: 3,
    additionalThreshold: 60000,
    darfDueNote: 'Último dia útil do mês seguinte ao trimestre',
  },
  anual_12x: {
    label: 'Exercício Anual (12x)',
    periodicityLabel: 'Apuração Anual (ECF)',
    multiplier: 12,
    additionalThreshold: 240000,
    darfDueNote: 'Ajuste anual até 31/03 (antecipações mensais)',
  },
};

const ACTIVITY_CONFIG: Record<
  PresumedActivity,
  { label: string; irpjRate: number; csllRate: number; hint: string }
> = {
  industria: {
    label: 'Indústria / Manufatura (8% / 12%)',
    irpjRate: 0.08,
    csllRate: 0.12,
    hint: 'Venda de mercadorias e bens produzidos sob encomenda',
  },
  misto: {
    label: 'Misto Industrial + Projetos (16% / 12%)',
    irpjRate: 0.16,
    csllRate: 0.12,
    hint: 'Operações híbridas de fabricação e engenharia',
  },
  servicos: {
    label: 'Serviços Técnicos / Engenharia (32% / 32%)',
    irpjRate: 0.32,
    csllRate: 0.32,
    hint: 'Prestação de serviços sem fornecimento de mercadoria',
  },
};

function computeSimplesAnexoII(rbt12: number) {
  const brackets = [
    { max: 180000, nominal: 0.045, deduction: 0, irpjShare: 0.055, csllShare: 0.035 },
    { max: 360000, nominal: 0.078, deduction: 5940, irpjShare: 0.055, csllShare: 0.035 },
    { max: 720000, nominal: 0.10, deduction: 13860, irpjShare: 0.055, csllShare: 0.035 },
    { max: 1800000, nominal: 0.112, deduction: 22500, irpjShare: 0.055, csllShare: 0.035 },
    { max: 3600000, nominal: 0.147, deduction: 85500, irpjShare: 0.055, csllShare: 0.035 },
    { max: 4800000, nominal: 0.30, deduction: 720000, irpjShare: 0.085, csllShare: 0.075 },
  ];

  const safeRbt12 = Math.max(1, rbt12);
  const bracket = brackets.find((b) => safeRbt12 <= b.max) || brackets[brackets.length - 1];
  const effectiveRate = Math.max(0.045, (safeRbt12 * bracket.nominal - bracket.deduction) / safeRbt12);
  return {
    effectiveRate,
    irpjShare: bracket.irpjShare,
    csllShare: bracket.csllShare,
    exceedsLimit: rbt12 > 4800000,
  };
}

export function CorporateIRSimulatorView({
  companyParams,
  scenarioName,
  dre,
}: CorporateIRSimulatorViewProps) {
  const [regime, setRegime] = useState<TaxRegime>('lucro_real');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('trimestral_3x');
  const [presumedActivity, setPresumedActivity] = useState<PresumedActivity>('industria');
  const [cnpj, setCnpj] = useState('42.815.390/0001-64');

  // Interactive tax adjustment parameters (values scaled in BRL for the selected period)
  const [extraRevenue, setExtraRevenue] = useState<number>(0);
  const [lalurAdditions, setLalurAdditions] = useState<number>(2400);
  const [lalurExclusions, setLalurExclusions] = useState<number>(900);
  const [priorTaxLosses, setPriorTaxLosses] = useState<number>(0);
  const [patIncentive, setPatIncentive] = useState<number>(0);
  const [irrfWithheld, setIrrfWithheld] = useState<number>(0);

  const scale = SCALE_CONFIG[scaleMode];
  const activity = ACTIVITY_CONFIG[presumedActivity];

  const handleResetAdjustments = () => {
    setExtraRevenue(0);
    setLalurAdditions(2400);
    setLalurExclusions(900);
    setPriorTaxLosses(0);
    setPatIncentive(0);
    setIrrfWithheld(0);
  };

  // Core scaled figures synced live with DRE
  const fiscalModel = useMemo(() => {
    const m = scale.multiplier;
    const baseGrossRevenue = dre.grossRevenue * m;
    const grossRevenue = baseGrossRevenue + Math.max(0, extraRevenue);
    const salesTaxes = dre.salesTaxes * m;
    const netRevenue = grossRevenue - salesTaxes;
    const adjustedCPV = dre.adjustedCPV * m;
    const operatingExpenses = dre.totalOperatingExpenses * m;
    const accountingLAIR = netRevenue - adjustedCPV - operatingExpenses;

    const threshold = scale.additionalThreshold;

    // 1. LUCRO REAL (e-LALUR)
    const lalurAdjustedBeforeLoss = accountingLAIR + lalurAdditions - lalurExclusions;
    const maxLossOffset = lalurAdjustedBeforeLoss > 0 ? lalurAdjustedBeforeLoss * 0.3 : 0;
    const taxLossOffsetUsed = Math.min(Math.max(0, priorTaxLosses), maxLossOffset);
    const realBaseIRPJ = Math.max(0, lalurAdjustedBeforeLoss - taxLossOffsetUsed);
    const realBaseCSLL = realBaseIRPJ;

    const realIrpjNormal = realBaseIRPJ * 0.15;
    const realIrpjAdditional = Math.max(0, realBaseIRPJ - threshold) * 0.1;
    const maxPatAllowed = realIrpjNormal * 0.04;
    const realPatUsed = Math.min(Math.max(0, patIncentive), maxPatAllowed);
    const realIrpjBeforeWithholding = Math.max(0, realIrpjNormal + realIrpjAdditional - realPatUsed);
    const realIrrfApplied = Math.min(Math.max(0, irrfWithheld), realIrpjBeforeWithholding);
    const realIrpjDue = Math.max(0, realIrpjBeforeWithholding - realIrrfApplied);
    const realCsllDue = realBaseCSLL * 0.09;
    const realTotal = realIrpjDue + realCsllDue;

    const realResult: RegimeResult = {
      id: 'lucro_real',
      label: 'Lucro Real (LALUR)',
      shortDesc: 'Apuração efetiva s/ LAIR ajustado',
      taxBaseIRPJ: realBaseIRPJ,
      taxBaseCSLL: realBaseCSLL,
      irpjNormal: realIrpjNormal,
      irpjAdditional: realIrpjAdditional,
      taxIncentivesUsed: realPatUsed,
      irrfApplied: realIrrfApplied,
      irpjDue: realIrpjDue,
      csllDue: realCsllDue,
      totalIRCSLL: realTotal,
      effectiveRateOnRevenue: grossRevenue > 0 ? (realTotal / grossRevenue) * 100 : 0,
      effectiveRateOnLAIR: accountingLAIR > 0 ? (realTotal / accountingLAIR) * 100 : 0,
      netProfitAfterTax: accountingLAIR - realTotal,
      taxLossOffsetUsed,
    };

    // 2. LUCRO PRESUMIDO
    const presumedBaseIRPJ =
      baseGrossRevenue * activity.irpjRate + Math.max(0, extraRevenue);
    const presumedBaseCSLL =
      baseGrossRevenue * activity.csllRate + Math.max(0, extraRevenue);
    const presIrpjNormal = presumedBaseIRPJ * 0.15;
    const presIrpjAdditional = Math.max(0, presumedBaseIRPJ - threshold) * 0.1;
    const presIrpjBeforeWithholding = presIrpjNormal + presIrpjAdditional;
    const presIrrfApplied = Math.min(Math.max(0, irrfWithheld), presIrpjBeforeWithholding);
    const presIrpjDue = Math.max(0, presIrpjBeforeWithholding - presIrrfApplied);
    const presCsllDue = presumedBaseCSLL * 0.09;
    const presTotal = presIrpjDue + presCsllDue;

    const presumedResult: RegimeResult = {
      id: 'lucro_presumido',
      label: 'Lucro Presumido',
      shortDesc: `Presunção ${Math.round(activity.irpjRate * 100)}% IR / ${Math.round(activity.csllRate * 100)}% CSLL`,
      taxBaseIRPJ: presumedBaseIRPJ,
      taxBaseCSLL: presumedBaseCSLL,
      irpjNormal: presIrpjNormal,
      irpjAdditional: presIrpjAdditional,
      taxIncentivesUsed: 0,
      irrfApplied: presIrrfApplied,
      irpjDue: presIrpjDue,
      csllDue: presCsllDue,
      totalIRCSLL: presTotal,
      effectiveRateOnRevenue: grossRevenue > 0 ? (presTotal / grossRevenue) * 100 : 0,
      effectiveRateOnLAIR: accountingLAIR > 0 ? (presTotal / accountingLAIR) * 100 : 0,
      netProfitAfterTax: accountingLAIR - presTotal,
      taxLossOffsetUsed: 0,
    };

    // 3. SIMPLES NACIONAL (Anexo II Indústria)
    const annualizedGross = grossRevenue * (12 / m);
    const simples = computeSimplesAnexoII(annualizedGross);
    const totalDAS = grossRevenue * simples.effectiveRate;
    const simplesIrpjPart = totalDAS * simples.irpjShare;
    const simplesCsllPart = totalDAS * simples.csllShare;
    const simplesIRCSLL = simplesIrpjPart + simplesCsllPart;

    const simplesResult: RegimeResult = {
      id: 'simples_nacional',
      label: 'Simples Nacional (Anexo II)',
      shortDesc: 'Fração IRPJ + CSLL embutida no DAS',
      taxBaseIRPJ: grossRevenue,
      taxBaseCSLL: grossRevenue,
      irpjNormal: simplesIrpjPart,
      irpjAdditional: 0,
      taxIncentivesUsed: 0,
      irrfApplied: 0,
      irpjDue: simplesIrpjPart,
      csllDue: simplesCsllPart,
      totalIRCSLL: simplesIRCSLL,
      totalDAS,
      effectiveRateOnRevenue: grossRevenue > 0 ? (simplesIRCSLL / grossRevenue) * 100 : 0,
      effectiveRateOnLAIR: accountingLAIR > 0 ? (simplesIRCSLL / accountingLAIR) * 100 : 0,
      netProfitAfterTax: accountingLAIR - simplesIRCSLL,
      taxLossOffsetUsed: 0,
      exceedsSimplesLimit: simples.exceedsLimit,
      simplesEffectiveBracketRate: simples.effectiveRate * 100,
    };

    const allRegimes: RegimeResult[] = [realResult, presumedResult, simplesResult];
    const eligibleRegimes = allRegimes.filter((r) => !r.exceedsSimplesLimit);
    const bestRegime = (eligibleRegimes.length > 0 ? eligibleRegimes : allRegimes).reduce(
      (best, cur) => (cur.totalIRCSLL < best.totalIRCSLL ? cur : best)
    );

    const active = allRegimes.find((r) => r.id === regime) || realResult;

    const maxRegimeCost = Math.max(...allRegimes.map((r) => r.totalIRCSLL));
    const potentialSavingsVsActive = Math.max(0, active.totalIRCSLL - bestRegime.totalIRCSLL);
    const savingsVsWorst = Math.max(0, maxRegimeCost - bestRegime.totalIRCSLL);

    // DARF schedule for the active regime
    const darfRows: { code: string; tax: string; dueDate: string; amount: number }[] =
      regime === 'lucro_real'
        ? [
            {
              code: scaleMode === 'mensal_1x' ? '2362' : '0220',
              tax: 'IRPJ — Lucro Real (Pessoa Jurídica)',
              dueDate: scale.darfDueNote,
              amount: active.irpjDue,
            },
            {
              code: scaleMode === 'mensal_1x' ? '2484' : '6012',
              tax: 'CSLL — Contribuição Social s/ Lucro Líquido',
              dueDate: scale.darfDueNote,
              amount: active.csllDue,
            },
          ]
        : regime === 'lucro_presumido'
          ? [
              {
                code: '2089',
                tax: 'IRPJ — Lucro Presumido',
                dueDate: scale.darfDueNote,
                amount: active.irpjDue,
              },
              {
                code: '2372',
                tax: 'CSLL — Lucro Presumido',
                dueDate: scale.darfDueNote,
                amount: active.csllDue,
              },
            ]
          : [
              {
                code: 'DAS-SN',
                tax: 'DAS Unificado (Parcela IRPJ + CSLL Anexo II)',
                dueDate: 'Dia 20 do mês subsequente',
                amount: active.totalIRCSLL,
              },
            ];

    // Fiscal planning & compliance alerts
    const alerts: { tone: 'amber' | 'rose' | 'emerald'; text: string }[] = [];
    if (accountingLAIR <= 0 && regime === 'lucro_presumido' && presumedResult.totalIRCSLL > 0) {
      alerts.push({
        tone: 'rose',
        text: `No Lucro Presumido há imposto devido (${formatBRL(presumedResult.totalIRCSLL)}) mesmo com LAIR contábil negativo ou zero. No Lucro Real, o IRPJ/CSLL seria zerado.`,
      });
    }
    if (priorTaxLosses > maxLossOffset && lalurAdjustedBeforeLoss > 0 && regime === 'lucro_real') {
      alerts.push({
        tone: 'amber',
        text: `Trava legal dos 30% aplicada: de ${formatBRL(priorTaxLosses)} de prejuízo acumulado, apenas ${formatBRL(taxLossOffsetUsed)} pôde ser compensado nesta apuração.`,
      });
    }
    if (patIncentive > maxPatAllowed && regime === 'lucro_real' && realIrpjNormal > 0) {
      alerts.push({
        tone: 'amber',
        text: `Dedução PAT limitada a 4% do IRPJ básico (${formatBRL(maxPatAllowed)}). Excedente não dedutível no período.`,
      });
    }
    if (active.irpjAdditional > 0) {
      alerts.push({
        tone: 'amber',
        text: `Base tributável superou o limite de isenção do Adicional (${formatBRL(threshold)}), gerando ${formatBRL(active.irpjAdditional)} extras de IRPJ (10%).`,
      });
    }
    if (simplesResult.exceedsSimplesLimit && regime === 'simples_nacional') {
      alerts.push({
        tone: 'rose',
        text: `Receita bruta anualizada (${formatBRL(annualizedGross)}) excede o teto legal de R$ 4.800.000,00 do Simples Nacional (LC 123/2006).`,
      });
    }
    if (Math.abs(dre.cifVariance) > 0.01 && dre.cifVariance > 0) {
      alerts.push({
        tone: 'amber',
        text: `Subaplicação de CIF da DRE (${formatBRL(dre.cifVariance * m)}) reduziu o LAIR fiscal e diminuiu a base do Lucro Real.`,
      });
    }
    if (alerts.length === 0 && bestRegime.id === regime) {
      alerts.push({
        tone: 'emerald',
        text: `Enquadramento ótimo para a margem atual: ${active.label} apresenta a menor carga combinada de IRPJ + CSLL.`,
      });
    }

    return {
      baseGrossRevenue,
      grossRevenue,
      salesTaxes,
      netRevenue,
      adjustedCPV,
      operatingExpenses,
      accountingLAIR,
      threshold,
      lalurAdjustedBeforeLoss,
      maxLossOffset,
      maxPatAllowed,
      annualizedGross,
      allRegimes,
      bestRegime,
      active,
      potentialSavingsVsActive,
      savingsVsWorst,
      darfRows,
      alerts,
    };
  }, [
    dre,
    scale,
    activity,
    regime,
    scaleMode,
    extraRevenue,
    lalurAdditions,
    lalurExclusions,
    priorTaxLosses,
    patIncentive,
    irrfWithheld,
  ]);

  const handleExportPDF = () => {
    const active = fiscalModel.active;
    exportCorporateIRReportPDF({
      companyName: companyParams.companyName,
      cnpj,
      periodName: companyParams.periodName,
      regimeLabel: active.label,
      periodicityLabel: scale.periodicityLabel,
      activityLabel: activity.label,
      scaleFactorLabel: scale.label,
      grossRevenue: fiscalModel.grossRevenue,
      salesTaxes: fiscalModel.salesTaxes,
      netRevenue: fiscalModel.netRevenue,
      adjustedCPV: fiscalModel.adjustedCPV,
      operatingExpenses: fiscalModel.operatingExpenses,
      accountingLAIR: fiscalModel.accountingLAIR,
      additions: regime === 'lucro_real' ? lalurAdditions : 0,
      exclusions: regime === 'lucro_real' ? lalurExclusions : 0,
      taxLossOffset: active.taxLossOffsetUsed,
      taxBaseIRPJ: active.taxBaseIRPJ,
      taxBaseCSLL: active.taxBaseCSLL,
      irpjNormal: active.irpjNormal,
      irpjAdditional: active.irpjAdditional,
      taxIncentives: active.taxIncentivesUsed,
      irrfWithheld: active.irrfApplied,
      irpjDue: active.irpjDue,
      csllDue: active.csllDue,
      totalTaxDue: active.totalIRCSLL,
      effectiveRateOnRevenue: active.effectiveRateOnRevenue,
      effectiveRateOnProfit: active.effectiveRateOnLAIR,
      netProfitAfterTax: active.netProfitAfterTax,
      darfRows: fiscalModel.darfRows,
      regimeComparison: fiscalModel.allRegimes.map((r) => ({
        regime: r.label,
        irpj: r.irpjDue,
        csll: r.csllDue,
        total: r.totalIRCSLL,
        recommended: r.id === fiscalModel.bestRegime.id,
      })),
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Executive Bar: Title + Regime & Scale Controls */}
      <div className="dash-card rounded-[24px] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span>{companyParams.companyName}</span>
              <span aria-hidden="true">·</span>
              <span>{scenarioName}</span>
              <span aria-hidden="true">·</span>
              <span>{scale.periodicityLabel}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Landmark className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />
              Simulador de Declaração de IR da Empresa (IRPJ &amp; CSLL)
            </h2>
            <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-3xl">
              Integrado diretamente ao LAIR da DRE e custos de produção: simule apuração via e-LALUR (Lucro Real), presunção de receita (Lucro Presumido) e fração tributária no Simples Nacional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetAdjustments}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white bg-slate-900/[0.04] dark:bg-white/[0.06] hover:bg-slate-900/[0.08] dark:hover:bg-white/[0.12] border border-slate-300/70 dark:border-white/15 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Restaurar ajustes fiscais padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold dash-cobalt-btn rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Gerar PDF oficial da apuração de IRPJ e CSLL"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Exportar Declaração PDF</span>
            </button>
          </div>
        </div>

        {/* Interactive Segmented Selectors: Tax Regime + Scale Period */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
            {(
              [
                { id: 'lucro_real', label: 'Lucro Real (e-LALUR)' },
                { id: 'lucro_presumido', label: 'Lucro Presumido' },
                { id: 'simples_nacional', label: 'Simples Nacional (Anexo II)' },
              ] as { id: TaxRegime; label: string }[]
            ).map((tab) => {
              const active = regime === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegime(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    active
                      ? 'dash-nav-pill-active font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.09]">
            {(Object.keys(SCALE_CONFIG) as ScaleMode[]).map((modeKey) => {
              const active = scaleMode === modeKey;
              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => setScaleMode(modeKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    active
                      ? 'dash-nav-pill-active font-semibold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {SCALE_CONFIG[modeKey].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Regime Comparison Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fiscalModel.allRegimes.map((item) => {
          const isSelected = item.id === regime;
          const isBest = item.id === fiscalModel.bestRegime.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRegime(item.id)}
              className={`text-left rounded-[22px] p-4 transition-all cursor-pointer border ${
                isSelected
                  ? 'dash-hero-glass text-white border-white/25'
                  : 'dash-card hover:border-slate-300 dark:hover:border-white/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-medium opacity-75">
                    {isBest ? 'Menor Carga IRPJ + CSLL' : item.shortDesc}
                  </div>
                  <div className="text-sm font-bold mt-0.5">{item.label}</div>
                </div>
                {isBest && (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  />
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-xl font-extrabold font-mono tabular-nums">
                  {formatBRL(item.totalIRCSLL)}
                </span>
                <span className="text-[11px] font-mono tabular-nums opacity-80">
                  {formatNumber(item.effectiveRateOnRevenue, 2)}% s/ Rec.
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-mono tabular-nums opacity-80">
                <span>IRPJ: {formatBRL(item.irpjDue)}</span>
                <span>CSLL: {formatBRL(item.csllDue)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split Workspace: Official ECF Calculation Sheet (7 cols) + Controls & DARF (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Structured ECF / e-LALUR Statement */}
        <div className="lg:col-span-7 dash-card rounded-[24px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-900 dark:text-white" />
                Memória Oficial de Apuração ({fiscalModel.active.label})
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {scale.periodicityLabel} · Limite Adicional 10%: {formatBRL(fiscalModel.threshold)}
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Carga Efetiva s/ LAIR
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {fiscalModel.accountingLAIR > 0
                  ? `${formatNumber(fiscalModel.active.effectiveRateOnLAIR, 2)}%`
                  : '0,00%'}
              </div>
            </div>
          </div>

          {/* Step-by-step Fiscal Ledger */}
          <div className="divide-y divide-slate-200/80 dark:divide-white/[0.07] text-xs">
            <div className="py-2.5 flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span>Receita Bruta das Ordens Faturadas (escala {scale.multiplier}x)</span>
              <span className="font-mono tabular-nums font-bold">
                {formatBRL(fiscalModel.baseGrossRevenue)}
              </span>
            </div>

            {extraRevenue > 0 && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>(+) Receitas Financeiras e Outras Receitas Operacionais</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
                  + {formatBRL(extraRevenue)}
                </span>
              </div>
            )}

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) Tributos sobre Vendas (ICMS / PIS / COFINS da DRE)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-300">
                - {formatBRL(fiscalModel.salesTaxes)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>(-) CPV Ajustado e Despesas Operacionais (Comerciais + Adm.)</span>
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-300">
                - {formatBRL(fiscalModel.adjustedCPV + fiscalModel.operatingExpenses)}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white dash-inset px-3 rounded-xl">
              <span>(=) Lucro Contábil Antes do IRPJ/CSLL (LAIR)</span>
              <span
                className={`font-mono tabular-nums text-sm ${
                  fiscalModel.accountingLAIR >= 0
                    ? 'text-slate-900 dark:text-white'
                    : 'text-rose-600 dark:text-rose-300'
                }`}
              >
                {formatBRL(fiscalModel.accountingLAIR)}
              </span>
            </div>

            {regime === 'lucro_real' && (
              <>
                <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                  <span>(+) Adições no e-LALUR (Multas, Brindes e Provisões Indedutíveis)</span>
                  <span className="font-mono tabular-nums text-amber-600 dark:text-amber-300">
                    + {formatBRL(lalurAdditions)}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                  <span>(-) Exclusões no e-LALUR (Dividendos / Depreciação Incentivada)</span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
                    - {formatBRL(lalurExclusions)}
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                  <span>
                    (-) Compensação Prejuízo Fiscal (Máx. 30%: {formatBRL(fiscalModel.maxLossOffset)})
                  </span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
                    - {formatBRL(fiscalModel.active.taxLossOffsetUsed)}
                  </span>
                </div>
              </>
            )}

            {regime === 'lucro_presumido' && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>
                  Presunção Fiscal Aplicada ({Math.round(activity.irpjRate * 100)}% IRPJ /{' '}
                  {Math.round(activity.csllRate * 100)}% CSLL)
                </span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                  Base IR: {formatBRL(fiscalModel.active.taxBaseIRPJ)}
                </span>
              </div>
            )}

            {regime === 'simples_nacional' && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>
                  Alíquota Efetiva Anexo II (RBT12 {formatBRL(fiscalModel.annualizedGross)})
                </span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatNumber(fiscalModel.active.simplesEffectiveBracketRate || 0, 2)}% (DAS{' '}
                  {formatBRL(fiscalModel.active.totalDAS || 0)})
                </span>
              </div>
            )}

            <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white bg-slate-900/[0.05] dark:bg-white/[0.08] px-3 rounded-xl border border-slate-300/70 dark:border-white/[0.15]">
              <span>(=) Base de Cálculo Tributável (IRPJ)</span>
              <span className="font-mono tabular-nums text-sm">
                {formatBRL(fiscalModel.active.taxBaseIRPJ)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
              <span>
                {regime === 'simples_nacional'
                  ? 'Parcela IRPJ embutida no DAS (Anexo II)'
                  : 'IRPJ Básico (15% sobre Base de Cálculo)'}
              </span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                {formatBRL(fiscalModel.active.irpjNormal)}
              </span>
            </div>

            {regime !== 'simples_nacional' && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>
                  Adicional de IRPJ (10% sobre excedente de {formatBRL(fiscalModel.threshold)})
                </span>
                <span className="font-mono tabular-nums font-medium text-amber-600 dark:text-amber-300">
                  + {formatBRL(fiscalModel.active.irpjAdditional)}
                </span>
              </div>
            )}

            {(fiscalModel.active.taxIncentivesUsed > 0 || fiscalModel.active.irrfApplied > 0) && (
              <div className="py-2 flex items-center justify-between text-slate-600 dark:text-zinc-300 pl-4">
                <span>(-) Deduções Legais (PAT / Lei do Bem + IRRF Retido na Fonte)</span>
                <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-300">
                  -{' '}
                  {formatBRL(
                    fiscalModel.active.taxIncentivesUsed + fiscalModel.active.irrfApplied
                  )}
                </span>
              </div>
            )}

            <div className="py-2 flex items-center justify-between font-semibold text-slate-900 dark:text-white pl-4">
              <span>(=) IRPJ Líquido a Recolher</span>
              <span className="font-mono tabular-nums">{formatBRL(fiscalModel.active.irpjDue)}</span>
            </div>

            <div className="py-2 flex items-center justify-between font-semibold text-slate-900 dark:text-white pl-4">
              <span>
                {regime === 'simples_nacional'
                  ? '(=) Parcela CSLL embutida no DAS (Anexo II)'
                  : `(=) CSLL (9% s/ ${formatBRL(fiscalModel.active.taxBaseCSLL)})`}
              </span>
              <span className="font-mono tabular-nums">{formatBRL(fiscalModel.active.csllDue)}</span>
            </div>

            <div className="py-3 flex items-center justify-between font-bold text-sm px-3.5 rounded-2xl dash-hero-glass text-white border border-white/20">
              <div>
                <span>(=) Total IRPJ + CSLL da Declaração</span>
                <span className="text-[11px] font-normal text-zinc-300 ml-2 tabular-nums">
                  ({formatNumber(fiscalModel.active.effectiveRateOnRevenue, 2)}% s/ Receita Bruta)
                </span>
              </div>
              <span className="font-mono tabular-nums text-base text-amber-300">
                {formatBRL(fiscalModel.active.totalIRCSLL)}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between font-bold text-slate-900 dark:text-white px-1">
              <span>(=) Lucro Líquido Contábil Final Pós-IRPJ/CSLL</span>
              <span
                className={`font-mono tabular-nums text-base ${
                  fiscalModel.active.netProfitAfterTax >= 0
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-300'
                }`}
              >
                {formatBRL(fiscalModel.active.netProfitAfterTax)}
              </span>
            </div>
          </div>

          {/* Alerts & Compliance Diagnostics */}
          <div className="space-y-2 pt-2">
            {fiscalModel.alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-2xl p-3 text-xs flex items-start gap-2.5 border ${
                  alert.tone === 'rose'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-200'
                    : alert.tone === 'amber'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {alert.tone === 'emerald' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{alert.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Interactive Fiscal Inputs + DARF Preview */}
        <div className="lg:col-span-5 space-y-5">
          {/* Fiscal Parameters & Adjustments Card */}
          <div className="dash-card rounded-[24px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-900 dark:text-white" />
                Parâmetros Fiscais &amp; Ajustes da Declaração
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  CNPJ Declarante
                </span>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Receitas Financeiras / Extras (R$)
                </span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={extraRevenue}
                  onChange={(e) => setExtraRevenue(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>
            </div>

            {regime === 'lucro_presumido' && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  Ramo / Percentual de Presunção (IRPJ / CSLL)
                </span>
                <div className="space-y-1.5">
                  {(Object.keys(ACTIVITY_CONFIG) as PresumedActivity[]).map((actKey) => {
                    const active = presumedActivity === actKey;
                    const cfg = ACTIVITY_CONFIG[actKey];
                    return (
                      <button
                        key={actKey}
                        type="button"
                        onClick={() => setPresumedActivity(actKey)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                          active
                            ? 'dash-nav-pill-active font-semibold'
                            : 'dash-inset text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-white/25'
                        }`}
                      >
                        <div className="font-semibold">{cfg.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{cfg.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {regime === 'lucro_real' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                      (+) Adições LALUR (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      value={lalurAdditions}
                      onChange={(e) => setLalurAdditions(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                      (-) Exclusões LALUR (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={250}
                      value={lalurExclusions}
                      onChange={(e) => setLalurExclusions(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-600 dark:text-zinc-400">
                      Prejuízo Fiscal Acumulado (Trava 30%)
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatBRL(priorTaxLosses)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(50000, Math.round(Math.abs(fiscalModel.accountingLAIR) * 1.5))}
                    step={500}
                    value={priorTaxLosses}
                    onChange={(e) => setPriorTaxLosses(Number(e.target.value))}
                    className="w-full accent-slate-900 dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                      Incentivos PAT / Lei do Bem (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={patIncentive}
                      onChange={(e) => setPatIncentive(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                      IRRF Retido na Fonte (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={irrfWithheld}
                      onChange={(e) => setIrrfWithheld(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    />
                  </label>
                </div>
              </div>
            )}

            {regime === 'lucro_presumido' && (
              <label className="space-y-1 block pt-1">
                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block">
                  IRRF Retido na Fonte sobre Notas / Aplicações (R$)
                </span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={irrfWithheld}
                  onChange={(e) => setIrrfWithheld(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.14] text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                />
              </label>
            )}
          </div>

          {/* DARF Schedule & Tax Optimization Card */}
          <div className="dash-card rounded-[24px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-900 dark:text-white" />
                Guias DARF / Arrecadação Prevista
              </h4>
            </div>

            <div className="space-y-2.5">
              {fiscalModel.darfRows.map((row) => (
                <div
                  key={row.code}
                  className="dash-inset rounded-2xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Cód. {row.code} · {row.tax}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Vencimento: {row.dueDate}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatBRL(row.amount)}
                  </div>
                </div>
              ))}
            </div>

            {/* Planning Summary Box */}
            <div className="dash-inset rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Economia Tributária Potencial
                </span>
                <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-300">
                  {fiscalModel.potentialSavingsVsActive > 0
                    ? `- ${formatBRL(fiscalModel.potentialSavingsVsActive)}`
                    : 'Regime Ótimo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                {fiscalModel.potentialSavingsVsActive > 0
                  ? `Migrar para ${fiscalModel.bestRegime.label} reduziria o total de IRPJ + CSLL de ${formatBRL(fiscalModel.active.totalIRCSLL)} para ${formatBRL(fiscalModel.bestRegime.totalIRCSLL)} nesta escala.`
                  : `Entre os regimes elegíveis, ${fiscalModel.bestRegime.label} gera economia máxima de ${formatBRL(fiscalModel.savingsVsWorst)} frente à opção mais onerosa.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
