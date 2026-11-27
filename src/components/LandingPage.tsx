import { useState, useMemo, useRef, type MouseEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Layers,
  Moon,
  Printer,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { NocturnalBackdrop } from './NocturnalBackdrop';
import { MOCK_SCENARIOS, PredefinedScenario } from '../data/mockScenarios';
import {
  calculateAllOrdersCosts,
  formatBRL,
  formatNumber,
  getAllocationBaseLabel,
  getAllocationBaseUnit,
} from '../utils/costCalculations';
import prismGlassImg from '../assets/images/landing_prism_glass_1795749654150.jpg';
import workshopCraftImg from '../assets/images/landing_cnc_workshop_1795749655265.jpg';

interface LandingPageProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  onNavigateToLogin: (preselectedScenario?: PredefinedScenario) => void;
  onNavigateToDashboard: (preselectedScenario?: PredefinedScenario) => void;
  onOpenTheory: () => void;
}

function handleCardMouseMove(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export function LandingPage({
  theme,
  onToggleTheme,
  isAuthenticated,
  onNavigateToLogin,
  onNavigateToDashboard,
  onOpenTheory,
}: LandingPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const isDark = theme === 'dark';

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [workshopImgFailed, setWorkshopImgFailed] = useState(false);

  // Interactive capability preview state (Scenario 0 orders)
  const defaultScenario = MOCK_SCENARIOS[0];
  const [previewOrderId, setPreviewOrderId] = useState<string>(defaultScenario.orders[0].id);

  // Interactive scenario showcase state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(MOCK_SCENARIOS[0].id);

  const defaultAnalysis = useMemo(
    () =>
      calculateAllOrdersCosts(
        defaultScenario.orders,
        defaultScenario.cifItems,
        defaultScenario.cifConfig
      ),
    [defaultScenario]
  );

  const previewOrder =
    defaultScenario.orders.find((o) => o.id === previewOrderId) || defaultScenario.orders[0];
  const previewSummary = defaultAnalysis.summaries[previewOrder.id];

  const activeScenario =
    MOCK_SCENARIOS.find((s) => s.id === selectedScenarioId) || MOCK_SCENARIOS[0];

  const activeScenarioMetrics = useMemo(() => {
    const analysis = calculateAllOrdersCosts(
      activeScenario.orders,
      activeScenario.cifItems,
      activeScenario.cifConfig
    );
    const totalManufacturing = Object.values(analysis.summaries).reduce(
      (acc, s) => acc + s.totalManufacturingCost,
      0
    );
    const totalMD = Object.values(analysis.summaries).reduce((acc, s) => acc + s.totalMD, 0);
    const totalMOD = Object.values(analysis.summaries).reduce((acc, s) => acc + s.totalMOD, 0);
    return {
      analysis,
      totalManufacturing,
      totalMD,
      totalMOD,
    };
  }, [activeScenario]);

  const handleEnterSystem = (scenario?: PredefinedScenario) => {
    if (isAuthenticated) {
      onNavigateToDashboard(scenario);
    } else {
      onNavigateToLogin(scenario);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  };

  const scrollToSection = (e: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  // Global page scroll progress bar (compositor-only scaleX)
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 32,
    restDelta: 0.001,
  });

  // Scroll-linked parallax for Hero glass sculpture
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroMediaRef,
    offset: ['start end', 'end start'],
  });
  const heroImageY = useTransform(heroScrollProgress, [0, 1], [-18, 22]);

  // Scroll-linked parallax for Workshop craft photo
  const workshopMediaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: workshopScrollProgress } = useScroll({
    target: workshopMediaRef,
    offset: ['start end', 'end start'],
  });
  const workshopImageY = useTransform(workshopScrollProgress, [0, 1], [-16, 20]);

  const revealProps = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 28,
            delay,
          },
        };

  const scrollReveal = (delay = 0) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24, scale: 0.985 },
          whileInView: { opacity: 1, y: 0, scale: 1 },
          viewport: { once: true, amount: 0.14 },
          transition: {
            duration: 0.52,
            ease: [0.16, 1, 0.3, 1] as const,
            delay,
          },
        };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-[#F5F5F7] relative overflow-x-clip">
      <NocturnalBackdrop />

      {/* Strict 3-Zone Top Bar + Scroll Progress Hairline */}
      <header className="sticky top-0 z-30 bg-white/75 dark:bg-black/50 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.14]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Brand Wordmark */}
          <button
            type="button"
            onClick={scrollToTop}
            className="group h-12 w-40 overflow-visible flex items-center justify-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg shrink-0"
            aria-label="CustosOP — Início"
          >
            <img
              src="/assets/custosop-logo.png"
              alt="CustosOP"
              referrerPolicy="no-referrer"
              className="h-[76px] w-auto max-w-none -ml-0.5 select-none pointer-events-none logo-glow"
            />
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-[13px] font-medium text-slate-600 dark:text-zinc-400"
            aria-label="Navegação do site"
          >
            <a
              href="#capacidades"
              onClick={(e) => scrollToSection(e, 'capacidades')}
              className="py-2 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capacidades
            </a>
            <a
              href="#fluxo"
              onClick={(e) => scrollToSection(e, 'fluxo')}
              className="py-2 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Fluxo Contábil
            </a>
            <a
              href="#cenarios"
              onClick={(e) => scrollToSection(e, 'cenarios')}
              className="py-2 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Cenários
            </a>
            <a
              href="#metodologia"
              onClick={(e) => scrollToSection(e, 'metodologia')}
              className="py-2 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Metodologia
            </a>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleEnterSystem()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold dash-cobalt-btn rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <span>{isAuthenticated ? 'Ir para o Painel' : 'Acessar Painel'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chromatic Scroll Progress Hairline */}
        {!shouldReduceMotion && (
          <motion.div
            aria-hidden="true"
            style={{ scaleX: smoothProgress }}
            className="h-[2px] w-full origin-left bg-gradient-to-r from-slate-900 via-sky-600 to-amber-500 dark:from-white/40 dark:via-sky-400 dark:to-amber-300 pointer-events-none"
          />
        )}
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 space-y-20 sm:space-y-24">
        {/* Section 1: Hero Proposition + Balanced 2-Column Focal Split */}
        <section aria-labelledby="hero-headline" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Column: Editorial Proposition */}
            <motion.div
              {...revealProps(0)}
              className="lg:col-span-6 flex flex-col justify-between gap-8 py-2"
            >
              <div className="space-y-5">
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-wide">
                  CPC 16 / NBC TG 16 · Custeio por Absorção · Ordem de Produção
                </p>

                <h1
                  id="hero-headline"
                  className="text-[clamp(2.25rem,4vw,3.75rem)] font-extrabold tracking-tight leading-[1.06] text-slate-900 dark:text-white"
                  style={{ textWrap: 'balance' }}
                >
                  Contabilidade de custos por encomenda com precisão contábil.
                </h1>

                <p className="text-[15px] sm:text-base text-slate-600 dark:text-zinc-300 leading-relaxed max-w-[62ch]">
                  Aponte Matéria-Prima (MD), Mão de Obra Direta (MOD) e Custos Indiretos de
                  Fabricação (CIF) em cada Ordem de Produção, acompanhe os razonetes em T em
                  tempo real e feche a DRE consolidada do período.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleEnterSystem()}
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold dash-cobalt-btn rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <span>{isAuthenticated ? 'Abrir Painel de Custos' : 'Entrar no Painel'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenTheory}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white dash-glass-pill rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Consultar Guia CPC 16</span>
                  </button>
                </div>

                {/* Unboxed metadata footer line */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-400 pt-1">
                  <span>3 cenários industriais prontos</span>
                  <span aria-hidden="true">·</span>
                  <span>Exportação A4 e PDF</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="inline-flex items-center gap-1.5 text-slate-700 dark:text-zinc-200 hover:underline cursor-pointer"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Dominant 16:9 / Full-Height Focal Glass Visual with Scroll Parallax */}
            <motion.div
              ref={heroMediaRef}
              {...revealProps(0.08)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-6 dash-card apple-card-spotlight rounded-[26px] overflow-hidden relative min-h-[340px] lg:min-h-[460px] flex flex-col justify-end"
            >
              {!heroImgFailed ? (
                <motion.img
                  src={prismGlassImg}
                  alt="Escultura prismática em vidro líquido simbolizando a apropriação de custos industriais"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  style={shouldReduceMotion ? undefined : { y: heroImageY }}
                  className="absolute inset-0 w-full h-full object-cover object-center scale-[1.08] select-none pointer-events-none will-change-transform"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex items-center justify-center"
                >
                  <Layers className="w-16 h-16 text-white/20" />
                </div>
              )}

              {/* Measured Gradient Scrim for Guaranteed 4.5:1 Contrast */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15 pointer-events-none"
              />

              {/* Crisp Ledger Snapshot Overlay */}
              <div className="relative z-10 p-6 sm:p-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                  <span className="font-semibold text-white">
                    {defaultScenario.orders[0].code} · {defaultScenario.orders[0].clientName}
                  </span>
                  <span className="font-mono tabular-nums text-emerald-300">
                    Faturada · Margem{' '}
                    {formatNumber(
                      defaultAnalysis.summaries[defaultScenario.orders[0].id].grossMarginPercent,
                      1
                    )}
                    %
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15">
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Material Direto</span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                      {formatBRL(defaultAnalysis.summaries[defaultScenario.orders[0].id].totalMD)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block">Mão de Obra Direta</span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                      {formatBRL(defaultAnalysis.summaries[defaultScenario.orders[0].id].totalMOD)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 block">CIF Apropriado</span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                      {formatBRL(
                        defaultAnalysis.summaries[defaultScenario.orders[0].id].cifAllocated
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Full-Width 4-Column Quantitative Strip Below Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div
              onMouseMove={handleCardMouseMove}
              {...revealProps(0.12)}
              className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Estágios de Controle
                </span>
                <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  3 Fases
                </p>
                <p className="mt-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400">
                  Em Elaboração (PeE) · Acabados (PA) · CPV Faturado
                </p>
              </div>
            </motion.div>

            <motion.div
              onMouseMove={handleCardMouseMove}
              {...revealProps(0.16)}
              className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Critérios de Rateio de CIF
                </span>
                <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  6 Bases
                </p>
                <p className="mt-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400">
                  Horas MOD · Horas-Máquina · Custo MD · Custo Primário
                </p>
              </div>
            </motion.div>

            <motion.div
              onMouseMove={handleCardMouseMove}
              {...revealProps(0.2)}
              className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Apropriação de Indiretos
                </span>
                <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  2 Métodos
                </p>
                <p className="mt-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400">
                  Taxa Efetiva Real e Taxa Pré-Determinada com variação
                </p>
              </div>
            </motion.div>

            <motion.div
              onMouseMove={handleCardMouseMove}
              {...revealProps(0.24)}
              className="group/kpi dash-card apple-card-spotlight rounded-[26px] p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Fechamento Contábil
                </span>
                <div className="w-9 h-9 rounded-full dash-icon-circle apple-icon-badge flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  100% T
                </p>
                <p className="mt-2 pt-2.5 border-t border-slate-200/80 dark:border-white/[0.1] text-[11px] text-slate-500 dark:text-zinc-400">
                  Razonetes em partidas dobradas ligados à DRE consolidada
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: Core Capabilities (Asymmetric Bento Grid) */}
        <section id="capacidades" aria-labelledby="capacidades-title" className="space-y-8 scroll-mt-24">
          <motion.div {...scrollReveal(0)} className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Capacidades do Sistema
            </p>
            <h2
              id="capacidades-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              Do apontamento na fábrica ao encerramento da DRE.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 01. Col-Span-2 Interactive Job Cost Sheet Preview */}
            <motion.div
              {...scrollReveal(0.04)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-2 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    01. Ficha Técnica de Custos por Ordem (Job Cost Sheet)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Registre requisições de almoxarifado (RMA), horas apontadas por operador e
                    horas-máquina diretamente em cada encomenda, acompanhando o custo unitário em
                    tempo real.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>

              {/* Interactive Order Switcher */}
              <div className="dash-inset rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-slate-200/70 dark:bg-white/[0.06]"
                    role="tablist"
                    aria-label="Visualizar ordem de produção de exemplo"
                  >
                    {defaultScenario.orders.map((op) => {
                      const active = op.id === previewOrder.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setPreviewOrderId(op.id)}
                          className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'dash-nav-pill-active font-semibold'
                              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {op.code}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    {previewOrder.clientName} · {previewOrder.quantity} {previewOrder.unit}
                  </span>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-200 leading-relaxed">
                  {previewOrder.productDescription}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.1]">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                      Material Direto (MD)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatBRL(previewSummary.totalMD)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                      Mão de Obra (MOD)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatBRL(previewSummary.totalMOD)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                      CIF Rateado
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatBRL(previewSummary.cifAllocated)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                      Custo Total da OP
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatBRL(previewSummary.totalManufacturingCost)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 02. Col-Span-1 CIF Allocation Engine */}
            <motion.div
              {...scrollReveal(0.1)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-1 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    02. Motor de Rateio de CIF
                  </h3>
                  <div className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Alterne entre Taxa Efetiva Real e Taxa Pré-Determinada com cálculo imediato de
                  subaplicação ou sobreaplicação para ajuste no CPV.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.1] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Taxa Real (Cenário Base)</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatBRL(defaultAnalysis.effectiveCIFRate)} / h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">CIF Total Apurado</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatBRL(defaultAnalysis.totalActualCIF)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 03. Col-Span-1 T-Accounts */}
            <motion.div
              {...scrollReveal(0.06)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-1 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    03. Razonetes em T
                  </h3>
                  <div className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Visualize débitos e créditos das contas de Almoxarifado (MP), Produção em
                  Elaboração (PeE), Produtos Acabados (PA), CIF e CPV sem lançamentos manuais.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.1] flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Partidas dobradas</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  MP → PeE → PA → CPV
                </span>
              </div>
            </motion.div>

            {/* 04. Col-Span-2 DRE & Reports */}
            <motion.div
              {...scrollReveal(0.12)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-2 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    04. DRE Consolidada e Relatório Contábil em PDF
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    Ao faturar uma ordem, o sistema transfere o custo unitário de PA para o CPV,
                    deduz tributos sobre vendas e despesas operacionais, e gera o demonstrativo A4
                    pronto para impressão ou controladoria.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/[0.1] text-xs">
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 block">Receita &amp; Tributos</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    Alíquota configurável por OP
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 block">Margem por Pedido</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    Lucro bruto unitário e total
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-zinc-400 block">Exportação Limpa</span>
                  <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    Relatório consolidado A4 / PDF
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Fluxo Contábil (Clean 4-Step Editorial Sequence, no nested boxes) */}
        <section id="fluxo" aria-labelledby="fluxo-title" className="space-y-8 scroll-mt-24">
          <motion.div {...scrollReveal(0)} className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Fluxo Contábil Integrado
            </p>
            <h2
              id="fluxo-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              Cada movimentação física reflete nos estoques e no resultado.
            </h2>
          </motion.div>

          <motion.div {...scrollReveal(0.05)} className="dash-card rounded-[26px] p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-6">
              <motion.div
                {...scrollReveal(0.08)}
                className="space-y-2.5 xl:pr-4 xl:border-r xl:border-slate-200/80 dark:xl:border-white/[0.1]"
              >
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500 dark:text-zinc-400">
                  01. Requisição de MP
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Baixa no Almoxarifado
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  A requisição de material direto credita Estoque de MP e debita a Ordem em
                  Elaboração (PeE) correspondente.
                </p>
              </motion.div>

              <motion.div
                {...scrollReveal(0.14)}
                className="space-y-2.5 xl:pr-4 xl:border-r xl:border-slate-200/80 dark:xl:border-white/[0.1]"
              >
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500 dark:text-zinc-400">
                  02. Apontamento MOD &amp; CIF
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Absorção dos Indiretos
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Horas trabalhadas e horas-máquina determinam a parcela de energia, aluguel e
                  depreciação apropriada à OP.
                </p>
              </motion.div>

              <motion.div
                {...scrollReveal(0.2)}
                className="space-y-2.5 xl:pr-4 xl:border-r xl:border-slate-200/80 dark:xl:border-white/[0.1]"
              >
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500 dark:text-zinc-400">
                  03. Encerramento do Lote
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Transferência para PA
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Ao concluir a fabricação, o saldo acumulado migra de Produção em Elaboração para
                  Produtos Acabados.
                </p>
              </motion.div>

              <motion.div {...scrollReveal(0.26)} className="space-y-2.5">
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-500 dark:text-zinc-400">
                  04. Faturamento &amp; DRE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Baixa para CPV
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Na entrega ao cliente, o custo do lote compõe o CPV do período e apura o lucro
                  bruto e operacional na DRE.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Section 4: Interactive Proof / Industrial Scenarios */}
        <section id="cenarios" aria-labelledby="cenarios-title" className="space-y-8 scroll-mt-24">
          <motion.div
            {...scrollReveal(0)}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Casos Práticos Inclusos
              </p>
              <h2
                id="cenarios-title"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
                style={{ textWrap: 'balance' }}
              >
                Teste imediatamente com operações industriais e exames CFC.
              </h2>
            </div>

            {/* Interactive Scenario Selector */}
            <div
              className="flex flex-wrap items-center gap-1.5 p-1.5 dash-glass-pill rounded-full"
              role="tablist"
              aria-label="Selecionar cenário industrial"
            >
              {MOCK_SCENARIOS.map((sc) => {
                const isActive = sc.id === activeScenario.id;
                const shortLabel =
                  sc.id === 'marcenaria_fina'
                    ? 'Marcenaria'
                    : sc.id === 'caldeiraria_pesada'
                      ? 'Metalúrgica'
                      : 'Prova CFC';
                return (
                  <button
                    key={sc.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'dash-nav-pill-active font-semibold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Editorial Industrial Photo with Subtle Scroll Parallax */}
            <motion.div
              ref={workshopMediaRef}
              {...scrollReveal(0.04)}
              className="lg:col-span-5 dash-card rounded-[26px] overflow-hidden relative min-h-[280px] lg:min-h-[380px]"
            >
              {!workshopImgFailed ? (
                <motion.img
                  src={workshopCraftImg}
                  alt="Componentes usinados em aço inox e peças de marcenaria fina sobre bancada industrial"
                  referrerPolicy="no-referrer"
                  onError={() => setWorkshopImgFailed(true)}
                  style={shouldReduceMotion ? undefined : { y: workshopImageY }}
                  className="w-full h-full object-cover object-center scale-[1.08] will-change-transform"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="w-full h-full bg-gradient-to-br from-slate-800 to-zinc-950 flex items-center justify-center p-8"
                >
                  <CheckCircle2 className="w-14 h-14 text-white/25" />
                </div>
              )}
            </motion.div>

            {/* Right: Active Scenario Quantitative Breakdown */}
            <motion.div
              {...scrollReveal(0.1)}
              onMouseMove={handleCardMouseMove}
              className="lg:col-span-7 dash-card apple-card-spotlight rounded-[26px] p-6 sm:p-8 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {activeScenario.companyParams.companyName} · {activeScenario.companyParams.periodName}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {activeScenario.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {activeScenario.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-200/80 dark:border-white/[0.1]">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                    Ordens no Período
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {activeScenario.orders.length} OPs
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                    Custo Fabril Acumulado
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatBRL(activeScenarioMetrics.totalManufacturing)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                    CIF Aplicado
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatBRL(activeScenarioMetrics.analysis.totalAppliedCIF)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                    Taxa Efetiva
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatBRL(activeScenarioMetrics.analysis.effectiveCIFRate)} /{' '}
                    {getAllocationBaseUnit(activeScenario.cifConfig.allocationBase)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Critério:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {getAllocationBaseLabel(activeScenario.cifConfig.allocationBase)}
                  </strong>
                </p>

                <button
                  type="button"
                  onClick={() => handleEnterSystem(activeScenario)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold dash-cobalt-btn rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Abrir este cenário no Painel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 5: Methodology & Final Conversion */}
        <section id="metodologia" aria-labelledby="metodologia-title" className="scroll-mt-24">
          <motion.div
            {...scrollReveal(0.05)}
            onMouseMove={handleCardMouseMove}
            className="dash-hero-glass apple-card-spotlight rounded-[26px] p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 text-white"
          >
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-medium text-zinc-400">
                Conformidade Contábil Brasileira · CPC 16 (IAS 2)
              </p>
              <h2
                id="metodologia-title"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Pronto para gerenciar as ordens de produção da sua indústria?
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Acesse o painel completo para cadastrar novas ordens, lançar requisições de material,
                simular critérios de rateio de CIF e exportar demonstrativos financeiros.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleEnterSystem()}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-100 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
              >
                <span>{isAuthenticated ? 'Acessar Painel' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenTheory}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white border border-white/25 hover:bg-white/10 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Guia Teórico</span>
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] py-7 text-xs text-slate-500 dark:text-zinc-400">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-center md:text-left">
            <strong className="text-slate-900 dark:text-white">CustosOP</strong>
            <span aria-hidden="true">·</span>
            <span>Gestão e Acumulação de Custos por Ordem de Produção (CPC 16 / NBC TG 16)</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#capacidades"
              onClick={(e) => scrollToSection(e, 'capacidades')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Capacidades
            </a>
            <a
              href="#fluxo"
              onClick={(e) => scrollToSection(e, 'fluxo')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Fluxo Contábil
            </a>
            <a
              href="#cenarios"
              onClick={(e) => scrollToSection(e, 'cenarios')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cenários
            </a>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
