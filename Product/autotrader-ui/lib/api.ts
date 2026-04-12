import type { RiskSettingsResponse } from "@/types/trader";

export async function fetchSettings(): Promise<RiskSettingsResponse> {
  const response = await fetch("/api/settings", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("settings fetch failed");
  }

  return (await response.json()) as RiskSettingsResponse;
}

export async function updateSettings(payload: RiskSettingsResponse): Promise<RiskSettingsResponse> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("settings update failed");
  }

  return (await response.json()) as RiskSettingsResponse;
}