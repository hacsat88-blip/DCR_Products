import type { PipelineStep } from "@/types/navigator";

export function shouldPauseAutoAdvance(input: string): boolean {
  return input.trim().length > 0;
}

export function nextAutoAdvanceSeconds(current: number, input: string): number {
  if (shouldPauseAutoAdvance(input)) return current;
  return Math.max(0, current - 1);
}

export function buildStageBridgeMessage(
  completedStep: PipelineStep,
  nextStep: PipelineStep,
  note: string | null,
): string {
  return [
    `$ navigator.bridge stage ${completedStep + 1} -> stage ${nextStep + 1}`,
    note ? `intervention=${note}` : "intervention=(none)",
    "status=handoff complete",
  ].join("\n");
}
