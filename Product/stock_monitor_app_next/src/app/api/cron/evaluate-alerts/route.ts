import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { evaluateRule, type AlertSnapshot } from "@/lib/alerts/evaluate";
import type { AlertRule, AlertChannel } from "@/store/useAlertsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SnapshotSchema = z.object({
  price: z.number(),
  prevPrice: z.number().optional(),
  changePct: z.number().optional(),
});

const RuleSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  market: z.enum(["JP", "US"]),
  condition: z.object({
    op: z.enum([">=", "<=", "cross_up", "cross_down"]),
    target: z.number(),
    field: z.enum(["price", "changePct"]),
  }),
  notifyChannels: z.array(z.enum(["discord", "line", "email"])),
  enabled: z.boolean(),
  createdAt: z.string(),
  lastTriggeredAt: z.string().optional(),
});

const PayloadSchema = z.object({
  rules: z.array(RuleSchema),
  snapshots: z.record(z.string(), SnapshotSchema),
});

type Payload = z.infer<typeof PayloadSchema>;

async function sendWebhook(channel: AlertChannel, payload: unknown): Promise<void> {
  // TODO (Phase 5): implement real channel senders (Discord / LINE / Resend).
  // eslint-disable-next-line no-console
  console.log(`[alerts:stub] channel=${channel}`, JSON.stringify(payload));
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

async function handle(req: NextRequest, payload: Payload): Promise<NextResponse> {
  const triggered: Array<{ ruleId: string; reason: string }> = [];
  for (const rule of payload.rules as AlertRule[]) {
    if (!rule.enabled) continue;
    const snapshot = payload.snapshots[rule.symbol] as AlertSnapshot | undefined;
    if (!snapshot) continue;
    const evaluation = evaluateRule(rule, snapshot);
    if (evaluation.triggered) {
      triggered.push({ ruleId: rule.id, reason: evaluation.reason ?? "" });
      for (const channel of rule.notifyChannels) {
        await sendWebhook(channel, {
          ruleId: rule.id,
          symbol: rule.symbol,
          reason: evaluation.reason,
        });
      }
    }
  }
  return NextResponse.json({ evaluated: payload.rules.length, triggered });
}

async function readPayload(req: NextRequest): Promise<Payload | NextResponse> {
  if (req.method === "GET") {
    const rulesRaw = req.nextUrl.searchParams.get("rules");
    const snapshotsRaw = req.nextUrl.searchParams.get("snapshots");
    if (!rulesRaw || !snapshotsRaw) {
      return NextResponse.json({ error: "missing rules/snapshots query" }, { status: 400 });
    }
    try {
      const parsed = PayloadSchema.safeParse({
        rules: JSON.parse(rulesRaw),
        snapshots: JSON.parse(snapshotsRaw),
      });
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
      }
      return parsed.data;
    } catch {
      return NextResponse.json({ error: "invalid JSON in query" }, { status: 400 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  return parsed.data;
}

async function route(req: NextRequest): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!isAuthorized(req)) return unauthorized();
  const payloadOrResponse = await readPayload(req);
  if (payloadOrResponse instanceof NextResponse) return payloadOrResponse;
  return handle(req, payloadOrResponse);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return route(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return route(req);
}
