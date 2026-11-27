import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PredefinedScenario } from '../data/mockScenarios';

interface ScenarioSelectorDropdownProps {
  scenarios: PredefinedScenario[];
  currentScenario: PredefinedScenario;
  onSelectScenario: (scenario: PredefinedScenario) => void;
}

export function ScenarioSelectorDropdown({
  scenarios,
  currentScenario,
  onSelectScenario,
}: ScenarioSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.975 }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Selecionar caso prático ou cenário industrial"
        className={`dash-glass-pill inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-medium text-slate-900 dark:text-white transition-colors cursor-pointer max-w-[260px] sm:max-w-[340px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B66F5] ${
          isOpen
            ? 'border-slate-300 dark:border-white/35 shadow-[0_0_24px_rgba(59,102,245,0.16)]'
            : 'hover:border-slate-300 dark:hover:border-white/25'
        }`}
      >
        <span className="w-5 h-5 rounded-full bg-slate-900/[0.06] dark:bg-white/[0.12] flex items-center justify-center shrink-0">
          <Building2 className="w-3 h-3 text-slate-700 dark:text-white" />
        </span>
        <span className="truncate">
          <span className="text-slate-500 dark:text-zinc-400 font-normal mr-1">Cenário:</span>
          <span className="font-semibold">{currentScenario.name}</span>
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 420, damping: 28 }
          }
          className="inline-flex items-center justify-center shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            aria-label="Lista de cenários industriais"
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    y: -14,
                    scale: 0.92,
                    clipPath: 'inset(0% 0% 92% 0% round 22px)',
                  }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    clipPath: 'inset(0% 0% 0% 0% round 22px)',
                  }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: -10,
                    scale: 0.95,
                    clipPath: 'inset(0% 0% 88% 0% round 22px)',
                    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                  }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 350,
                    damping: 28,
                    mass: 0.85,
                    clipPath: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.18, ease: 'easeOut' },
                  }
            }
            className="absolute left-0 mt-2 w-[320px] sm:w-[400px] max-w-[calc(100vw-2rem)] z-50 dash-modal rounded-[22px] p-2 space-y-1 origin-top-left overflow-hidden"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, delay: 0.04 }}
              className="px-3 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500"
            >
              <span>Selecionar Cenário Industrial</span>
              <span className="font-mono">{scenarios.length} casos</span>
            </motion.div>

            {scenarios.map((scenario, idx) => {
              const isSelected = scenario.id === currentScenario.id;
              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: -8, scale: 0.97 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 380,
                          damping: 28,
                          delay: 0.045 + idx * 0.045,
                        }
                  }
                  whileHover={shouldReduceMotion ? undefined : { x: 3 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  onClick={() => {
                    onSelectScenario(scenario);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'dash-nav-pill-active'
                      : 'hover:bg-slate-900/[0.045] dark:hover:bg-white/[0.07] text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug truncate">
                      {scenario.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug line-clamp-1">
                      {scenario.subtitle}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono tabular-nums text-slate-400 dark:text-zinc-500">
                      <span>{scenario.companyParams.periodName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{scenario.orders.length} OPs</span>
                      <span aria-hidden="true">·</span>
                      <span>{scenario.cifItems.length} itens CIF</span>
                    </div>
                  </div>

                  <motion.span
                    initial={false}
                    animate={
                      isSelected && !shouldReduceMotion
                        ? { scale: [0.7, 1.12, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                      isSelected
                        ? 'bg-[#3B66F5] border-[#3B66F5] text-white'
                        : 'border-slate-300/70 dark:border-white/15 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
