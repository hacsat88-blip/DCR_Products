"use client";

import { create } from "zustand";

import type {
  NavigatorSettings,
  NavigatorExport,
  PipelineStep,
  PipelineStatus,
} from "@/types/navigator";
import {
  DEFAULT_PIPELINE_STEPS,
  INITIAL_NAVIGATOR_STATE,
} from "@/types/navigator";
import {
  NAVIGATOR_EXPORT_VERSION,
  persistNavigatorSnapshot,
  readNavigatorStorage,
} from "./navigatorPersistence";
import {
  runNavigatorPipeline,
  type NavigatorPipelineStore,
} from "./navigatorPipelineRunner";

function persist(get: () => NavigatorStore): void {
  const {
    settings,
    macro,
    stocks,
    debate,
    final: finalEval,
    analysisMode,
    executedAt,
  } = get();
  persistNavigatorSnapshot({
    settings,
    macro,
    stocks,
    debate,
    final: finalEval,
    analysisMode,
    executedAt,
  });
}

interface NavigatorStore extends NavigatorPipelineStore {
  /** Whether the setup / pipeline modal is open. */
  isModalOpen: boolean;

  // — Settings & Modal —
  openModal: () => void;
  updateSettings: (patch: Partial<NavigatorSettings>) => void;

  // — Pipeline —
  /** Execute the full 4-step AI pipeline. */
  runPipeline: () => Promise<void>;
  excludeInstrument: (code: string) => void;
  updateInterventionInput: (value: string) => void;
  requestInterventionAdvance: () => void;
  resetPipeline: () => void;
  /** Reset pipeline results only; preserves current settings for immediate re-run. */
  restartPipeline: () => void;

  // — Data Management —
  exportData: () => NavigatorExport | null;
  importData: (data: NavigatorExport) => void;
}

/**
 * Zustand store for the AI Investment Navigator feature.
 *
 * Manages navigator settings, the 4-step analysis pipeline
 * (macro → selection → debate → final), and result persistence.
 */
export const useNavigatorStore = create<NavigatorStore>((set, get) => ({
  // — State (from NavigatorState) —
  ...INITIAL_NAVIGATOR_STATE,

  // — Additional UI state —
  isModalOpen: false,
  currentRunId: null,
  lastSuccessfulFinal: null,

  // ────────────────────────────────────────────────
  // Settings & Modal
  // ────────────────────────────────────────────────

  openModal: () => set({ isModalOpen: true }),

  closeModal: () => set({ isModalOpen: false }),

  updateSettings: (patch) => {
    const current = get().settings ?? {
      market: "JP" as const,
      risk: "mid" as const,
      horizon: "mid" as const,
      freeInput: "",
    };
    const next: NavigatorSettings = { ...current, ...patch };
    set({ settings: next });
    persist(get);
  },

  // ────────────────────────────────────────────────
  // Pipeline execution
  // ────────────────────────────────────────────────

  runPipeline: async () => {
    await runNavigatorPipeline({
      set,
      get,
      persist: () => persist(get),
    });
  },

  excludeInstrument: (code) => {
    const normalizedCode = code.trim();
    if (!normalizedCode) return;

    set((state) => {
      const removedCodes = new Set<string>();
      const removedCandidateNames = new Set<string>();
      const stocksBefore = state.stocks?.stocks ?? [];
      const debateBefore = state.debate?.verdicts ?? [];
      const finalBefore = state.final;

      for (const s of stocksBefore) {
        if (s.code === normalizedCode) {
          removedCodes.add(s.code);
          removedCandidateNames.add(s.name);
        }
      }
      for (const v of debateBefore) {
        if (v.code === normalizedCode) {
          removedCodes.add(v.code);
        }
      }
      for (const p of finalBefore?.bestStocks ?? []) {
        if (p.code === normalizedCode) {
          removedCodes.add(p.code);
          removedCandidateNames.add(p.name);
        }
      }
      for (const p of finalBefore?.bestFunds ?? []) {
        if (p.code === normalizedCode) {
          removedCodes.add(p.code);
          removedCandidateNames.add(p.name);
        }
      }

      const finalIdentifiers = new Set<string>();
      for (const entry of finalBefore?.matrix ?? []) {
        finalIdentifiers.add(entry.name);
      }
      for (const pair of finalBefore?.corrMatrix ?? []) {
        finalIdentifiers.add(pair.a);
        finalIdentifiers.add(pair.b);
      }

      const knownCodes = new Set<string>();
      for (const s of stocksBefore) {
        knownCodes.add(s.code);
      }
      for (const v of debateBefore) {
        knownCodes.add(v.code);
      }
      for (const p of finalBefore?.bestStocks ?? []) {
        knownCodes.add(p.code);
      }
      for (const p of finalBefore?.bestFunds ?? []) {
        knownCodes.add(p.code);
      }

      const usesCodeIdentifiers = [...knownCodes].some((candidate) => finalIdentifiers.has(candidate));

      const removeIdentifiers = new Set<string>(removedCodes);
      if (!usesCodeIdentifiers) {
        for (const name of removedCandidateNames) {
          // In name-based outputs, remove only names that are actually present.
          if (finalIdentifiers.has(name)) {
            removeIdentifiers.add(name);
          }
        }
      }

      const stocks = state.stocks
        ? {
            ...state.stocks,
            stocks: state.stocks.stocks.filter((s) => s.code !== normalizedCode),
          }
        : null;

      const debate = state.debate
        ? {
            ...state.debate,
            verdicts: state.debate.verdicts.filter((v) => v.code !== normalizedCode),
          }
        : null;

      const final = state.final
        ? {
            ...state.final,
            bestStocks: state.final.bestStocks.filter((p) => p.code !== normalizedCode),
            bestFunds: state.final.bestFunds.filter((p) => p.code !== normalizedCode),
            matrix: state.final.matrix.filter((m) => !removeIdentifiers.has(m.name)),
            corrMatrix: state.final.corrMatrix.filter(
              (c) => !removeIdentifiers.has(c.a) && !removeIdentifiers.has(c.b),
            ),
          }
        : null;

      const recommendationDiffs = { ...state.recommendationDiffs };
      delete recommendationDiffs[normalizedCode];

      return {
        stocks,
        debate,
        final,
        recommendationDiffs,
      };
    });

    persist(get);
  },

  updateInterventionInput: (value) => {
    set((state) => {
      if (!state.intervention) return {};
      return {
        intervention: {
          ...state.intervention,
          input: value,
        },
      };
    });
  },

  requestInterventionAdvance: () => {
    set((state) => {
      if (!state.intervention) return {};
      return {
        intervention: {
          ...state.intervention,
          advanceRequested: true,
        },
      };
    });
  },

  // ────────────────────────────────────────────────
  // Reset
  // ────────────────────────────────────────────────

  resetPipeline: () => {
    const { isModalOpen } = get();
    set({
      ...INITIAL_NAVIGATOR_STATE,
      isModalOpen,
      currentRunId: null,
      lastSuccessfulFinal: null,
    });
    persist(get);
  },

  restartPipeline: () => {
    // Preserves settings so the user can re-run without re-entering them.
    const { isModalOpen, settings } = get();
    set({
      ...INITIAL_NAVIGATOR_STATE,
      settings,
      isModalOpen,
      currentRunId: null,
      lastSuccessfulFinal: null,
    });
    persist(get);
  },

  // ────────────────────────────────────────────────
  // Data Management
  // ────────────────────────────────────────────────

  /** Export current navigator results as a portable snapshot. */
  exportData: () => {
    const { settings, macro, stocks, debate, final: finalEval } = get();
    if (!settings) return null;

    return {
      version: NAVIGATOR_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      data: { macro, stocks, debate, final: finalEval },
    };
  },

  /** Import a previously exported navigator snapshot, restoring all results. */
  importData: (data) => {
    set({
      settings: data.settings,
      macro: data.data.macro,
      stocks: data.data.stocks,
      debate: data.data.debate,
      final: data.data.final,
      analysisMode: null,
      diagnosticMessage: null,
      retryState: null,
      status: "done",
      progress: 100,
      currentStep: 3 as PipelineStep,
      steps: DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const })),
      logText: "",
      logStep: null,
      logHistory: [],
      bridgeMessage: null,
      intervention: null,
      recommendationDiffs: {},
      error: null,
      executedAt: data.exportedAt,
      currentRunId: null,
      lastSuccessfulFinal: data.data.final,
    });
    persist(get);
  },
}));

/**
 * Hydrate navigator store from localStorage.
 *
 * Call this once from a top-level client component (e.g. layout or provider).
 * Must NOT be called at module scope — only inside useEffect or equivalent.
 */
export function initNavigatorStore(): void {
  const saved = readNavigatorStorage();
  if (!saved) return;

  const hasResults = saved.macro || saved.stocks || saved.debate || saved.final;

  useNavigatorStore.setState({
    settings: saved.settings,
    macro: saved.macro,
    stocks: saved.stocks,
    debate: saved.debate,
    final: saved.final,
    analysisMode: saved.analysisMode ?? null,
    diagnosticMessage: null,
    retryState: null,
    logText: "",
    logStep: null,
    logHistory: [],
    bridgeMessage: null,
    intervention: null,
    recommendationDiffs: {},
    executedAt: saved.executedAt,
    currentRunId: null,
    lastSuccessfulFinal: saved.final,
    ...(hasResults
      ? {
          status: "done" as PipelineStatus,
          progress: 100,
          currentStep: 3 as PipelineStep,
          steps: DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const })),
        }
      : {}),
  });
}
