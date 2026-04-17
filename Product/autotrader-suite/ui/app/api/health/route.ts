import { NextResponse } from "next/server";

import { DEFAULT_SERVER_BASE_URL } from "@/lib/constants";

const HEALTH_ENDPOINT = new URL("/api/health", DEFAULT_SERVER_BASE_URL).toString();

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(HEALTH_ENDPOINT, {
      method: "GET",
      cache: "no-store"
    });
    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json"
      }
    });
  } catch {
    return NextResponse.json({ detail: "health proxy failed" }, { status: 502 });
  }
}