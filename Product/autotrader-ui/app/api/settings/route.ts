import { NextResponse } from "next/server";

import { DEFAULT_SERVER_BASE_URL } from "@/lib/constants";

const SETTINGS_ENDPOINT = new URL("/api/settings", DEFAULT_SERVER_BASE_URL).toString();

async function proxySettings(method: "GET" | "PUT", body?: unknown): Promise<NextResponse> {
  const response = await fetch(SETTINGS_ENDPOINT, {
    method,
    cache: "no-store",
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export async function GET(): Promise<NextResponse> {
  try {
    return await proxySettings("GET");
  } catch {
    return NextResponse.json({ detail: "settings proxy failed" }, { status: 502 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const payload = await request.json();
    return await proxySettings("PUT", payload);
  } catch {
    return NextResponse.json({ detail: "settings proxy failed" }, { status: 502 });
  }
}