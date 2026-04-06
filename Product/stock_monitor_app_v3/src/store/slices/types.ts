/**
 * Combined StoreState type, assembled from all slice interfaces.
 * Imported by each slice so their StateCreator generics reference the full store.
 */

import type { CoreSlice } from "./coreSlice";
import type { PortfolioSlice } from "./portfolioSlice";
import type { AlertSlice } from "./alertSlice";
import type { ScoringSlice } from "./scoringSlice";
import type { ArchiveSlice } from "./archiveSlice";

export type StoreState = CoreSlice & PortfolioSlice & AlertSlice & ScoringSlice & ArchiveSlice;
