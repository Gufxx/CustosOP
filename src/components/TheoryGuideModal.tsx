import {
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface TheoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TheoryGuideModal({ isOpen, onClose }: TheoryGuideModalProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 dark:bg-black/45 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 14, filter: 'blur(6px)' }
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
                : { type: 'spring', stiffness: 360, damping: 28, mass: 0.82 }
            }
            className="dash-modal rounded-[28px] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
          >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Fechar guia"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center gap-3 pr-14">
          <div className="w-9 h-9 rounded-full dash-icon-circle flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
              Fundamentos da Teoria Contábil de Custos por Ordem
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Conforme a Doutrina Contábil Brasileira (Eliseu Martins, Dutra) e CPC 16 / NBC TG 16
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
          {/* 1. O que é o Custeio por Ordem de Produção */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              01. Conceito do Custeio por Ordem de Produção (Encomenda)
            </h4>
            <p>
              O sistema de acumulação de custos por <strong className="text-slate-900 dark:text-white">Ordem de Produção (OP)</strong> ou <strong className="text-slate-900 dark:text-white">por Encomenda</strong> (em inglês, <em>Job-Order Costing</em>) é aplicado a indústrias e empresas prestadoras de serviços que produzem itens sob medida, lotes personalizados ou projetos específicos.
            </p>
            <p>
              Ao contrário do <strong className="text-slate-900 dark:text-white">Custeio por Processo Contínuo</strong> (onde os custos são acumulados por departamento e divididos pela produção homogênea em massa, como em cimenteiras ou refinarias), no custeio por ordem o <strong className="text-slate-900 dark:text-white">objeto de custeio é o lote ou a encomenda individual</strong>. Cada lote recebe uma identificação única (ex: OP-101) e uma respectiva <strong className="text-slate-900 dark:text-white">Ficha de Custos</strong>.
            </p>
          </section>

          {/* 2. Os Três Elementos do Custo Fabril */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              02. Os Três Componentes do Custo do Produto
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="dash-inset p-3.5 rounded-2xl">
                <strong className="text-slate-900 dark:text-white block text-xs mb-1">
                  1. Material Direto (MD)
                </strong>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                  Matérias-primas e componentes requisitados do almoxarifado especificamente para a ordem (via RMA). Apropriação direta e sem ambiguidade.
                </p>
              </div>

              <div className="dash-inset p-3.5 rounded-2xl">
                <strong className="text-slate-900 dark:text-white block text-xs mb-1">
                  2. Mão de Obra Direta (MOD)
                </strong>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                  Salários e encargos sociais dos operários que atuam diretamente na fabricação do produto, registrados via apontamento de horas na OP.
                </p>
              </div>

              <div className="dash-inset p-3.5 rounded-2xl">
                <strong className="text-slate-900 dark:text-white block text-xs mb-1">
                  3. Custos Indiretos (CIF)
                </strong>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                  Energia fabril, aluguel da fábrica, depreciação do maquinário, supervisão e manutenção. Não podem ser atribuídos diretamente e exigem critérios de rateio.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Critérios de Rateio de CIF */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              03. Critérios de Rateio e Taxa de Aplicação de CIF
            </h4>
            <p>
              Para ratear os Custos Indiretos entre as ordens em andamento no período, a contabilidade elege uma <strong className="text-slate-900 dark:text-white">Base de Rateio (Direcionador)</strong> representativa da atividade fabril:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-zinc-300">
              <li><strong className="text-slate-900 dark:text-white">Horas de MOD:</strong> Indicada para fábricas com predomínio de trabalho manual/artesanal.</li>
              <li><strong className="text-slate-900 dark:text-white">Horas-Máquina:</strong> Adequada para empresas automatizadas de capital intensivo.</li>
              <li><strong className="text-slate-900 dark:text-white">Custo de MOD ou Material Direto:</strong> Usado por conveniência quando há alta correlação financeira.</li>
              <li><strong className="text-slate-900 dark:text-white">Custo Primário (MD + MOD):</strong> Soma dos custos diretos já aplicados na ordem.</li>
            </ul>
            <div className="dash-inset p-3 rounded-2xl font-mono text-[11px] text-slate-900 dark:text-white font-bold">
              Taxa de CIF = Total de CIF do Período ÷ Total da Base de Rateio de Todas as OPs
            </div>
          </section>

          {/* 4. Taxa Real vs. Taxa Pré-Determinada */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              04. Taxa Real vs. Taxa Pré-Determinada (Sub e Sobreaplicação)
            </h4>
            <p>A doutrina contábil distingue dois modos de apropriação:</p>
            <div className="space-y-2.5 pt-1">
              <div className="dash-inset p-3.5 rounded-2xl">
                <span className="font-bold text-slate-900 dark:text-white block text-xs">Taxa Real (A posteriori):</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5">
                  Calculada no fim do mês dividindo os gastos indiretos efetivamente incorridos pela base real. Vantagem: aloca 100% dos custos sem sobras contábeis. Desvantagem: obriga a empresa a esperar o encerramento do mês para conhecer o custo da encomenda.
                </p>
              </div>

              <div className="dash-inset p-3.5 rounded-2xl">
                <span className="font-bold text-slate-900 dark:text-white block text-xs">Taxa Pré-Determinada (A priori):</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5">
                  Fixada no início do período baseando-se no CIF orçado e na capacidade normal de produção. Permite apurar o custo imediatamente quando a ordem é finalizada. No fim do período, apura-se a <strong className="text-slate-900 dark:text-white">Variação de CIF</strong>:
                </p>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10px]">
                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25 text-amber-800 dark:text-amber-100">
                    <strong className="text-amber-900 dark:text-white">Subaplicação (Real &gt; Aplicado):</strong> Faltou alocar custos. Ajusta-se debitando CPV e creditando a conta de controle de CIF.
                  </div>
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/25 text-emerald-800 dark:text-emerald-100">
                    <strong className="text-emerald-900 dark:text-white">Sobreaplicação (Aplicado &gt; Real):</strong> Custos em excesso alocados. Ajusta-se creditando CPV e debitando a conta de controle de CIF.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Fluxo Contábil dos Estoques e DRE */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              05. O Fluxo Contábil das Contas de Estoque (CPC 16 / NBC TG 16)
            </h4>
            <p>
              Conforme o Princípio da Realização da Receita e o Confronto das Despesas com as Receitas:
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 dash-inset p-3.5 rounded-2xl text-center font-semibold text-xs">
              <div className="flex-1 p-2.5 bg-white dark:bg-white/[0.05] rounded-xl border border-slate-200 dark:border-white/[0.08] text-amber-600 dark:text-amber-200">
                1. Produtos em Elaboração (PeE)
                <br />
                <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">Acumula MD + MOD + CIF na fábrica</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-900 dark:text-white shrink-0 hidden sm:block" />
              <div className="flex-1 p-2.5 bg-white dark:bg-white/[0.05] rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white">
                2. Produtos Acabados (PA)
                <br />
                <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">OP concluída estocada no almoxarifado</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-900 dark:text-white shrink-0 hidden sm:block" />
              <div className="flex-1 p-2.5 bg-white dark:bg-white/[0.05] rounded-xl border border-slate-200 dark:border-white/[0.08] text-emerald-600 dark:text-emerald-200">
                3. Custo dos Produtos Vendidos (CPV)
                <br />
                <span className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">Baixa da ordem faturada para a DRE</span>
              </div>
            </div>
          </section>

          {/* 6. Relações Matemáticas Fundamentais */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              06. Resumo das Fórmulas Contábeis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
              <div className="dash-inset p-3 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 font-sans font-semibold block text-[10px]">Custo Primário:</span>
                <span className="text-slate-900 dark:text-white font-bold">MD + MOD</span>
              </div>
              <div className="dash-inset p-3 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 font-sans font-semibold block text-[10px]">Custo de Transformação:</span>
                <span className="text-slate-900 dark:text-white font-bold">MOD + CIF</span>
              </div>
              <div className="dash-inset p-3 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 font-sans font-semibold block text-[10px]">Custo Fabril Total da OP:</span>
                <span className="text-slate-900 dark:text-white font-bold">MD + MOD + CIF</span>
              </div>
              <div className="dash-inset p-3 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 font-sans font-semibold block text-[10px]">Custo Unitário da OP:</span>
                <span className="text-slate-900 dark:text-white font-bold">Custo Fabril Total ÷ Quantidade</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-900/[0.02] dark:bg-white/[0.03] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 dash-cobalt-btn text-white rounded-full font-semibold text-xs transition-all cursor-pointer"
          >
            Entendido / Fechar Guia
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
