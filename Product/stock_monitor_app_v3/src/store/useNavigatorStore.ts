"use client";

import { create } from "zustand";

import {
  runMacroResearch,
  runStockSelection,
  runDebate,
  runFinalEvaluation,
  runMockPipeline,
} from "@/services/gemini";
import type {
  NavigatorSettings,
  NavigatorState,
  NavigatorExport,
  MacroResult,
  StockSelectionResult,
  DebateResult,
  FinalEvaluation,
  PipelineStep,
  PipelineStepState,
  PipelineStatus,
} from "@/types/navigator";
import {
  DEFAULT_PIPELINE_STEPS,
  INITIAL_NAVIGATOR_STATE,
} from "@/types/navigator";

// ────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────

const STORAGE_KEY = "stock-monitor-navigator-v1";
const EXPORT_VERSION = "1.0";
const MODAL_CLOSE_DELAY_MS = 600;

// ────────────────────────────────────────────────
// localStorage helpers (SSR-safe)
// ────────────────────────────────────────────────

interface PersistedNavigator {
  settings: NavigatorSettings | null;
  macro: MacroResult | null;
  stocks: StockSelectionResult | null;
  debate: DebateResult | null;
  final: FinalEvaluation | null;
  executedAt: string | null;
}

function readStorage(): PersistedNavigator | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedNavigator;
  } catch {
    return null;
  }
}

function writeStorage(data: PersistedNavigator): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("[navigator-storage] failed to persist:", error);
  }
}

function persist(get: () => NavigatorStore): void {
  const { settings, macro, stocks, debate, final: finalEval, executedAt } = get();
  writeStorage({ settings, macro, stocks, debate, final: finalEval, executedAt });
}

// ────────────────────────────────────────────────
// Pipeline step helpers
// ────────────────────────────────────────────────

function freshSteps(): PipelineStepState[] {
  return DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s }));
}

function updateStepStatus(
  steps: PipelineStepState[],
  step: PipelineStep,
  status: PipelineStepState["status"],
): PipelineStepState[] {
  return steps.map((s) =>
    s.step === step ? { ...s, status } : s,
  );
}

// ────────────────────────────────────────────────
// Store interface
// ────────────────────────────────────────────────

interface NavigatorStore extends NavigatorState {
  /** Whether the setup / pipeline modal is open. */
  isModalOpen: boolean;

  // — Settings & Modal —
  openModal: () => void;
  closeModal: () => void;
  updateSettings: (patch: Partial<NavigatorSettings>) => void;

  // — Pipeline —
  /** Execute the full 4-step AI pipeline. */
  runPipeline: () => Promise<void>;
  resetPipeline: () => void;

  // — Data Management —
  exportData: () => NavigatorExport | null;
  importData: (data: NavigatorExport) => void;
}

// ────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────

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

  // ────────────────────────────────────────────────
  // Settings & Modal
  // ────────────────────────────────────────────────

  openModal: () => set({ isModalOpen: true }),

  closeModal: () => set({ isModalOpen: false }),

  updateSettings: (patch) => {
    const current = get().settings ?? { market: "JP" as const, risk: "mid" as const, horizon: "mid" as const };
    const next: NavigatorSettings = { ...current, ...patch };
    set({ settings: next });
    persist(get);
  },

  // ────────────────────────────────────────────────
  // Pipeline execution
  // ────────────────────────────────────────────────

  /**
   * Run the full analysis pipeline (4 steps).
   *
   * 1. Validates that all 3 settings fields are present.
   * 2. Fetches API key from `/api/navigator/config`.
   * 3. If no key → uses mock pipeline; otherwise runs each step sequentially.
   * 4. Persists results to localStorage on success.
   */
  runPipeline: async () => {
    const { settings } = get();

    // — Validate settings —
    if (!settings || !settings.market || !settings.risk || !settings.horizon) {
      set({ status: "error", error: "すべての設定を入力してください" });
      return;
    }

    // — Reset state for new run —
    set({
      status: "running" as PipelineStatus,
      progress: 0,
      currentStep: 0 as PipelineStep,
      steps: freshSteps(),
      macro: null,
      stocks: null,
      debate: null,
      final: null,
      error: null,
      executedAt: null,
    });

    try {
      // — Fetch API key —
      const configRes = await fetch("/api/navigator/config");
      const { apiKey } = await configRes.json();

      if (!apiKey) {
        // ── Mock pipeline ──
        const mockResult = await runMockPipeline(settings);

        set({
          macro: mockResult.macro,
          stocks: mockResult.stocks,
          debate: mockResult.debate,
          final: mockResult.final,
          status: "done",
          progress: 100,
          currentStep: 3 as PipelineStep,
          steps: DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const })),
          executedAt: new Date().toISOString(),
        });

        persist(get);

        setTimeout(() => {
          get().closeModal();
        }, MODAL_CLOSE_DELAY_MS);

        return;
      }

      // ── Step 0: Macro Research ──
      set((state) => ({
        currentStep: 0 as PipelineStep,
        steps: updateStepStatus(state.steps, 0, "running"),
        progress: 10,
      }));

      const macro = await runMacroResearch(settings, apiKey);

      if (!macro) {
        set((state) => ({
          steps: updateStepStatus(state.steps, 0, "error"),
          status: "error",
          error: "マクロ分析に失敗しました (Step 0)",
        }));
        return;
      }

      set((state) => ({
        macro,
        steps: updateStepStatus(state.steps, 0, "done"),
        progress: 30,
      }));

      // ── Step 1: Stock Selection ──
      set((state) => ({
        currentStep: 1 as PipelineStep,
        steps: updateStepStatus(state.steps, 1, "running"),
        progress: 40,
      }));

      const stocks = await runStockSelection(settings, macro, apiKey);

      if (!stocks) {
        set((state) => ({
          steps: updateStepStatus(state.steps, 1, "error"),
          status: "error",
          error: "銘柄選定に失敗しました (Step 1)",
        }));
        return;
      }

      set((state) => ({
        stocks,
        steps: updateStepStatus(state.steps, 1, "done"),
        progress: 58,
      }));

      // ── Step 2: Debate ──
      set((state) => ({
        currentStep: 2 as PipelineStep,
        steps: updateStepStatus(state.steps, 2, "running"),
        progress: 65,
      }));

      const debate = await runDebate(settings, stocks, macro, apiKey);

      if (!debate) {
        set((state) => ({
          steps: updateStepStatus(state.steps, 2, "error"),
          status: "error",
          error: "ディベート分析に失敗しました (Step 2)",
        }));
        return;
      }

      set((state) => ({
        debate,
        steps: updateStepStatus(state.steps, 2, "done"),
        progress: 80,
      }));

      // ── Step 3: Final Evaluation ──
      set((state) => ({
        currentStep: 3 as PipelineStep,
        steps: updateStepStatus(state.steps, 3, "running"),
        progress: 88,
      }));

      const finalEval = await runFinalEvaluation(settings, stocks, debate, macro, apiKey);

      if (!finalEval) {
        set((state) => ({
          steps: updateStepStatus(state.steps, 3, "error"),
          status: "error",
          error: "最終評価に失敗しました (Step 3)",
        }));
        return;
      }

      set((state) => ({
        final: finalEval,
        steps: updateStepStatus(state.steps, 3, "done"),
        progress: 100,
      }));

      // ── Success ──
      set({
        status: "done",
        executedAt: new Date().toISOString(),
      });

      persist(get);

      setTimeout(() => {
        get().closeModal();
      }, MODAL_CLOSE_DELAY_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "パイプラインの実行中にエラーが発生しました";
      set({ status: "error", error: message });
    }
  },

  // ────────────────────────────────────────────────
  // Reset
  // ────────────────────────────────────────────────

  resetPipeline: () => {
    const { isModalOpen } = get();
    set({ ...INITIAL_NAVIGATOR_STATE, isModalOpen });
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
      version: EXPORT_VERSION,
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
      status: "done",
      progress: 100,
      currentStep: 3 as PipelineStep,
      steps: DEFAULT_PIPELINE_STEPS.map((s) => ({ ...s, status: "done" as const })),
      error: null,
      executedAt: data.exportedAt,
    });
    persist(get);
  },
}));

// ────────────────────────────────────────────────
// SSR-safe initialization
// ────────────────────────────────────────────────

/**
 * Hydrate navigator store from localStorage.
 *
 * Call this once from a top-level client component (e.g. layout or provider).
 * Must NOT be called at module scope — only inside useEffect or equivalent.
 */
export function initNavigatorStore(): void {
  const saved = readStorage();
  if (!saved) return;

  const hasResults = saved.macro || saved.stocks || saved.debate || saved.final;

  useNavigatorStore.setState({
    settings: saved.settings,
    macro: saved.macro,
    stocks: saved.stocks,
    debate: saved.debate,
    final: saved.final,
    executedAt: saved.executedAt,
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
