import { z } from "zod";
import { requireEnv } from "@/lib/env";
import {
  DisclosureSchema,
  type Disclosure,
  type FetchDeps,
} from "./types";
import { createRateLimiter } from "./rateLimit";

// TODO: edinetdb / EDINET の正確な API 仕様は要確認。
// 現状は EDINET v2 の documents.json (type=2: 提出書類一覧) を想定し、
// 不確実性に対しては Zod の optional/passthrough と TODO で安全側に倒している。
const BASE_URL = "https://api.edinet-fsa.go.jp/api/v2";

const DocumentSchema = z
  .object({
    docID: z.string(),
    secCode: z.string().nullable().optional(),
    edinetCode: z.string().nullable().optional(),
    filerName: z.string().nullable().optional(),
    docDescription: z.string().nullable().optional(),
    docTypeCode: z.string().nullable().optional(),
    submitDateTime: z.string().nullable().optional(),
  })
  .passthrough();

const DocumentsResponseSchema = z.object({
  results: z.array(DocumentSchema).default([]),
});

export interface EdinetDbClient {
  getRecentDisclosures(code: string, days: number): Promise<Disclosure[]>;
}

export interface CreateEdinetDbClientOptions extends FetchDeps {
  apiKey?: string;
  baseUrl?: string;
  now?: () => Date;
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createEdinetDbClient(
  opts: CreateEdinetDbClientOptions = {},
): EdinetDbClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? BASE_URL;
  const now = opts.now ?? (() => new Date());
  const limiter = createRateLimiter({ minIntervalMs: 500 });
  const apiKey = (): string => opts.apiKey ?? requireEnv("EDINETDB_API_KEY");

  async function fetchByDate(date: string): Promise<unknown> {
    const search = new URLSearchParams({
      date,
      type: "2",
      "Subscription-Key": apiKey(),
    });
    const url = `${baseUrl}/documents.json?${search.toString()}`;
    const res = await limiter.schedule(() => fetchImpl(url));
    if (!res.ok) {
      throw new Error(`EDINET ${date} failed: ${res.status}`);
    }
    return res.json();
  }

  function normalizeCode(code: string): string {
    // EDINET secCode は 5 桁（末尾 0 付き 4 桁ティッカー）が一般的。
    return code.length === 4 ? `${code}0` : code;
  }

  async function getRecentDisclosures(
    code: string,
    days: number,
  ): Promise<Disclosure[]> {
    const target = normalizeCode(code);
    const today = now();
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(formatDate(d));
    }

    const results: Disclosure[] = [];
    for (const date of dates) {
      const json = await fetchByDate(date);
      const parsed = DocumentsResponseSchema.parse(json);
      for (const doc of parsed.results) {
        const sec = doc.secCode ?? "";
        if (sec !== target) continue;
        results.push(
          DisclosureSchema.parse({
            docId: doc.docID,
            code: sec,
            companyName: doc.filerName ?? undefined,
            title: doc.docDescription ?? "(no title)",
            docType: doc.docTypeCode ?? undefined,
            submittedAt: doc.submitDateTime ?? `${date}T00:00:00`,
            url: undefined, // TODO: documents/{docID} で本体取得
          }),
        );
      }
    }
    return results;
  }

  return { getRecentDisclosures };
}
