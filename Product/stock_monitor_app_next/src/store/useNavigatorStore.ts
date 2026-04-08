"use client";

import { create } from "zustand";

import { buildRecommendationBaseline, buildRecommendationDiffs } from "@/lib/navigatorDiff";
import {
  buildStageBridgeMessage,
  nextAutoAdvanceSeconds,
} from "@/lib/navigatorIntervention";
import type {
  NavigatorSettings,
  NavigatorState,
  NavigatorAnalysisMode,
  NavigatorExport,
  NavigatorStageLogEntry,
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
const INTERVENTION_AUTO_ADVANCE_SECONDS = 8;
const BRIDGE_MESSAGE_DELAY_MS = 700;
const MAX_STAGE_HISTORY = 48;

// ────────────────────────────────────────────────
// localStorage helpers (SSR-safe)
// ────────────────────────────────────────────────

interface PersistedNavigator {
  settings: NavigatorSettings | null;
  macro: MacroResult | null;
  stocks: StockSelectionResult | null;
  debate: DebateResult | null;
  final: FinalEvaluation | null;
  analysisMode?: NavigatorAnalysisMode;
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
  const {
    settings,
    macro,
    stocks,
    debate,
    final: finalEval,
    analysisMode,
    executedAt,
  } = get();
  writeStorage({
    settings,
    macro,
    stocks,
    debate,
    final: finalEval,
    analysisMode,
    executedAt,
  });
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

type StepResult =
  | MacroResult
  | StockSelectionResult
  | DebateResult
  | FinalEvaluation;

interface RunStepRequest {
  step: PipelineStep;
  settings: NavigatorSettings;
  macro?: MacroResult;
  stocks?: StockSelectionResult;
  debate?: DebateResult;
}

interface RunStepResponse {
  result: StepResult | null;
  error: string | null;
  mock?: boolean;
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildStageLog(
  step: PipelineStep,
  result: StepResult,
  settings: NavigatorSettings,
): string {
  switch (step) {
    case 0: {
      const macro = result as MacroResult;
      const topSector = macro.sectors[0]?.name ?? "N/A";
      const keyRisk = macro.risks[0]?.name ?? "N/A";
      return [
        "$ navigator.stage[1] macro-scan --live",
        `market=${settings.market} risk=${settings.risk} horizon=${settings.horizon}`,
        `env=${macro.label} top_sector=${topSector}`,
        `risk_watch=${keyRisk}`,
      ].join("\n");
    }
    case 1: {
      const stocks = result as StockSelectionResult;
      const preview = stocks.stocks
        .slice(0, 3)
        .map((s) => `${s.code}:${s.cfTrend}`)
        .join(", ");
      return [
        "$ navigator.stage[2] stock-selection --live",
        `selected=${stocks.stocks.length} instruments`,
        `preview=${preview || "N/A"}`,
        "status=screening complete",
      ].join("\n");
    }
    case 2: {
      const debate = result as DebateResult;
      const goCount = debate.verdicts.filter((v) => v.signal === "go").length;
      const watchCount = debate.verdicts.filter((v) => v.signal === "watch").length;
      const outCount = debate.verdicts.filter((v) => v.signal === "out").length;
      return [
        "$ navigator.stage[3] convergence-debate --live",
        `verdicts=${debate.verdicts.length} go=${goCount} watch=${watchCount} out=${outCount}`,
        "status=committee consensus locked",
      ].join("\n");
    }
    case 3: {
      const finalEval = result as FinalEvaluation;
      const topStock = finalEval.bestStocks[0]?.code ?? "N/A";
      const topFund = finalEval.bestFunds[0]?.code ?? "N/A";
      return [
        "$ navigator.stage[4] final-evaluation --live",
        `top_stock=${topStock} top_fund=${topFund}`,
        `allocation=stocks:${finalEval.alloc.stocks}% funds:${finalEval.alloc.funds}% cash:${finalEval.alloc.cash}%`,
        "status=final package generated",
      ].join("\n");
    }
    default:
      return "$ navigator.stage[unknown]";
  }
}

function stageBootLog(step: PipelineStep, settings: NavigatorSettings): string {
  const stage = step + 1;
  return [
    `$ navigator.stage[${stage}] booting...`,
    `context market=${settings.market} risk=${settings.risk} horizon=${settings.horizon}`,
    "stream=live_thinking",
  ].join("\n");
}

function stageErrorLog(step: PipelineStep, detail: string): string {
  return [`$ navigator.stage[${step + 1}] error`, truncate(detail, 320)].join("\n");
}

function createStageLogEntry(
  step: PipelineStep,
  text: string,
  runId: string,
): NavigatorStageLogEntry {
  return {
    id: `${runId}-${step}-${Date.now()}`,
    runId,
    step,
    label: DEFAULT_PIPELINE_STEPS[step]?.label ?? `STATE ${step + 1}`,
    text,
    completedAt: new Date().toISOString(),
  };
}

function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendStageHistory(
  history: NavigatorStageLogEntry[],
  nextEntry: NavigatorStageLogEntry,
): NavigatorStageLogEntry[] {
  const merged = [...history, nextEntry];
  if (merged.length <= MAX_STAGE_HISTORY) return merged;
  return merged.slice(merged.length - MAX_STAGE_HISTORY);
}

async function waitForInterventionGate(
  completedStep: PipelineStep,
  nextStep: PipelineStep,
  set: (partial: Partial<NavigatorStore> | ((state: NavigatorStore) => Partial<NavigatorStore>)) => void,
  get: () => NavigatorStore,
): Promise<string | null> {
  set({
    intervention: {
      completedStep,
      nextStep,
      remainingSeconds: INTERVENTION_AUTO_ADVANCE_SECONDS,
      input: "",
      advanceRequested: false,
    },
  });

  while (true) {
    const state = get();
    const intervention = state.intervention;
    if (
      !intervention ||
      intervention.completedStep !== completedStep ||
      intervention.nextStep !== nextStep
    ) {
      return null;
    }

    if (intervention.advanceRequested || intervention.remainingSeconds <= 0) {
      const note = intervention.input.trim() || null;
      set({ intervention: null });
      return note;
    }

    await sleep(1000);
    const latest = get().intervention;
    if (
      !latest ||
      latest.completedStep !== completedStep ||
      latest.nextStep !== nextStep ||
      latest.advanceRequested
    ) {
      continue;
    }

    const nextRemaining = nextAutoAdvanceSeconds(latest.remainingSeconds, latest.input);
    if (nextRemaining === latest.remainingSeconds) {
      continue;
    }
    set((current) => {
      const active = current.intervention;
      if (
        !active ||
        active.completedStep !== completedStep ||
        active.nextStep !== nextStep ||
        active.advanceRequested
      ) {
        return {};
      }
      return {
        intervention: {
          ...active,
          remainingSeconds: nextRemaining,
        },
      };
    });
  }
}

async function runStep<T extends StepResult>(
  request: RunStepRequest,
): Promise<{ result: T; mock: boolean }> {
  const response = await fetch("/api/navigator/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const raw = await response.text();
  let payload: RunStepResponse | null = null;
  if (raw.trim().length > 0) {
    try {
      payload = JSON.parse(raw) as RunStepResponse;
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (非JSON応答)`);
    }
    throw new Error("API応答の形式が不正です (非JSON)");
  }

  if (!response.ok || payload.error || !payload.result) {
    const reason = payload.error || `Step ${request.step} failed with HTTP ${response.status}`;
    throw new Error(truncate(reason));
  }

  return {
    result: payload.result as T,
    mock: Boolean(payload.mock),
  };
}

// ────────────────────────────────────────────────
// Store interface
// ────────────────────────────────────────────────

interface NavigatorStore extends NavigatorState {
  /** Whether the setup / pipeline modal is open. */
  isModalOpen: boolean;
  /** Identifier of the currently executing run (null when idle/done/error). */
  currentRunId: string | null;
  /** Last successful final evaluation, used as diff baseline across reruns. */
  lastSuccessfulFinal: FinalEvaluation | null;

  // — Settings & Modal —
  openModal: () => void;
  closeModal: () => void;
  updateSettings: (patch: Partial<NavigatorSettings>) => void;

  // — Pipeline —
  /** Execute the full 4-step AI pipeline. */
  runPipeline: () => Promise<void>;
  updateInterventionInput: (value: string) => void;
  requestInterventionAdvance: () => void;
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
  currentRunId: null,
  lastSuccessfulFinal: null,

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
   * 2. Executes each step via `/api/navigator/run` (server-side).
   * 4. Persists results to localStorage on success.
   */
  runPipeline: async () => {
    const { settings, final: previousFinal, lastSuccessfulFinal } = get();
    const recommendationBaseline = buildRecommendationBaseline(lastSuccessfulFinal ?? previousFinal);
    const runId = createRunId();

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
      logText: "",
      logStep: null,
      bridgeMessage: null,
      intervention: null,
      recommendationDiffs: {},
      currentRunId: runId,
      macro: null,
      stocks: null,
      debate: null,
      final: null,
      analysisMode: null,
      diagnosticMessage: null,
      error: null,
    });

    try {
      // ── Step 0: Macro Research ──
      set((state) => ({
        currentStep: 0 as PipelineStep,
        steps: updateStepStatus(state.steps, 0, "running"),
        logStep: 0 as PipelineStep,
        logText: stageBootLog(0, settings),
        progress: 10,
      }));

      let macro: MacroResult;
      try {
        const step0 = await runStep<MacroResult>({ step: 0, settings });
        if (step0.mock) {
          throw new Error("mockフォールバック結果を検出したため停止しました");
        }
        macro = step0.result;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Step 0 error";
        const errorLog = stageErrorLog(0, detail);
        set((state) => ({
          steps: updateStepStatus(state.steps, 0, "error"),
          status: "error",
          error: "マクロ分析に失敗しました (Step 0)。設定を確認して再実行してください。",
          diagnosticMessage: detail,
          logStep: 0 as PipelineStep,
          logText: errorLog,
          logHistory: appendStageHistory(state.logHistory, createStageLogEntry(0, errorLog, runId)),
          currentRunId: null,
          intervention: null,
          bridgeMessage: null,
        }));
        return;
      }

      const step0Log = buildStageLog(0, macro, settings);
      set((state) => ({
        macro,
        steps: updateStepStatus(state.steps, 0, "done"),
        logStep: 0 as PipelineStep,
        logText: step0Log,
        logHistory: appendStageHistory(state.logHistory, createStageLogEntry(0, step0Log, runId)),
        progress: 30,
      }));

      const step0Intervention = await waitForInterventionGate(0, 1, set, get);
      const bridge01 = buildStageBridgeMessage(0, 1, step0Intervention);
      set({
        logStep: 0 as PipelineStep,
        logText: bridge01,
        bridgeMessage: bridge01,
      });
      await sleep(BRIDGE_MESSAGE_DELAY_MS);

      // ── Step 1: Stock Selection ──
      set((state) => ({
        currentStep: 1 as PipelineStep,
        steps: updateStepStatus(state.steps, 1, "running"),
        logStep: 1 as PipelineStep,
        logText: stageBootLog(1, settings),
        bridgeMessage: null,
        progress: 40,
      }));

      let stocks: StockSelectionResult;
      try {
        const step1 = await runStep<StockSelectionResult>({ step: 1, settings, macro });
        if (step1.mock) {
          throw new Error("mockフォールバック結果を検出したため停止しました");
        }
        stocks = step1.result;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Step 1 error";
        const errorLog = stageErrorLog(1, detail);
        set((state) => ({
          steps: updateStepStatus(state.steps, 1, "error"),
          status: "error",
          error: "銘柄選定に失敗しました (Step 1)。時間をおいて再実行してください。",
          diagnosticMessage: detail,
          logStep: 1 as PipelineStep,
          logText: errorLog,
          logHistory: appendStageHistory(state.logHistory, createStageLogEntry(1, errorLog, runId)),
          currentRunId: null,
          intervention: null,
          bridgeMessage: null,
        }));
        return;
      }

      const step1Log = buildStageLog(1, stocks, settings);
      set((state) => ({
        stocks,
        steps: updateStepStatus(state.steps, 1, "done"),
        logStep: 1 as PipelineStep,
        logText: step1Log,
        logHistory: appendStageHistory(state.logHistory, createStageLogEntry(1, step1Log, runId)),
        progress: 58,
      }));

      const step1Intervention = await waitForInterventionGate(1, 2, set, get);
      const bridge12 = buildStageBridgeMessage(1, 2, step1Intervention);
      set({
        logStep: 1 as PipelineStep,
        logText: bridge12,
        bridgeMessage: bridge12,
      });
      await sleep(BRIDGE_MESSAGE_DELAY_MS);

      // ── Step 2: Debate ──
      set((state) => ({
        currentStep: 2 as PipelineStep,
        steps: updateStepStatus(state.steps, 2, "running"),
        logStep: 2 as PipelineStep,
        logText: stageBootLog(2, settings),
        bridgeMessage: null,
        progress: 65,
      }));

      let debate: DebateResult;
      try {
        const step2 = await runStep<DebateResult>({ step: 2, settings, macro, stocks });
        if (step2.mock) {
          throw new Error("mockフォールバック結果を検出したため停止しました");
        }
        debate = step2.result;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Step 2 error";
        const errorLog = stageErrorLog(2, detail);
        set((state) => ({
          steps: updateStepStatus(state.steps, 2, "error"),
          status: "error",
          error: "ディベート分析に失敗しました (Step 2)。時間をおいて再実行してください。",
          diagnosticMessage: detail,
          logStep: 2 as PipelineStep,
          logText: errorLog,
          logHistory: appendStageHistory(state.logHistory, createStageLogEntry(2, errorLog, runId)),
          currentRunId: null,
          intervention: null,
          bridgeMessage: null,
        }));
        return;
      }

      const step2Log = buildStageLog(2, debate, settings);
      set((state) => ({
        debate,
        steps: updateStepStatus(state.steps, 2, "done"),
        logStep: 2 as PipelineStep,
        logText: step2Log,
        logHistory: appendStageHistory(state.logHistory, createStageLogEntry(2, step2Log, runId)),
        progress: 80,
      }));

      const step2Intervention = await waitForInterventionGate(2, 3, set, get);
      const bridge23 = buildStageBridgeMessage(2, 3, step2Intervention);
      set({
        logStep: 2 as PipelineStep,
        logText: bridge23,
        bridgeMessage: bridge23,
      });
      await sleep(BRIDGE_MESSAGE_DELAY_MS);

      // ── Step 3: Final Evaluation ──
      set((state) => ({
        currentStep: 3 as PipelineStep,
        steps: updateStepStatus(state.steps, 3, "running"),
        logStep: 3 as PipelineStep,
        logText: stageBootLog(3, settings),
        bridgeMessage: null,
        progress: 88,
      }));

      let finalEval: FinalEvaluation;
      try {
        const step3 = await runStep<FinalEvaluation>({ step: 3, settings, macro, stocks, debate });
        if (step3.mock) {
          throw new Error("mockフォールバック結果を検出したため停止しました");
        }
        finalEval = step3.result;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Step 3 error";
        const errorLog = stageErrorLog(3, detail);
        set((state) => ({
          steps: updateStepStatus(state.steps, 3, "error"),
          status: "error",
          error: "最終評価に失敗しました (Step 3)。時間をおいて再実行してください。",
          diagnosticMessage: detail,
          logStep: 3 as PipelineStep,
          logText: errorLog,
          logHistory: appendStageHistory(state.logHistory, createStageLogEntry(3, errorLog, runId)),
          currentRunId: null,
          intervention: null,
          bridgeMessage: null,
        }));
        return;
      }

      const step3Log = buildStageLog(3, finalEval, settings);
      const recommendationDiffs = buildRecommendationDiffs(finalEval, recommendationBaseline);
      set((state) => ({
        final: finalEval,
        steps: updateStepStatus(state.steps, 3, "done"),
        logStep: 3 as PipelineStep,
        logText: step3Log,
        logHistory: appendStageHistory(state.logHistory, createStageLogEntry(3, step3Log, runId)),
        intervention: null,
        bridgeMessage: null,
        recommendationDiffs,
        progress: 100,
      }));

      // ── Success ──
      set({
        status: "done",
        analysisMode: "live",
        diagnosticMessage: null,
        executedAt: new Date().toISOString(),
        currentRunId: null,
        lastSuccessfulFinal: finalEval,
      });

      persist(get);

      setTimeout(() => {
        get().closeModal();
      }, MODAL_CLOSE_DELAY_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "パイプラインの実行中にエラーが発生しました";
      const errorLog = stageErrorLog(get().currentStep, message);
      set((state) => ({
        status: "error",
        steps: updateStepStatus(state.steps, state.currentStep, "error"),
        error: "パイプラインの実行中にエラーが発生しました。時間をおいて再実行してください。",
        diagnosticMessage: truncate(message),
        logStep: state.currentStep,
        logText: errorLog,
        logHistory: appendStageHistory(
          state.logHistory,
          createStageLogEntry(state.currentStep, errorLog, runId),
        ),
        currentRunId: null,
        intervention: null,
        bridgeMessage: null,
      }));
    }
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
      analysisMode: null,
      diagnosticMessage: null,
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
    analysisMode: saved.analysisMode ?? null,
    diagnosticMessage: null,
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
