import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AlertTriangle,
  Box,
  Compass,
  Eye,
  FileSpreadsheet,
  Flame,
  Layers,
  Maximize2,
  MousePointerClick,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  CIFCategory,
  CIFConfiguration,
  CompanyParameters,
  IndirectCostItem,
  OrderCostSummary,
  ProductionOrder,
} from '../types/costing';
import {
  calculateAllOrdersCosts,
  calculateInventoryBalances,
  formatBRL,
  formatNumber,
  generateConsolidatedDRE,
} from '../utils/costCalculations';
import { CIF_CATEGORY_LABELS } from '../utils/pdfExport';
import { AppTab } from './Header';

export type Chart3DMode = 'orders' | 'cif_inventory' | 'dre_waterfall';
type CameraPreset = 'iso' | 'front' | 'side' | 'top';

interface InventorySnapshot {
  finalRawMaterials: number;
  finalWIP: number;
  finalFinishedGoods: number;
  baseCPV: number;
  wipOrdersCount: number;
  finishedOrdersCount: number;
  invoicedOrdersCount: number;
}

interface DRESnapshot {
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
}

export interface Dashboard3DChartsViewProps {
  theme: 'light' | 'dark';
  scenarioName: string;
  companyParams: CompanyParameters;
  orders: ProductionOrder[];
  summaries: Record<string, OrderCostSummary>;
  cifItems: IndirectCostItem[];
  cifConfig: CIFConfiguration;
  totalActualCIF: number;
  totalAppliedCIF: number;
  totalMD: number;
  totalMOD: number;
  totalManufacturingCost: number;
  inventoryBalances: InventorySnapshot;
  dre: DRESnapshot;
  onOpenCostSheet: (order: ProductionOrder) => void;
  onNavigateTab: (tab: AppTab) => void;
}

interface SimulationParams {
  id: string;
  label: string;
  mdPct: number;
  modPct: number;
  cifPct: number;
  pricePct: number;
  volumePct: number;
  taxDeltaPP: number;
}

interface SimulationPreset {
  id: string;
  label: string;
  tag: string;
  tone: 'neutral' | 'warning' | 'danger' | 'positive';
  description: string;
  params: Omit<SimulationParams, 'id' | 'label'>;
}

const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'base',
    label: 'Base Atual',
    tag: 'Real',
    tone: 'neutral',
    description: 'Valores reais atuais sem choques ou projeções.',
    params: { mdPct: 0, modPct: 0, cifPct: 0, pricePct: 0, volumePct: 0, taxDeltaPP: 0 },
  },
  {
    id: 'raw_shock',
    label: 'Choque de Insumos',
    tag: '+25% MD',
    tone: 'warning',
    description: 'Alta cambial e escassez elevando custos de Matéria-Prima em +25%.',
    params: { mdPct: 25, modPct: 0, cifPct: 5, pricePct: 0, volumePct: 0, taxDeltaPP: 0 },
  },
  {
    id: 'labor_surge',
    label: 'Dissídio & Hora Extra',
    tag: '+18% MOD',
    tone: 'warning',
    description: 'Reajuste salarial e turnos extras para cumprir prazos das OPs.',
    params: { mdPct: 0, modPct: 18, cifPct: 8, pricePct: 0, volumePct: 0, taxDeltaPP: 0 },
  },
  {
    id: 'energy_idle',
    label: 'Crise Energética & Ociosidade',
    tag: '+30% CIF / -20% Vol.',
    tone: 'danger',
    description: 'Bandeira tarifária crítica somada à retração de 20% na produção.',
    params: { mdPct: 5, modPct: 0, cifPct: 30, pricePct: -5, volumePct: -20, taxDeltaPP: 0 },
  },
  {
    id: 'growth_scale',
    label: 'Expansão Otimista',
    tag: '+25% Vol. / +8% Preço',
    tone: 'positive',
    description: 'Aumento de demanda diluindo o CIF fixo com recomposição de preço.',
    params: { mdPct: -4, modPct: 0, cifPct: 4, pricePct: 8, volumePct: 25, taxDeltaPP: 0 },
  },
  {
    id: 'severe_stress',
    label: 'Estresse Severo',
    tag: 'Crise Combinada',
    tone: 'danger',
    description: 'Estagflação: insumos (+20%), MOD (+12%), CIF (+25%), preço (-10%) e +3 p.p. tributos.',
    params: { mdPct: 20, modPct: 12, cifPct: 25, pricePct: -10, volumePct: -15, taxDeltaPP: 3 },
  },
];

interface InspectedDatum {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentHex: string;
  primaryLabel: string;
  primaryValue: number;
  baseValue?: number;
  metrics: { label: string; value: string; colorClass?: string }[];
  orderId?: string;
  targetTab?: AppTab;
}

interface InteractiveBarRecord {
  id: string;
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
  baseEmissive: number[];
  datum: InspectedDatum;
  focusX: number;
  focusZ: number;
}

interface ThreeEngineContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  chartGroup: THREE.Group;
  selectionRing: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  plinthMesh: THREE.Mesh;
  gridMesh: THREE.GridHelper;
  isSoftwareGl: boolean;
  prefersReducedMotion: boolean;
  records: InteractiveBarRecord[];
  hitMeshesAll: THREE.Mesh[];
  chartDisposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const rendererName = String(
        gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''
      );
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName)) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function afterDraw(gl: WebGLRenderingContext | WebGL2RenderingContext | null, fn: () => void) {
  const gl2 = gl as WebGL2RenderingContext | null;
  if (!gl2 || typeof gl2.fenceSync !== 'function') {
    requestAnimationFrame(fn);
    return;
  }
  const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) {
    requestAnimationFrame(fn);
    return;
  }
  gl2.flush();
  const check = () => {
    const status = gl2.clientWaitSync(sync, 0, 0);
    if (status === gl2.TIMEOUT_EXPIRED) {
      setTimeout(check, 16);
    } else {
      gl2.deleteSync(sync);
      fn();
    }
  };
  setTimeout(check, 0);
}

function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const w = width / 2;
  const d = depth / 2;
  const r = Math.min(radius, w * 0.45, d * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);
  return shape;
}

function createBeveledColumnGeometry(
  width: number,
  height: number,
  depth: number,
  bevel = 0.05
): THREE.BufferGeometry {
  const safeHeight = Math.max(0.06, height);
  const shape = createRoundedRectShape(width, depth, Math.min(0.14, width * 0.22));
  const extrudeDepth = Math.max(0.02, safeHeight - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    geo.translate(0, -geo.boundingBox.min.y, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

function createPlaqueTexture(
  title: string,
  subtitle: string,
  isDark: boolean,
  accentColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDark ? 'rgba(14, 15, 22, 0.9)' : 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.14)';
    ctx.lineWidth = 4;

    const r = 28;
    const x = 12;
    const y = 12;
    const w = canvas.width - 24;
    const h = canvas.height - 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 22, y + 32, 10, h - 64);

    ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
    ctx.font = '700 44px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.slice(0, 16), x + 50, y + 58);

    ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
    ctx.font = '600 28px "JetBrains Mono", monospace';
    ctx.fillText(subtitle.slice(0, 22), x + 50, y + 108);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  iso: { pos: [9.8, 7.6, 11.4], target: [0, 1.4, 0] },
  front: { pos: [0.2, 4.4, 13.6], target: [0, 1.8, 0] },
  side: { pos: [13.5, 4.8, 0.5], target: [0, 1.8, 0] },
  top: { pos: [0.01, 14.5, 3.6], target: [0, 0, 0] },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  em_elaboracao: 'Em Elaboração (PeE)',
  encerrada: 'Encerrada (PA)',
  faturada: 'Faturada (CPV)',
};

export function Dashboard3DChartsView({
  theme,
  scenarioName,
  companyParams,
  orders,
  summaries,
  cifItems,
  cifConfig,
  totalActualCIF,
  totalAppliedCIF,
  totalMD,
  totalMOD,
  totalManufacturingCost,
  inventoryBalances,
  dre,
  onOpenCostSheet,
  onNavigateTab,
}: Dashboard3DChartsViewProps) {
  const [chartMode, setChartMode] = useState<Chart3DMode>('orders');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  // Simulation state (What-If / Future & Adverse Scenarios)
  const [simOpen, setSimOpen] = useState(true);
  const [simParams, setSimParams] = useState<SimulationParams>({
    id: 'base',
    label: 'Base Atual',
    mdPct: 0,
    modPct: 0,
    cifPct: 0,
    pricePct: 0,
    volumePct: 0,
    taxDeltaPP: 0,
  });

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThreeEngineContext | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const autoRotateRef = useRef<boolean>(false);
  const presetTargetRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(...CAMERA_PRESETS.iso.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.iso.target),
    active: false,
  });

  const isDark = theme === 'dark';

  const hasSimulation =
    simParams.mdPct !== 0 ||
    simParams.modPct !== 0 ||
    simParams.cifPct !== 0 ||
    simParams.pricePct !== 0 ||
    simParams.volumePct !== 0 ||
    simParams.taxDeltaPP !== 0;

  // Apply non-destructive What-If parametric simulation through real Brazilian Cost Accounting formulas
  const simulatedAccounting = useMemo(() => {
    if (!hasSimulation) {
      return {
        orders,
        summaries,
        cifItems,
        totalActualCIF,
        totalAppliedCIF,
        totalMD,
        totalMOD,
        totalManufacturingCost,
        inventoryBalances,
        dre,
      };
    }

    const mdFactor = Math.max(0.1, 1 + simParams.mdPct / 100);
    const modFactor = Math.max(0.1, 1 + simParams.modPct / 100);
    const cifFactor = Math.max(0.1, 1 + simParams.cifPct / 100);
    const priceFactor = Math.max(0.1, 1 + simParams.pricePct / 100);
    const volFactor = Math.max(0.2, 1 + simParams.volumePct / 100);

    const simOrders: ProductionOrder[] = orders.map((op) => ({
      ...op,
      quantity: Math.max(1, Math.round(op.quantity * volFactor)),
      machineHours: Number((op.machineHours * volFactor).toFixed(2)),
      sellingPriceUnit:
        op.sellingPriceUnit !== undefined
          ? Number((op.sellingPriceUnit * priceFactor).toFixed(2))
          : undefined,
      taxRatePercent: Math.max(
        0,
        Math.min(45, (op.taxRatePercent ?? companyParams.standardTaxRate) + simParams.taxDeltaPP)
      ),
      materials: (op.materials || []).map((m) => ({
        ...m,
        quantity: m.quantity * volFactor,
        unitCost: m.unitCost * mdFactor,
        totalCost: m.totalCost * mdFactor * volFactor,
      })),
      labor: (op.labor || []).map((l) => ({
        ...l,
        hours: l.hours * volFactor,
        hourlyRate: l.hourlyRate * modFactor,
        totalCost: l.totalCost * modFactor * volFactor,
      })),
    }));

    const simCifItems: IndirectCostItem[] = cifItems.map((item) => ({
      ...item,
      amount: item.amount * cifFactor,
    }));

    const simCifAnalysis = calculateAllOrdersCosts(simOrders, simCifItems, cifConfig);
    const simTotalMD = Object.values(simCifAnalysis.summaries).reduce((a, s) => a + s.totalMD, 0);
    const simTotalMOD = Object.values(simCifAnalysis.summaries).reduce((a, s) => a + s.totalMOD, 0);
    const simTotalMfg = Object.values(simCifAnalysis.summaries).reduce(
      (a, s) => a + s.totalManufacturingCost,
      0
    );
    const simInv = calculateInventoryBalances(
      simOrders,
      simCifAnalysis.summaries,
      companyParams,
      simTotalMD
    );
    const simDre = generateConsolidatedDRE(
      simOrders,
      simCifAnalysis.summaries,
      simCifAnalysis.cifVariance,
      companyParams
    );

    return {
      orders: simOrders,
      summaries: simCifAnalysis.summaries,
      cifItems: simCifItems,
      totalActualCIF: simCifAnalysis.totalActualCIF,
      totalAppliedCIF: simCifAnalysis.totalAppliedCIF,
      totalMD: simTotalMD,
      totalMOD: simTotalMOD,
      totalManufacturingCost: simTotalMfg,
      inventoryBalances: simInv,
      dre: simDre,
    };
  }, [
    hasSimulation,
    simParams,
    orders,
    summaries,
    cifItems,
    cifConfig,
    companyParams,
    totalActualCIF,
    totalAppliedCIF,
    totalMD,
    totalMOD,
    totalManufacturingCost,
    inventoryBalances,
    dre,
  ]);

  // Compute Adverse Situation Risk Alerts when simulating
  const simulationAlerts = useMemo(() => {
    if (!hasSimulation) return [];
    const alerts: string[] = [];

    if (simulatedAccounting.dre.operatingProfit < 0) {
      alerts.push(
        `Prejuízo operacional (LAJIR negativo de ${formatBRL(simulatedAccounting.dre.operatingProfit)})`
      );
    } else if (
      dre.operatingProfit > 0 &&
      simulatedAccounting.dre.operatingProfit < dre.operatingProfit * 0.65
    ) {
      alerts.push('Compressão severa de LAJIR (>35% de queda frente à base)');
    }

    const exceededOrders = simulatedAccounting.orders.filter((op) => {
      const s = simulatedAccounting.summaries[op.id];
      const stipulated = (op.sellingPriceUnit || 0) * op.quantity;
      return stipulated > 0 && (s?.totalManufacturingCost || 0) > stipulated;
    });
    if (exceededOrders.length > 0) {
      alerts.push(
        `${exceededOrders.map((o) => o.code).join(', ')} com custo acima do preço de venda`
      );
    }

    if (simulatedAccounting.inventoryBalances.finalRawMaterials < 0) {
      alerts.push(
        `Ruptura de estoque de Matéria-Prima (${formatBRL(simulatedAccounting.inventoryBalances.finalRawMaterials)})`
      );
    }

    return alerts;
  }, [hasSimulation, simulatedAccounting, dre.operatingProfit]);

  // Compute dataset descriptors for the 3D scene & selection strip
  const modeDataset = useMemo(() => {
    const sim = simulatedAccounting;

    if (chartMode === 'orders') {
      const items = sim.orders.map((order) => {
        const s = sim.summaries[order.id];
        const baseSummary = summaries[order.id];
        const md = s?.totalMD ?? 0;
        const mod = s?.totalMOD ?? 0;
        const cif = s?.cifAllocated ?? 0;
        const total = s?.totalManufacturingCost ?? 0;
        const baseTotal = baseSummary?.totalManufacturingCost ?? total;
        const revenue = s?.revenue ?? 0;
        const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
        const isOverCost = revenue > 0 && total > revenue;
        const accentHex = isOverCost
          ? '#EF4444'
          : order.status === 'faturada'
          ? '#10B981'
          : order.status === 'encerrada'
          ? '#3B82F6'
          : '#F59E0B';

        const deltaTotal = total - baseTotal;
        const metrics = [
          { label: 'Material Direto (MD)', value: formatBRL(md), colorClass: 'text-blue-500 dark:text-blue-400' },
          { label: 'Mão de Obra Direta (MOD)', value: formatBRL(mod), colorClass: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'CIF Rateado', value: formatBRL(cif), colorClass: 'text-amber-600 dark:text-amber-400' },
          { label: 'Custo Unitário', value: `${formatBRL(s?.unitCost ?? 0)} / ${order.unit}` },
          {
            label: revenue > 0 ? 'Receita / Preço Estipulado' : 'Quantidade do Lote',
            value: revenue > 0 ? formatBRL(revenue) : `${formatNumber(order.quantity, 0)} ${order.unit}`,
            colorClass: isOverCost
              ? 'text-rose-600 dark:text-rose-400'
              : revenue > 0
              ? 'text-violet-600 dark:text-violet-400'
              : undefined,
          },
        ];

        if (hasSimulation) {
          metrics.push({
            label: 'Impacto vs. Base Atual',
            value: `${deltaTotal >= 0 ? '+' : ''}${formatBRL(deltaTotal)}`,
            colorClass:
              deltaTotal > 0.01
                ? 'text-rose-600 dark:text-rose-400'
                : deltaTotal < -0.01
                ? 'text-emerald-600 dark:text-emerald-400'
                : undefined,
          });
        }

        const datum: InspectedDatum = {
          id: `op-${order.id}`,
          title: `${order.code} · ${order.clientName}`,
          subtitle: order.productDescription,
          badge: hasSimulation ? `${statusLabel} · Simulado` : statusLabel,
          accentHex,
          primaryLabel: hasSimulation ? 'Custo Fabril Simulado' : 'Custo Fabril Acumulado',
          primaryValue: total,
          baseValue: baseTotal,
          orderId: order.id,
          targetTab: 'orders',
          metrics,
        };

        return {
          id: datum.id,
          shortLabel: order.code,
          subValueLabel: formatBRL(total),
          md,
          mod,
          cif,
          total,
          baseTotal,
          revenue,
          accentHex,
          datum,
        };
      });

      const maxVal = Math.max(
        1,
        ...items.map((i) => Math.max(i.total, i.baseTotal, i.revenue))
      );

      return { mode: 'orders' as const, items, maxVal };
    }

    if (chartMode === 'cif_inventory') {
      const baseCatTotals = new Map<CIFCategory, number>();
      cifItems.forEach((item) => {
        baseCatTotals.set(item.category, (baseCatTotals.get(item.category) ?? 0) + (item.amount || 0));
      });

      const catTotals = new Map<CIFCategory, number>();
      sim.cifItems.forEach((item) => {
        catTotals.set(item.category, (catTotals.get(item.category) ?? 0) + (item.amount || 0));
      });

      const cifNodes = Array.from(catTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amount]) => {
          const baseAmount = baseCatTotals.get(cat) ?? amount;
          const share = sim.totalActualCIF > 0 ? (amount / sim.totalActualCIF) * 100 : 0;
          const label = CIF_CATEGORY_LABELS[cat] || cat;
          const datum: InspectedDatum = {
            id: `cif-${cat}`,
            title: label,
            subtitle: 'Agrupamento de Custo Indireto (CIF)',
            badge: hasSimulation ? 'Categoria CIF · Simulado' : 'Categoria CIF',
            accentHex: '#F59E0B',
            primaryLabel: 'Total Incorrido no Período',
            primaryValue: amount,
            baseValue: baseAmount,
            targetTab: 'cif',
            metrics: [
              { label: 'Participação no CIF Real', value: `${formatNumber(share, 1)}%`, colorClass: 'text-amber-600 dark:text-amber-400' },
              { label: 'CIF Total Real', value: formatBRL(sim.totalActualCIF) },
              { label: 'CIF Aplicado às OPs', value: formatBRL(sim.totalAppliedCIF) },
            ],
          };
          return {
            id: datum.id,
            shortLabel: label.split(' ')[0],
            subValueLabel: formatBRL(amount),
            value: amount,
            baseValue: baseAmount,
            accentHex: '#F59E0B',
            groupType: 'cif' as const,
            datum,
          };
        });

      const invEntries: {
        id: string;
        short: string;
        title: string;
        sub: string;
        val: number;
        baseVal: number;
        accent: string;
        tab: AppTab;
        extra: string;
      }[] = [
        {
          id: 'inv-mp',
          short: 'MP Final',
          title: 'Estoque de Matéria-Prima',
          sub: 'Saldo remanescente após requisições (RMA)',
          val: Math.max(0, sim.inventoryBalances.finalRawMaterials),
          baseVal: Math.max(0, inventoryBalances.finalRawMaterials),
          accent: sim.inventoryBalances.finalRawMaterials < 0 ? '#EF4444' : '#38BDF8',
          tab: 'taccounts',
          extra: `SI: ${formatBRL(companyParams.initialRawMaterials)}`,
        },
        {
          id: 'inv-pee',
          short: 'Em Elab.',
          title: 'Produtos em Elaboração (PeE)',
          sub: 'Custos retidos em ordens ativas na fábrica',
          val: sim.inventoryBalances.finalWIP,
          baseVal: inventoryBalances.finalWIP,
          accent: '#F59E0B',
          tab: 'orders',
          extra: `${sim.inventoryBalances.wipOrdersCount} OP(s) em curso`,
        },
        {
          id: 'inv-pa',
          short: 'Acabados',
          title: 'Produtos Acabados (PA)',
          sub: 'Ordens encerradas aguardando faturamento',
          val: sim.inventoryBalances.finalFinishedGoods,
          baseVal: inventoryBalances.finalFinishedGoods,
          accent: '#3B82F6',
          tab: 'orders',
          extra: `${sim.inventoryBalances.finishedOrdersCount} OP(s) encerrada(s)`,
        },
        {
          id: 'inv-cpv',
          short: 'CPV',
          title: 'Custo dos Produtos Vendidos',
          sub: 'Baixa para resultado das ordens faturadas',
          val: sim.inventoryBalances.baseCPV,
          baseVal: inventoryBalances.baseCPV,
          accent: '#10B981',
          tab: 'dre',
          extra: `${sim.inventoryBalances.invoicedOrdersCount} OP(s) faturada(s)`,
        },
      ];

      const invNodes = invEntries.map((inv) => {
        const datum: InspectedDatum = {
          id: inv.id,
          title: inv.title,
          subtitle: inv.sub,
          badge: hasSimulation ? 'Fluxo CPC 16 · Simulado' : 'Fluxo CPC 16',
          accentHex: inv.accent,
          primaryLabel: 'Saldo Patrimonial / Fluxo',
          primaryValue: inv.val,
          baseValue: inv.baseVal,
          targetTab: inv.tab,
          metrics: [
            { label: 'Detalhamento', value: inv.extra },
            { label: 'Custo Fabril do Período', value: formatBRL(sim.totalManufacturingCost) },
            { label: 'MD + MOD Consumidos', value: formatBRL(sim.totalMD + sim.totalMOD) },
          ],
        };
        return {
          id: inv.id,
          shortLabel: inv.short,
          subValueLabel: formatBRL(inv.val),
          value: inv.val,
          baseValue: inv.baseVal,
          accentHex: inv.accent,
          groupType: 'inv' as const,
          datum,
        };
      });

      const items = [...cifNodes, ...invNodes];
      const maxVal = Math.max(1, ...items.map((i) => Math.max(i.value, i.baseValue)));
      return { mode: 'cif_inventory' as const, items, maxVal };
    }

    // Mode 3: DRE Waterfall
    const dreSteps: {
      id: string;
      short: string;
      title: string;
      sub: string;
      value: number;
      baseVal: number;
      baseOffset: number;
      accent: string;
      kind: string;
    }[] = [
      {
        id: 'dre-rec-bruta',
        short: 'Rec. Bruta',
        title: 'Receita Bruta de Vendas',
        sub: `${sim.dre.invoicedCount} ordem(ns) faturada(s) no período`,
        value: sim.dre.grossRevenue,
        baseVal: dre.grossRevenue,
        baseOffset: 0,
        accent: '#3B82F6',
        kind: 'Entrada',
      },
      {
        id: 'dre-tributos',
        short: '(-) Trib.',
        title: '(-) Tributos sobre Vendas',
        sub: 'ICMS, PIS e COFINS incidentes',
        value: sim.dre.salesTaxes,
        baseVal: dre.salesTaxes,
        baseOffset: Math.max(0, sim.dre.netRevenue),
        accent: '#F43F5E',
        kind: 'Dedução',
      },
      {
        id: 'dre-rec-liq',
        short: 'Rec. Líq.',
        title: '(=) Receita Líquida',
        sub: 'Base efetiva de receita operacional',
        value: sim.dre.netRevenue,
        baseVal: dre.netRevenue,
        baseOffset: 0,
        accent: '#38BDF8',
        kind: 'Subtotal',
      },
      {
        id: 'dre-cpv',
        short: '(-) CPV',
        title: '(-) CPV Ajustado',
        sub: `CPV base ${formatBRL(sim.dre.baseCPV)} + variação CIF`,
        value: sim.dre.adjustedCPV,
        baseVal: dre.adjustedCPV,
        baseOffset: Math.max(0, sim.dre.grossProfit),
        accent: '#F59E0B',
        kind: 'Custo Fabril',
      },
      {
        id: 'dre-lucro-bruto',
        short: 'Lucro Bruto',
        title: '(=) Lucro Bruto',
        sub: `Margem bruta de ${formatNumber(sim.dre.grossMarginPercent, 1)}%`,
        value: Math.max(0, sim.dre.grossProfit),
        baseVal: Math.max(0, dre.grossProfit),
        baseOffset: 0,
        accent: sim.dre.grossProfit >= 0 ? '#10B981' : '#EF4444',
        kind: 'Margem',
      },
      {
        id: 'dre-desp',
        short: '(-) Desp.',
        title: '(-) Despesas Operacionais',
        sub: 'Comerciais + Administrativas do período',
        value: sim.dre.totalOperatingExpenses,
        baseVal: dre.totalOperatingExpenses,
        baseOffset: Math.max(0, sim.dre.operatingProfit),
        accent: '#FB7185',
        kind: 'Despesa',
      },
      {
        id: 'dre-lajir',
        short: 'LAJIR',
        title: '(=) Resultado Operacional (LAJIR)',
        sub: `Margem operacional de ${formatNumber(sim.dre.operatingMarginPercent, 1)}%`,
        value: Math.abs(sim.dre.operatingProfit),
        baseVal: Math.abs(dre.operatingProfit),
        baseOffset: 0,
        accent: sim.dre.operatingProfit >= 0 ? '#10B981' : '#EF4444',
        kind: sim.dre.operatingProfit >= 0 ? 'Lucro' : 'Prejuízo',
      },
    ];

    const items = dreSteps.map((step) => {
      const rawValue = step.id === 'dre-lajir' ? sim.dre.operatingProfit : step.value;
      const rawBaseValue = step.id === 'dre-lajir' ? dre.operatingProfit : step.baseVal;
      const datum: InspectedDatum = {
        id: step.id,
        title: step.title,
        subtitle: step.sub,
        badge: hasSimulation ? `${step.kind} · Simulado` : step.kind,
        accentHex: step.accent,
        primaryLabel: 'Valor Apurado na DRE',
        primaryValue: rawValue,
        baseValue: rawBaseValue,
        targetTab: 'dre',
        metrics: [
          { label: 'Receita Líquida', value: formatBRL(sim.dre.netRevenue) },
          {
            label: 'Margem Bruta',
            value: `${formatNumber(sim.dre.grossMarginPercent, 1)}%`,
            colorClass:
              sim.dre.grossMarginPercent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400',
          },
          {
            label: 'Margem Operacional',
            value: `${formatNumber(sim.dre.operatingMarginPercent, 1)}%`,
            colorClass:
              sim.dre.operatingMarginPercent >= 0
                ? undefined
                : 'text-rose-600 dark:text-rose-400',
          },
        ],
      };

      return {
        id: step.id,
        shortLabel: step.short,
        subValueLabel: formatBRL(rawValue),
        value: step.value,
        baseValue: step.baseVal,
        baseOffset: step.baseOffset,
        accentHex: step.accent,
        datum,
      };
    });

    const maxVal = Math.max(
      1,
      sim.dre.grossRevenue,
      dre.grossRevenue,
      ...items.map((i) => Math.max(i.value + i.baseOffset, i.baseValue))
    );
    return { mode: 'dre_waterfall' as const, items, maxVal };
  }, [
    chartMode,
    simulatedAccounting,
    summaries,
    cifItems,
    inventoryBalances,
    companyParams.initialRawMaterials,
    dre,
    hasSimulation,
  ]);

  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    presetTargetRef.current = {
      pos: new THREE.Vector3(...cfg.pos),
      target: new THREE.Vector3(...cfg.target),
      active: true,
    };
  };

  useEffect(() => {
    const exists = modeDataset.items.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(modeDataset.items[0]?.id ?? null);
    }
  }, [modeDataset, selectedId]);

  const activeDatum: InspectedDatum | null = useMemo(() => {
    const targetId = hoveredId ?? selectedId ?? modeDataset.items[0]?.id ?? null;
    if (!targetId) return null;
    const found = modeDataset.items.find((i) => i.id === targetId);
    return found?.datum ?? null;
  }, [hoveredId, selectedId, modeDataset]);

  // 1) Persistent Three.js Renderer, Scene, RoomEnvironment & OrbitControls (rebuilt only on theme change)
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    const initialWidth = Math.max(320, mount.clientWidth || 800);
    const initialHeight = Math.max(340, mount.clientHeight || 460);

    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.06 : 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = isDark ? 0x07090f : 0xf1f4fa;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isDark ? 0.021 : 0.015);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(42, initialWidth / initialHeight, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.iso.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.iso.target);
    controls.enableDamping = !isSoftwareGl && !prefersReducedMotion;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5.5;
    controls.maxDistance = 28;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = !isSoftwareGl && !prefersReducedMotion && autoRotateRef.current;
    controls.autoRotateSpeed = 0.75;

    const onControlStart = () => {
      presetTargetRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(
      isDark ? 0xdbeafe : 0xffffff,
      isDark ? 0x111827 : 0xcbd5e1,
      isDark ? 0.85 : 1.05
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, isDark ? 2.1 : 1.9);
    keyLight.position.set(9, 14, 10);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 36;
      const d = 12;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, isDark ? 1.15 : 0.65);
    rimLight.position.set(-10, 8, -9);
    scene.add(rimLight);

    // Architectural Stage Plinth
    const stageWidth = 24;
    const stageDepth = 9.2;
    const plinthShape = createRoundedRectShape(stageWidth, stageDepth, 0.55);
    const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    plinthGeo.rotateX(-Math.PI / 2);
    plinthGeo.translate(0, -0.28, 0);
    plinthGeo.computeVertexNormals();

    const plinthMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x111521 : 0xe2e8f0,
      roughness: 0.42,
      metalness: 0.28,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.receiveShadow = !isSoftwareGl;
    scene.add(plinthMesh);

    const gridMesh = new THREE.GridHelper(
      24,
      24,
      isDark ? 0x3b82f6 : 0x64748b,
      isDark ? 0x1e293b : 0xcbd5e1
    );
    gridMesh.position.y = 0.004;
    const gridMats = Array.isArray(gridMesh.material)
      ? gridMesh.material
      : [gridMesh.material];
    gridMats.forEach((gm) => {
      gm.transparent = true;
      gm.opacity = isDark ? 0.34 : 0.45;
    });
    scene.add(gridMesh);

    const maxBarHeight = 5.4;
    const guideGeos: THREE.BufferGeometry[] = [];
    const guideMats: THREE.LineBasicMaterial[] = [];
    [0.25, 0.5, 0.75, 1.0].forEach((frac) => {
      const y = frac * maxBarHeight;
      const pts = [
        new THREE.Vector3(-stageWidth / 2 + 1.2, y, -stageDepth / 2 + 0.7),
        new THREE.Vector3(stageWidth / 2 - 1.2, y, -stageDepth / 2 + 0.7),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: isDark ? 0x334155 : 0x94a3b8,
        transparent: true,
        opacity: 0.45,
      });
      guideGeos.push(lineGeo);
      guideMats.push(lineMat);
      scene.add(new THREE.Line(lineGeo, lineMat));
    });

    const ringGeo = new THREE.RingGeometry(0.78, 0.92, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.position.y = 0.015;
    selectionRing.visible = false;
    scene.add(selectionRing);

    const chartGroup = new THREE.Group();
    scene.add(chartGroup);

    const ctx: ThreeEngineContext = {
      renderer,
      scene,
      camera,
      controls,
      chartGroup,
      selectionRing,
      ringMat,
      plinthMesh,
      gridMesh,
      isSoftwareGl,
      prefersReducedMotion,
      records: [],
      hitMeshesAll: [],
      chartDisposables: {
        geometries: [],
        materials: [],
        textures: [],
      },
    };
    engineRef.current = ctx;

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const updateNDC = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickRecordId = (): string | null => {
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(ctx.hitMeshesAll, false);
      if (hits.length > 0) {
        return (hits[0].object.userData.recordId as string) || null;
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 35) return;
      lastHoverCheck = now;
      updateNDC(e);
      const hitId = pickRecordId();
      if (hitId !== hoveredIdRef.current) {
        hoveredIdRef.current = hitId;
        setHoveredId(hitId);
        renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);
      updateNDC(e);
      const hitId = pickRecordId();
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      if (dist < 6 && hitId) {
        selectedIdRef.current = hitId;
        setSelectedId(hitId);
      }
    };

    const onPointerLeave = () => {
      hoveredIdRef.current = null;
      setHoveredId(null);
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width));
        const h = Math.max(340, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mount);

    let contextIsLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextIsLost = true;
      setContextLost(true);
    };
    const onContextRestored = () => {
      contextIsLost = false;
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    let disposed = false;
    let rafId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;

      if (!contextIsLost) {
        const dt = Math.min(0.05, clock.getDelta() || 0.016);

        if (presetTargetRef.current.active) {
          const factor = isSoftwareGl || prefersReducedMotion ? 1 : 6.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, presetTargetRef.current.pos.x, factor, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, presetTargetRef.current.pos.y, factor, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, presetTargetRef.current.pos.z, factor, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, presetTargetRef.current.target.x, factor, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, presetTargetRef.current.target.y, factor, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, presetTargetRef.current.target.z, factor, dt);
          if (
            camera.position.distanceTo(presetTargetRef.current.pos) < 0.04 &&
            controls.target.distanceTo(presetTargetRef.current.target) < 0.04
          ) {
            presetTargetRef.current.active = false;
          }
        }

        controls.autoRotate = !isSoftwareGl && !prefersReducedMotion && autoRotateRef.current;
        controls.update();

        const activeTargetId = hoveredIdRef.current ?? selectedIdRef.current;
        let ringVisible = false;

        ctx.records.forEach((rec) => {
          const isHighlighted = rec.id === activeTargetId;
          const isHovered = rec.id === hoveredIdRef.current;

          if (!isSoftwareGl && !prefersReducedMotion) {
            rec.group.scale.y = THREE.MathUtils.damp(rec.group.scale.y, isHighlighted ? 1.035 : 1, 10, dt);
          } else {
            rec.group.scale.y = isHighlighted ? 1.035 : 1;
          }

          rec.materials.forEach((mat, idx) => {
            const base = rec.baseEmissive[idx] ?? 0;
            if (base > 0) {
              const targetEmissive = isHovered ? base + 0.34 : isHighlighted ? base + 0.2 : base;
              mat.emissiveIntensity = isSoftwareGl
                ? targetEmissive
                : THREE.MathUtils.damp(mat.emissiveIntensity, targetEmissive, 10, dt);
            }
          });

          if (isHighlighted) {
            ringVisible = true;
            selectionRing.position.x = rec.focusX;
            selectionRing.position.z = rec.focusZ;
            ringMat.color.set(rec.datum.accentHex);
          }
        });

        selectionRing.visible = ringVisible;
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(renderer.getContext(), tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();

      ctx.chartDisposables.geometries.forEach((g) => g.dispose());
      ctx.chartDisposables.materials.forEach((m) => m.dispose());
      ctx.chartDisposables.textures.forEach((t) => t.dispose());

      plinthGeo.dispose();
      plinthMat.dispose();
      gridMesh.geometry.dispose();
      gridMats.forEach((gm) => gm.dispose());
      guideGeos.forEach((g) => g.dispose());
      guideMats.forEach((m) => m.dispose());
      ringGeo.dispose();
      ringMat.dispose();
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      engineRef.current = null;
      mount.innerHTML = '';
    };
  }, [isDark]);

  // 2) Rebuild ONLY chartGroup meshes when dataset or simulation sliders change (preserves camera & WebGL context!)
  useEffect(() => {
    const ctx = engineRef.current;
    if (!ctx) return;

    // Clear & dispose previous chart meshes safely
    ctx.chartGroup.clear();
    ctx.chartDisposables.geometries.forEach((g) => g.dispose());
    ctx.chartDisposables.materials.forEach((m) => m.dispose());
    ctx.chartDisposables.textures.forEach((t) => t.dispose());
    ctx.chartDisposables = { geometries: [], materials: [], textures: [] };
    ctx.records = [];
    ctx.hitMeshesAll = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      ctx.chartDisposables.geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      ctx.chartDisposables.materials.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      ctx.chartDisposables.textures.push(t);
      return t;
    };

    const { isSoftwareGl, prefersReducedMotion } = ctx;
    const maxBarHeight = 5.4;
    const itemCount = modeDataset.items.length;
    const spacing = itemCount > 7 ? 2.05 : 2.35;
    const startX = -((itemCount - 1) * spacing) / 2;

    if (modeDataset.mode === 'orders') {
      modeDataset.items.forEach((item, idx) => {
        const x = startX + idx * spacing;
        const barGroup = new THREE.Group();
        barGroup.position.set(x, 0, 0);

        const hitMeshes: THREE.Mesh[] = [];
        const mats: THREE.MeshStandardMaterial[] = [];
        const baseEmissives: number[] = [];

        const padGeo = trackGeo(createBeveledColumnGeometry(1.48, 0.14, 1.48, 0.03));
        const padMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0xcbd5e1,
            roughness: 0.35,
            metalness: 0.55,
          })
        );
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.castShadow = !isSoftwareGl;
        pad.receiveShadow = !isSoftwareGl;
        pad.userData.recordId = item.id;
        barGroup.add(pad);
        hitMeshes.push(pad);
        mats.push(padMat);
        baseEmissives.push(0);

        const stackGroup = new THREE.Group();
        stackGroup.position.y = 0.14;
        let currentY = 0;

        const tiers: { val: number; color: number; emissive: number }[] = [
          { val: item.md, color: 0x3b82f6, emissive: 0x1d4ed8 },
          { val: item.mod, color: 0x10b981, emissive: 0x047857 },
          { val: item.cif, color: 0xf59e0b, emissive: 0xb45309 },
        ];

        tiers.forEach((tier) => {
          if (tier.val <= 0) return;
          const h = Math.max(0.14, (tier.val / modeDataset.maxVal) * maxBarHeight);
          const geo = trackGeo(createBeveledColumnGeometry(0.9, h, 0.9, 0.04));
          const mat = trackMat(
            new THREE.MeshStandardMaterial({
              color: tier.color,
              emissive: tier.emissive,
              emissiveIntensity: isDark ? 0.18 : 0.06,
              roughness: 0.24,
              metalness: 0.28,
            })
          );
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(-0.22, currentY, 0);
          mesh.castShadow = !isSoftwareGl;
          mesh.receiveShadow = !isSoftwareGl;
          mesh.userData.recordId = item.id;
          stackGroup.add(mesh);
          hitMeshes.push(mesh);
          mats.push(mat);
          baseEmissives.push(isDark ? 0.18 : 0.06);
          currentY += h + 0.03;
        });

        // Base-Real Ghost Reference Wireframe when Simulation is active
        if (hasSimulation && item.baseTotal > 0) {
          const baseH = Math.max(0.16, (item.baseTotal / modeDataset.maxVal) * maxBarHeight);
          const refBoxGeo = trackGeo(new THREE.BoxGeometry(0.96, baseH, 0.96));
          refBoxGeo.translate(-0.22, baseH / 2, 0);
          const edgesGeo = trackGeo(new THREE.EdgesGeometry(refBoxGeo));
          const lineMat = trackMat(
            new THREE.LineBasicMaterial({
              color: isDark ? 0x94a3b8 : 0x475569,
              transparent: true,
              opacity: 0.65,
            })
          );
          stackGroup.add(new THREE.LineSegments(edgesGeo, lineMat));
        }

        if (item.revenue > 0) {
          const revH = Math.max(0.18, (item.revenue / modeDataset.maxVal) * maxBarHeight);
          const revGeo = trackGeo(createBeveledColumnGeometry(0.46, revH, 0.46, 0.03));
          const revMat = trackMat(
            new THREE.MeshStandardMaterial({
              color: 0xa855f7,
              emissive: 0x7e22ce,
              emissiveIntensity: isDark ? 0.2 : 0.08,
              roughness: 0.18,
              metalness: 0.35,
              transparent: true,
              opacity: 0.88,
            })
          );
          const revMesh = new THREE.Mesh(revGeo, revMat);
          revMesh.position.set(0.46, 0, 0);
          revMesh.castShadow = !isSoftwareGl;
          revMesh.userData.recordId = item.id;
          stackGroup.add(revMesh);
          hitMeshes.push(revMesh);
          mats.push(revMat);
          baseEmissives.push(isDark ? 0.2 : 0.08);
        }

        stackGroup.scale.y = isSoftwareGl || prefersReducedMotion ? 1 : 0.72;
        barGroup.add(stackGroup);

        const tex = trackTex(
          createPlaqueTexture(item.shortLabel, item.subValueLabel, isDark, item.accentHex)
        );
        const plaqueGeo = trackGeo(new THREE.PlaneGeometry(1.75, 0.62));
        const plaqueMat = trackMat(
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
          })
        );
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaque.rotation.x = -Math.PI / 2.6;
        plaque.position.set(0, 0.34, 1.38);
        barGroup.add(plaque);

        ctx.chartGroup.add(barGroup);
        hitMeshes.forEach((m) => ctx.hitMeshesAll.push(m));

        ctx.records.push({
          id: item.id,
          group: stackGroup,
          hitMeshes,
          materials: mats,
          baseEmissive: baseEmissives,
          datum: item.datum,
          focusX: x,
          focusZ: 0,
        });
      });
    } else if (modeDataset.mode === 'cif_inventory') {
      modeDataset.items.forEach((item, idx) => {
        const x = startX + idx * spacing;
        const z = item.groupType === 'cif' ? -0.7 : 0.7;
        const barGroup = new THREE.Group();
        barGroup.position.set(x, 0, z);

        const hitMeshes: THREE.Mesh[] = [];
        const mats: THREE.MeshStandardMaterial[] = [];
        const baseEmissives: number[] = [];

        const colHex = new THREE.Color(item.accentHex);
        const h = Math.max(0.2, (item.value / modeDataset.maxVal) * maxBarHeight);

        const padGeo = trackGeo(
          item.groupType === 'cif'
            ? (() => {
                const g = new THREE.CylinderGeometry(0.66, 0.74, 0.14, 6);
                g.translate(0, 0.07, 0);
                return g;
              })()
            : createBeveledColumnGeometry(1.3, 0.14, 1.3, 0.03)
        );
        const padMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0xcbd5e1,
            roughness: 0.35,
            metalness: 0.55,
          })
        );
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.castShadow = !isSoftwareGl;
        pad.receiveShadow = !isSoftwareGl;
        pad.userData.recordId = item.id;
        barGroup.add(pad);
        hitMeshes.push(pad);
        mats.push(padMat);
        baseEmissives.push(0);

        const stackGroup = new THREE.Group();
        stackGroup.position.y = 0.14;

        const bodyGeo = trackGeo(
          item.groupType === 'cif'
            ? (() => {
                const g = new THREE.CylinderGeometry(0.46, 0.52, h, 6);
                g.translate(0, h / 2, 0);
                return g;
              })()
            : createBeveledColumnGeometry(0.95, h, 0.95, 0.045)
        );
        const bodyMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: colHex,
            emissive: colHex.clone().multiplyScalar(0.55),
            emissiveIntensity: isDark ? 0.22 : 0.07,
            roughness: 0.22,
            metalness: 0.32,
          })
        );
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = !isSoftwareGl;
        bodyMesh.receiveShadow = !isSoftwareGl;
        bodyMesh.userData.recordId = item.id;
        stackGroup.add(bodyMesh);
        hitMeshes.push(bodyMesh);
        mats.push(bodyMat);
        baseEmissives.push(isDark ? 0.22 : 0.07);

        if (hasSimulation && item.baseValue > 0) {
          const baseH = Math.max(0.2, (item.baseValue / modeDataset.maxVal) * maxBarHeight);
          const refGeo = trackGeo(
            item.groupType === 'cif'
              ? (() => {
                  const g = new THREE.CylinderGeometry(0.54, 0.58, baseH, 6);
                  g.translate(0, baseH / 2, 0);
                  return g;
                })()
              : (() => {
                  const g = new THREE.BoxGeometry(1.04, baseH, 1.04);
                  g.translate(0, baseH / 2, 0);
                  return g;
                })()
          );
          const edges = trackGeo(new THREE.EdgesGeometry(refGeo));
          const lineMat = trackMat(
            new THREE.LineBasicMaterial({
              color: isDark ? 0x94a3b8 : 0x475569,
              transparent: true,
              opacity: 0.65,
            })
          );
          stackGroup.add(new THREE.LineSegments(edges, lineMat));
        }

        stackGroup.scale.y = isSoftwareGl || prefersReducedMotion ? 1 : 0.72;
        barGroup.add(stackGroup);

        const tex = trackTex(
          createPlaqueTexture(item.shortLabel, item.subValueLabel, isDark, item.accentHex)
        );
        const plaqueGeo = trackGeo(new THREE.PlaneGeometry(1.75, 0.62));
        const plaqueMat = trackMat(
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
          })
        );
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaque.rotation.x = -Math.PI / 2.6;
        plaque.position.set(0, 0.34, 1.32);
        barGroup.add(plaque);

        ctx.chartGroup.add(barGroup);
        hitMeshes.forEach((m) => ctx.hitMeshesAll.push(m));

        ctx.records.push({
          id: item.id,
          group: stackGroup,
          hitMeshes,
          materials: mats,
          baseEmissive: baseEmissives,
          datum: item.datum,
          focusX: x,
          focusZ: z,
        });
      });
    } else {
      modeDataset.items.forEach((item, idx) => {
        const x = startX + idx * spacing;
        const barGroup = new THREE.Group();
        barGroup.position.set(x, 0, 0);

        const hitMeshes: THREE.Mesh[] = [];
        const mats: THREE.MeshStandardMaterial[] = [];
        const baseEmissives: number[] = [];

        const colHex = new THREE.Color(item.accentHex);
        const h = Math.max(0.2, (item.value / modeDataset.maxVal) * maxBarHeight);
        const yOffset = (item.baseOffset / modeDataset.maxVal) * maxBarHeight;

        const padGeo = trackGeo(createBeveledColumnGeometry(1.3, 0.12, 1.3, 0.03));
        const padMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: isDark ? 0x1e293b : 0xcbd5e1,
            roughness: 0.35,
            metalness: 0.55,
          })
        );
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.receiveShadow = !isSoftwareGl;
        pad.userData.recordId = item.id;
        barGroup.add(pad);
        hitMeshes.push(pad);
        mats.push(padMat);
        baseEmissives.push(0);

        const stackGroup = new THREE.Group();
        stackGroup.position.y = 0.12;

        if (yOffset > 0.08) {
          const strutGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, yOffset, 12));
          strutGeo.translate(0, yOffset / 2, 0);
          const strutMat = trackMat(
            new THREE.MeshStandardMaterial({
              color: isDark ? 0x475569 : 0x94a3b8,
              metalness: 0.7,
              roughness: 0.25,
            })
          );
          const strut = new THREE.Mesh(strutGeo, strutMat);
          strut.userData.recordId = item.id;
          stackGroup.add(strut);
          hitMeshes.push(strut);
          mats.push(strutMat);
          baseEmissives.push(0);
        }

        const bodyGeo = trackGeo(createBeveledColumnGeometry(1.02, h, 1.02, 0.045));
        const bodyMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: colHex,
            emissive: colHex.clone().multiplyScalar(0.5),
            emissiveIntensity: isDark ? 0.22 : 0.07,
            roughness: 0.22,
            metalness: 0.3,
          })
        );
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = yOffset;
        bodyMesh.castShadow = !isSoftwareGl;
        bodyMesh.receiveShadow = !isSoftwareGl;
        bodyMesh.userData.recordId = item.id;
        stackGroup.add(bodyMesh);
        hitMeshes.push(bodyMesh);
        mats.push(bodyMat);
        baseEmissives.push(isDark ? 0.22 : 0.07);

        if (hasSimulation && item.baseValue > 0 && item.baseOffset === 0) {
          const baseH = Math.max(0.2, (item.baseValue / modeDataset.maxVal) * maxBarHeight);
          const refGeo = trackGeo(new THREE.BoxGeometry(1.1, baseH, 1.1));
          refGeo.translate(0, baseH / 2, 0);
          const edges = trackGeo(new THREE.EdgesGeometry(refGeo));
          const lineMat = trackMat(
            new THREE.LineBasicMaterial({
              color: isDark ? 0x94a3b8 : 0x475569,
              transparent: true,
              opacity: 0.65,
            })
          );
          stackGroup.add(new THREE.LineSegments(edges, lineMat));
        }

        stackGroup.scale.y = isSoftwareGl || prefersReducedMotion ? 1 : 0.72;
        barGroup.add(stackGroup);

        const tex = trackTex(
          createPlaqueTexture(item.shortLabel, item.subValueLabel, isDark, item.accentHex)
        );
        const plaqueGeo = trackGeo(new THREE.PlaneGeometry(1.75, 0.62));
        const plaqueMat = trackMat(
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
          })
        );
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaque.rotation.x = -Math.PI / 2.6;
        plaque.position.set(0, 0.34, 1.38);
        barGroup.add(plaque);

        ctx.chartGroup.add(barGroup);
        hitMeshes.forEach((m) => ctx.hitMeshesAll.push(m));

        ctx.records.push({
          id: item.id,
          group: stackGroup,
          hitMeshes,
          materials: mats,
          baseEmissive: baseEmissives,
          datum: item.datum,
          focusX: x,
          focusZ: 0,
        });
      });
    }

    if (!isSoftwareGl) {
      ctx.renderer.compile(ctx.scene, ctx.camera);
    }
  }, [modeDataset, isDark, hasSimulation]);

  const selectedOrder = activeDatum?.orderId
    ? simulatedAccounting.orders.find((o) => o.id === activeDatum.orderId) ?? null
    : null;

  const baseOrderForSheet = activeDatum?.orderId
    ? orders.find((o) => o.id === activeDatum.orderId) ?? null
    : null;

  const deltaMfgCost = simulatedAccounting.totalManufacturingCost - totalManufacturingCost;
  const deltaLAJIR = simulatedAccounting.dre.operatingProfit - dre.operatingProfit;
  const deltaNetRev = simulatedAccounting.dre.netRevenue - dre.netRevenue;

  const applyPreset = (preset: SimulationPreset) => {
    setSimParams({
      id: preset.id,
      label: preset.label,
      ...preset.params,
    });
  };

  const updateSlider = (key: keyof Omit<SimulationParams, 'id' | 'label'>, value: number) => {
    setSimParams((prev) => ({
      ...prev,
      id: 'custom',
      label: 'Simulação Personalizada',
      [key]: value,
    }));
  };

  return (
    <section className="space-y-4">
      {/* Interactive 3D Workspace Header & Mode Switcher */}
      <div className="dash-card rounded-[26px] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-8 h-8 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
              <Box className="w-4 h-4 text-[#3B66F5] dark:text-blue-400" />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Painel Principal · Gráficos Interativos 3D
            </h2>
            {hasSimulation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3" />
                <span>Simulação: {simParams.label}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Explore a composição de MD, MOD, CIF, estoques e DRE de{' '}
            <strong className="text-slate-800 dark:text-zinc-200">{scenarioName}</strong> e teste
            choques futuros em tempo real.
          </p>
        </div>

        {/* 3D Visualization Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="dash-inset rounded-2xl p-1 flex flex-wrap items-center gap-1 shrink-0"
            role="tablist"
            aria-label="Modo do gráfico 3D"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'orders'}
              onClick={() => setChartMode('orders')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                chartMode === 'orders'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Custos por OP</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'cif_inventory'}
              onClick={() => setChartMode('cif_inventory')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                chartMode === 'cif_inventory'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>CIF &amp; Estoques</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'dre_waterfall'}
              onClick={() => setChartMode('dre_waterfall')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                chartMode === 'dre_waterfall'
                  ? 'dash-nav-pill-active font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Cascata DRE</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSimOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              simOpen || hasSimulation
                ? 'dash-cobalt-btn'
                : 'dash-glass-pill text-slate-700 dark:text-zinc-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{simOpen ? 'Ocultar Simulador' : 'Simular Cenários'}</span>
          </button>
        </div>
      </div>

      {/* Main Row: 3D WebGL Viewport (Left) + Future/Adverse Scenario Simulator (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left: 3D WebGL Canvas Stage (No backdrop-blur over WebGL canvas) */}
        <div
          className={`${
            simOpen ? 'xl:col-span-7' : 'xl:col-span-12'
          } dash-card rounded-[26px] p-2.5 flex flex-col`}
        >
          <div
            className={`relative rounded-[20px] overflow-hidden border border-slate-200/80 dark:border-white/[0.1] bg-[#f1f4fa] dark:bg-[#07090f] flex-1 ${
              simOpen ? 'min-h-[440px] xl:min-h-[590px]' : 'h-[480px] sm:h-[520px]'
            }`}
          >
            <div
              ref={canvasMountRef}
              className="w-full h-full"
              aria-label="Visualização 3D interativa dos custos industriais"
            />

            {/* Top-Left Camera Controls Bar */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-auto">
              {(
                [
                  { id: 'iso', label: '3D Iso' },
                  { id: 'front', label: 'Frontal' },
                  { id: 'side', label: 'Lateral' },
                  { id: 'top', label: 'Topo' },
                ] as { id: CameraPreset; label: string }[]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyCameraPreset(preset.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                    cameraPreset === preset.id
                      ? isDark
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-slate-900 text-white border-slate-900'
                      : isDark
                      ? 'bg-[#10131d]/92 text-zinc-300 border-white/15 hover:text-white hover:border-white/30'
                      : 'bg-white/95 text-slate-700 border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  autoRotate
                    ? 'bg-blue-600 text-white border-blue-500'
                    : isDark
                    ? 'bg-[#10131d]/92 text-zinc-300 border-white/15 hover:text-white'
                    : 'bg-white/95 text-slate-700 border-slate-300 hover:text-slate-900'
                }`}
                title="Alternar rotação automática da câmera"
              >
                <Compass className="w-3 h-3" />
                <span>Girar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutoRotate(false);
                  applyCameraPreset('iso');
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#10131d]/92 text-zinc-300 border-white/15 hover:text-white'
                    : 'bg-white/95 text-slate-700 border-slate-300 hover:text-slate-900'
                }`}
                title="Resetar câmera"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Bottom-Left Compact Color Legend */}
            <div
              className={`absolute bottom-3 left-3 right-3 sm:right-auto rounded-2xl px-3.5 py-2 border text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1.5 ${
                isDark
                  ? 'bg-[#0e111a]/92 border-white/15 text-zinc-200'
                  : 'bg-white/94 border-slate-300/90 text-slate-700'
              }`}
            >
              {chartMode === 'orders' && (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> MD
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> MOD
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> CIF
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#a855f7]" /> Receita / Preço
                  </span>
                </>
              )}
              {chartMode === 'cif_inventory' && (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> Categorias de CIF (Hexágonos)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" /> MP / Estoques CPC 16
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> CPV Faturado
                  </span>
                </>
              )}
              {chartMode === 'dre_waterfall' && (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Receita / Subtotal
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" /> Deduções / Despesas
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> CPV Ajustado
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> Margem / LAJIR
                  </span>
                </>
              )}
              {hasSimulation && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-500 dark:text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-sm border border-slate-400" /> Contorno = Base Real
                </span>
              )}
            </div>

            {(webglUnsupported || contextLost) && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-white p-6 text-center">
                <div className="max-w-sm space-y-2">
                  <p className="text-sm font-bold">
                    {contextLost
                      ? 'Contexto gráfico 3D temporariamente suspenso'
                      : 'WebGL indisponível neste navegador'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Utilize os seletores abaixo para inspecionar os números contábeis do cenário.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Side-by-Side Future Scenarios & Adverse Situations 3D Simulator */}
        {simOpen && (
          <div className="xl:col-span-5 dash-card rounded-[26px] p-4 sm:p-5 flex flex-col justify-between gap-3.5">
            <div className="space-y-3.5">
              {/* Simulator Header */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full dash-icon-circle flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Simulador 3D de Cenários &amp; Estresse
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug mt-0.5">
                      Projete choques futuros ao lado do gráfico sem alterar a base real.
                    </p>
                  </div>
                </div>

                {hasSimulation && (
                  <button
                    type="button"
                    onClick={() => applyPreset(SIMULATION_PRESETS[0])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold dash-glass-pill text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
                    title="Restaurar base real"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Base</span>
                  </button>
                )}
              </div>

              {/* Compact 2-Column Preset Shock Selector */}
              <div className="grid grid-cols-2 gap-2">
                {SIMULATION_PRESETS.map((preset) => {
                  const isSelected = simParams.id === preset.id;
                  const badgeColor =
                    preset.tone === 'danger'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/25'
                      : preset.tone === 'warning'
                      ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25'
                      : preset.tone === 'positive'
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                      : 'text-slate-600 dark:text-zinc-300 bg-slate-500/10 border-slate-400/25';

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      title={preset.description}
                      className={`text-left rounded-2xl px-2.5 py-2 border transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'dash-nav-pill-active ring-1 ring-slate-900/10 dark:ring-white/25'
                          : 'dash-inset hover:border-slate-300 dark:hover:border-white/25'
                      }`}
                    >
                      <span
                        className={`inline-block w-fit text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full border leading-none ${badgeColor}`}
                      >
                        {preset.tag}
                      </span>
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact 2-Column Parametric Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      key: 'mdPct',
                      label: 'Mat. Direto (MD)',
                      min: -30,
                      max: 60,
                      step: 1,
                      unit: '%',
                      accent: 'accent-blue-500',
                    },
                    {
                      key: 'modPct',
                      label: 'Mão de Obra (MOD)',
                      min: -25,
                      max: 50,
                      step: 1,
                      unit: '%',
                      accent: 'accent-emerald-500',
                    },
                    {
                      key: 'cifPct',
                      label: 'Indiretos (CIF)',
                      min: -30,
                      max: 60,
                      step: 1,
                      unit: '%',
                      accent: 'accent-amber-500',
                    },
                    {
                      key: 'pricePct',
                      label: 'Preço de Venda',
                      min: -30,
                      max: 40,
                      step: 1,
                      unit: '%',
                      accent: 'accent-violet-500',
                    },
                    {
                      key: 'volumePct',
                      label: 'Volume (Escala)',
                      min: -40,
                      max: 50,
                      step: 1,
                      unit: '%',
                      accent: 'accent-sky-500',
                    },
                    {
                      key: 'taxDeltaPP',
                      label: 'Tributos (Δ p.p.)',
                      min: -5,
                      max: 10,
                      step: 0.5,
                      unit: ' p.p.',
                      accent: 'accent-rose-500',
                    },
                  ] as const
                ).map((cfg) => {
                  const val = simParams[cfg.key];
                  return (
                    <div key={cfg.key} className="dash-inset rounded-xl px-2.5 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-zinc-200 truncate">
                          {cfg.label}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-bold shrink-0 ${
                            val > 0
                              ? cfg.key === 'pricePct' || cfg.key === 'volumePct'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                              : val < 0
                              ? cfg.key === 'pricePct' || cfg.key === 'volumePct'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                          {cfg.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={cfg.min}
                        max={cfg.max}
                        step={cfg.step}
                        value={val}
                        aria-label={cfg.label}
                        onChange={(e) => updateSlider(cfg.key, Number(e.target.value))}
                        className={`w-full h-1.5 rounded-lg cursor-pointer ${cfg.accent}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Impact Summary & Adverse Situation Alerts */}
            <div className="space-y-2.5 pt-1 border-t border-slate-200/80 dark:border-white/[0.08]">
              <div className="grid grid-cols-3 gap-2">
                <div className="dash-inset rounded-xl p-2.5 min-w-0">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                    Custo Fabril
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white block truncate">
                    {formatBRL(simulatedAccounting.totalManufacturingCost)}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums font-semibold block truncate ${
                      deltaMfgCost > 0.01
                        ? 'text-rose-600 dark:text-rose-400'
                        : deltaMfgCost < -0.01
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {deltaMfgCost >= 0 ? '+' : ''}
                    {formatBRL(deltaMfgCost)}
                  </span>
                </div>

                <div className="dash-inset rounded-xl p-2.5 min-w-0">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                    Rec. Líquida
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white block truncate">
                    {formatBRL(simulatedAccounting.dre.netRevenue)}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums font-semibold block truncate ${
                      deltaNetRev >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {deltaNetRev >= 0 ? '+' : ''}
                    {formatBRL(deltaNetRev)}
                  </span>
                </div>

                <div className="dash-inset rounded-xl p-2.5 min-w-0">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                    LAJIR ({formatNumber(simulatedAccounting.dre.operatingMarginPercent, 1)}%)
                  </span>
                  <span
                    className={`text-xs font-bold font-mono tabular-nums block truncate ${
                      simulatedAccounting.dre.operatingProfit >= 0
                        ? 'text-slate-900 dark:text-white'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatBRL(simulatedAccounting.dre.operatingProfit)}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums font-semibold block truncate ${
                      deltaLAJIR >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {deltaLAJIR >= 0 ? '+' : ''}
                    {formatBRL(deltaLAJIR)}
                  </span>
                </div>
              </div>

              {simulationAlerts.length > 0 && (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/[0.09] px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] min-w-0">
                    <p className="font-bold text-rose-700 dark:text-rose-300">
                      Alerta de Situação Adversa
                    </p>
                    <ul className="list-disc list-inside text-rose-700/90 dark:text-rose-200/90 space-y-0.5">
                      {simulationAlerts.map((alert) => (
                        <li key={alert} className="truncate" title={alert}>
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel: Cost Data Inspector & Quick 3D Element Selection */}
      <div className="dash-card rounded-[26px] p-5 space-y-4">
        {/* Quick Selection Chips Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white mr-1">
              Dados de Custos ({modeDataset.items.length}):
            </span>
            {modeDataset.items.map((item) => {
              const isSelected = activeDatum?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                    isSelected
                      ? 'dash-nav-pill-active font-semibold'
                      : 'dash-inset text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.accentHex }}
                  />
                  <span>{item.shortLabel}</span>
                  <span className="font-mono tabular-nums text-[11px] opacity-80">
                    {item.subValueLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums shrink-0">
            {cifConfig.method === 'taxa_real' ? 'Critério: Taxa Real' : 'Critério: Taxa Pré-Determinada'} ·{' '}
            {companyParams.periodName}
          </span>
        </div>

        {/* Cost Inspector Details Grid */}
        {activeDatum ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left Summary Block */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: activeDatum.accentHex }}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      {activeDatum.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {activeDatum.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                    {activeDatum.subtitle}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                  <MousePointerClick className="w-4 h-4" />
                </div>
              </div>

              <div className="dash-inset rounded-2xl p-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                    {activeDatum.primaryLabel}
                  </span>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatBRL(activeDatum.primaryValue)}
                  </div>
                </div>
                {hasSimulation && activeDatum.baseValue !== undefined && (
                  <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                    Base real: <strong className="text-slate-700 dark:text-zinc-200">{formatBRL(activeDatum.baseValue)}</strong>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(baseOrderForSheet || selectedOrder) && (
                  <button
                    type="button"
                    onClick={() => onOpenCostSheet(baseOrderForSheet || selectedOrder!)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-4 dash-cobalt-btn text-xs font-semibold rounded-full transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>
                      Abrir Ficha de Custo ({(baseOrderForSheet || selectedOrder)!.code})
                    </span>
                  </button>
                )}

                {activeDatum.targetTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(activeDatum.targetTab!)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-4 dash-glass-pill text-xs font-semibold text-slate-800 dark:text-zinc-100 rounded-full hover:border-slate-300 dark:hover:border-white/30 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>
                      {activeDatum.targetTab === 'orders'
                        ? 'Ver todas as Ordens (OP)'
                        : activeDatum.targetTab === 'cif'
                        ? 'Configurar Rateio de CIF'
                        : activeDatum.targetTab === 'taccounts'
                        ? 'Inspecionar Razonetes em T'
                        : 'Abrir DRE Completa'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Detailed Cost Metrics Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDatum.metrics.map((m) => (
                <div
                  key={m.label}
                  className="dash-inset rounded-2xl p-3.5 flex flex-col justify-between gap-1.5"
                >
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                    {m.label}
                  </span>
                  <span
                    className={`text-sm font-mono tabular-nums font-bold ${
                      m.colorClass || 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-8 space-y-2 text-xs text-slate-500 dark:text-zinc-400">
            <Maximize2 className="w-6 h-6 opacity-50" />
            <p>Nenhum dado disponível para este modo no cenário atual.</p>
          </div>
        )}
      </div>
    </section>
  );
}
