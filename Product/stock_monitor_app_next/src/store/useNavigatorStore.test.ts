import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  INITIAL_NAVIGATOR_STATE,
  type DebateResult,
  type FinalEvaluation,
  type MacroResult,
  type NavigatorRetryState,
  type NavigatorSettings,
  type PipelineStep,
  type StockSelectionResult,
} from "@/types/navigator";

import { useNavigatorStore } from "./useNavigatorStore";

const SETTINGS: NavigatorSettings = {
  market: "JP",
  risk: "mid",
  horizon: "mid",
};

const RATE_LIMIT_RETRY: NavigatorRetryState = {
  reason: "rate_limit",
  retryAfterSeconds: 120,
  retryAt: "2099-01-01T00:02:00.000Z",
};

const MACRO_RESULT: MacroResult = {
  environment: "neutral",
  label: "🟡中立",
  sectors: [{ name: "通信", reason: "ディフェンシブ需要が堅調。" }],
  risks: [{ name: "金利動向", stars: 3, trend: "→" }],
  chain: null,
};

const STOCK_SELECTION_RESULT: StockSelectionResult = {
  stocks: [
    {
      code: "9424",
      name: "日本通信",
      price: "¥200",
      fcfYield: "5.0%",
      cfMargin: "12.0%",
      cfTrend: "↗",
      sector: "通信",
      type: "stock",
      reason: "営業CFが改善し、利益の質も安定している。",
    },
  ],
};

const DEBATE_RESULT: DebateResult = {
  verdicts: [
    {
      code: "9424",
      signal: "watch",
      priority: "中",
      confidence: 68,
      pro: "既存顧客の積み上がりが見込める。",
      con: "成長加速の確度は追加確認が必要。",
      cfNote: "営業CFは黒字を維持。",
    },
  ],
};

const originalFetch = globalThis.fetch;

function buildJsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function resetStore(): void {
  useNavigatorStore.setState({
    ...INITIAL_NAVIGATOR_STATE,
    isModalOpen: false,
    currentRunId: null,
    lastSuccessfulFinal: null,
  });
}

function buildSuccessResponse(body: unknown): Response {
  return buildJsonResponse(200, { result: body, error: null });
}

function buildRateLimitResponse(step: PipelineStep): Response {
  return buildJsonResponse(
    429,
    {
      result: null,
      error: `Step ${step} は API混雑のため一時停止しました。約2分後に再実行してください。`,
      retry: RATE_LIMIT_RETRY,
    },
    { "Retry-After": "120" },
  );
}

function buildRateLimitNonJsonResponse(): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": "120" },
  });
}

async function runPipelineWithAutoAdvance(): Promise<void> {
  await act(async () => {
    const runPromise = useNavigatorStore.getState().runPipeline();
    await vi.runAllTimersAsync();
    await runPromise;
  });
}

describe("useNavigatorStore retry handling", () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stores retry metadata when step 0 returns a rate-limit response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      buildJsonResponse(
        429,
        {
          result: null,
          error: "Step 0 は API混雑のため一時停止しました。約2分後に再実行してください。",
          retry: {
            reason: "rate_limit",
            retryAfterSeconds: 120,
            retryAt: "2099-01-01T00:02:00.000Z",
          },
        },
        { "Retry-After": "120" },
      ),
    ) as typeof fetch;

    useNavigatorStore.setState({ settings: SETTINGS });

    await act(async () => {
      await useNavigatorStore.getState().runPipeline();
    });

    const state = useNavigatorStore.getState() as typeof useNavigatorStore.getState extends () => infer T
      ? T & { retryState?: unknown }
      : never;

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(state.status).toBe("error");
    expect(state.currentStep).toBe(0 as PipelineStep);
    expect(state.error).toContain("AI分析は一時的に混雑しています");
    expect(state.diagnosticMessage).toContain("API混雑");
    expect(state.retryState).toEqual({
      reason: "rate_limit",
      retryAfterSeconds: 120,
      retryAt: "2099-01-01T00:02:00.000Z",
    });
  });

  it("keeps the generic step 0 error for non-rate-limit failures", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      buildJsonResponse(502, {
        result: null,
        error: "Step 0 の処理に失敗しました。時間をおいて再実行してください。 (detail: Gemini failed)",
      }),
    ) as typeof fetch;

    useNavigatorStore.setState({ settings: SETTINGS });

    await act(async () => {
      await useNavigatorStore.getState().runPipeline();
    });

    const state = useNavigatorStore.getState() as typeof useNavigatorStore.getState extends () => infer T
      ? T & { retryState?: unknown }
      : never;

    expect(state.status).toBe("error");
    expect(state.error).toBe("マクロ分析に失敗しました (Step 0)。設定を確認して再実行してください。");
    expect(state.diagnosticMessage).toContain("Gemini failed");
    expect(state.retryState ?? null).toBeNull();
  });

  it.each([
    {
      step: 1 as PipelineStep,
      responses: [buildSuccessResponse(MACRO_RESULT), buildRateLimitResponse(1)],
      expectedError: "銘柄選定に失敗しました (Step 1)。時間をおいて再実行してください。",
    },
    {
      step: 2 as PipelineStep,
      responses: [
        buildSuccessResponse(MACRO_RESULT),
        buildSuccessResponse(STOCK_SELECTION_RESULT),
        buildRateLimitResponse(2),
      ],
      expectedError: "ディベート分析に失敗しました (Step 2)。時間をおいて再実行してください。",
    },
    {
      step: 3 as PipelineStep,
      responses: [
        buildSuccessResponse(MACRO_RESULT),
        buildSuccessResponse(STOCK_SELECTION_RESULT),
        buildSuccessResponse(DEBATE_RESULT),
        buildRateLimitResponse(3),
      ],
      expectedError: "最終評価に失敗しました (Step 3)。時間をおいて再実行してください。",
    },
  ])("preserves retry metadata when step $step returns a rate-limit response", async ({
    step,
    responses,
    expectedError,
  }) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    for (const response of responses) {
      fetchMock.mockResolvedValueOnce(response);
    }
    globalThis.fetch = fetchMock as typeof fetch;

    useNavigatorStore.setState({ settings: SETTINGS });

    await runPipelineWithAutoAdvance();

    const state = useNavigatorStore.getState() as typeof useNavigatorStore.getState extends () => infer T
      ? T & { retryState?: unknown }
      : never;

    expect(globalThis.fetch).toHaveBeenCalledTimes(step + 1);
    expect(state.status).toBe("error");
    expect(state.currentStep).toBe(step);
    expect(state.error).toBe(expectedError);
    expect(state.diagnosticMessage).toContain(`Step ${step} は API混雑`);
    expect(state.retryState).toEqual(RATE_LIMIT_RETRY);
  });

  it.each([
    {
      step: 1 as PipelineStep,
      responses: [buildSuccessResponse(MACRO_RESULT), buildRateLimitNonJsonResponse()],
      expectedError: "銘柄選定に失敗しました (Step 1)。時間をおいて再実行してください。",
    },
    {
      step: 2 as PipelineStep,
      responses: [
        buildSuccessResponse(MACRO_RESULT),
        buildSuccessResponse(STOCK_SELECTION_RESULT),
        buildRateLimitNonJsonResponse(),
      ],
      expectedError: "ディベート分析に失敗しました (Step 2)。時間をおいて再実行してください。",
    },
    {
      step: 3 as PipelineStep,
      responses: [
        buildSuccessResponse(MACRO_RESULT),
        buildSuccessResponse(STOCK_SELECTION_RESULT),
        buildSuccessResponse(DEBATE_RESULT),
        buildRateLimitNonJsonResponse(),
      ],
      expectedError: "最終評価に失敗しました (Step 3)。時間をおいて再実行してください。",
    },
  ])("keeps retry metadata for non-JSON 429 errors at step $step", async ({
    step,
    responses,
    expectedError,
  }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
    const fetchMock = vi.fn();
    for (const response of responses) {
      fetchMock.mockResolvedValueOnce(response);
    }
    globalThis.fetch = fetchMock as typeof fetch;

    useNavigatorStore.setState({ settings: SETTINGS });

    await runPipelineWithAutoAdvance();

    const state = useNavigatorStore.getState() as typeof useNavigatorStore.getState extends () => infer T
      ? T & { retryState?: unknown }
      : never;

    expect(globalThis.fetch).toHaveBeenCalledTimes(step + 1);
    expect(state.status).toBe("error");
    expect(state.currentStep).toBe(step);
    expect(state.error).toBe(expectedError);
    expect(state.retryState).toMatchObject({
      reason: "rate_limit",
      retryAfterSeconds: 120,
    });
    expect(Date.parse((state.retryState as NavigatorRetryState).retryAt ?? "")).toBeGreaterThan(Date.now());
  });
});

describe("useNavigatorStore excludeInstrument", () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
  });

  it("removes only the target code when corrMatrix uses code identifiers", () => {
    const finalEval: FinalEvaluation = {
      bestStocks: [
        {
          rank: 1,
          code: "1111",
          name: "Alpha Corp",
          stars: 4,
          macro: 4,
          cf: 4,
          value: 3,
          momentum: 3,
          riskScore: 2,
          fcfYield: "5.0%",
          cfMargin: "8.0%",
          cfTrend: "↗",
          risk1: "",
          risk2: "",
          hedge: "",
        },
      ],
      bestFunds: [
        {
          rank: 1,
          code: "AAAA",
          name: "Growth AAAA",
          stars: 3,
          macro: 3,
          cf: 3,
          value: 3,
          momentum: 2,
          riskScore: 2,
          fcfYield: "N/A",
          cfMargin: "N/A",
          cfTrend: "→",
          risk1: "",
          risk2: "",
          hedge: "",
        },
      ],
      matrix: [
        { name: "1111", ret: "中", risk: "中", cf: "🟡", pos: "コア", warn: false },
        { name: "AAAA", ret: "中", risk: "低", cf: "🟡", pos: "ヘッジ", warn: false },
      ],
      alloc: { stocks: 50, funds: 30, cash: 20 },
      corrMatrix: [
        { a: "1111", b: "AAAA", coeff: 0.62 },
        { a: "BBBB", b: "AAAA", coeff: 0.18 },
      ],
    };

    useNavigatorStore.setState({
      settings: SETTINGS,
      stocks: {
        stocks: [
          {
            code: "1111",
            name: "Alpha Corp",
            price: "¥100",
            fcfYield: "5.0%",
            cfMargin: "8.0%",
            cfTrend: "↗",
            sector: "Tech",
            type: "stock",
            reason: "",
          },
        ],
      },
      debate: {
        verdicts: [
          { code: "1111", signal: "watch", priority: "中", pro: "", con: "", cfNote: "" },
        ],
      },
      final: finalEval,
      recommendationDiffs: {
        "1111": { isNew: false, rankDelta: 1 },
      },
    });

    act(() => {
      useNavigatorStore.getState().excludeInstrument("1111");
    });

    const state = useNavigatorStore.getState();
    expect(state.final?.corrMatrix).toEqual([{ a: "BBBB", b: "AAAA", coeff: 0.18 }]);
    expect(state.final?.matrix).toEqual([
      { name: "AAAA", ret: "中", risk: "低", cf: "🟡", pos: "ヘッジ", warn: false },
    ]);
    expect(state.recommendationDiffs["1111"]).toBeUndefined();
  });

  it("does not drop unrelated correlation rows on name-code collision", () => {
    const finalEval: FinalEvaluation = {
      bestStocks: [
        {
          rank: 1,
          code: "1111",
          name: "AAAA",
          stars: 4,
          macro: 4,
          cf: 4,
          value: 3,
          momentum: 3,
          riskScore: 2,
          fcfYield: "5.0%",
          cfMargin: "8.0%",
          cfTrend: "↗",
          risk1: "",
          risk2: "",
          hedge: "",
        },
      ],
      bestFunds: [
        {
          rank: 1,
          code: "F001",
          name: "Fund One",
          stars: 3,
          macro: 3,
          cf: 3,
          value: 3,
          momentum: 2,
          riskScore: 2,
          fcfYield: "N/A",
          cfMargin: "N/A",
          cfTrend: "→",
          risk1: "",
          risk2: "",
          hedge: "",
        },
      ],
      matrix: [
        { name: "1111", ret: "中", risk: "中", cf: "🟡", pos: "コア", warn: false },
        { name: "F001", ret: "中", risk: "低", cf: "🟡", pos: "ヘッジ", warn: false },
      ],
      alloc: { stocks: 50, funds: 30, cash: 20 },
      corrMatrix: [
        { a: "1111", b: "F001", coeff: 0.41 },
        { a: "AAAA", b: "F001", coeff: 0.17 },
      ],
    };

    useNavigatorStore.setState({
      settings: SETTINGS,
      stocks: {
        stocks: [
          {
            code: "1111",
            name: "AAAA",
            price: "¥100",
            fcfYield: "5.0%",
            cfMargin: "8.0%",
            cfTrend: "↗",
            sector: "Tech",
            type: "stock",
            reason: "",
          },
        ],
      },
      debate: {
        verdicts: [
          { code: "1111", signal: "watch", priority: "中", pro: "", con: "", cfNote: "" },
        ],
      },
      final: finalEval,
    });

    act(() => {
      useNavigatorStore.getState().excludeInstrument("1111");
    });

    const state = useNavigatorStore.getState();
    // The remaining row uses "AAAA" as a distinct code; it must stay.
    expect(state.final?.corrMatrix).toEqual([{ a: "AAAA", b: "F001", coeff: 0.17 }]);
  });
});
