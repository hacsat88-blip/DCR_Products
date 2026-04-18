import type { z } from "zod";
import { ScreenerRequestSchema } from "@/lib/services/analysis/screener";

export const AnalyzeRequestSchema = ScreenerRequestSchema;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
