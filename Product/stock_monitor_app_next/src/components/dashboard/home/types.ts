export type TabId = "market" | "portfolio" | "analysis" | "settings";

export type DashboardPanelId =
  | "ranking"
  | "compare"
  | "snapshot"
  | "timeline"
  | "export"
  | "savedScreens"
  | "navigator";

export type IsPanelInTab = (panel: DashboardPanelId, tab: TabId) => boolean;
