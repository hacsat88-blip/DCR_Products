import { AiLogPanel } from "@/components/AiLogPanel";
import { LatestActionCard } from "@/components/LatestActionCard";
import { OrderHistory } from "@/components/OrderHistory";
import { PaperOpsSummary } from "@/components/PaperOpsSummary";
import { PositionPanel } from "@/components/PositionPanel";
import { PricePanel } from "@/components/PricePanel";
import { RiskRuntimePanel } from "@/components/RiskRuntimePanel";
import { RiskSettingsAccordion } from "@/components/RiskSettingsAccordion";
import { StatusHeader } from "@/components/StatusHeader";
import type { TraderHealthViewModel, TraderViewModel } from "@/types/trader";

interface DashboardShellProps {
  state: TraderViewModel;
  health: TraderHealthViewModel;
}

export function DashboardShell({ state, health }: DashboardShellProps): JSX.Element {
  return (
    <main className="dashboard-shell">
      <StatusHeader
        connectionState={state.connectionState}
        lastUpdatedAt={state.lastUpdatedAt}
        health={health}
      />

      <section className="dashboard-top-grid">
        <PricePanel
          executionPrice={state.latestPrice}
          referencePrice={state.referencePrice}
          connectionState={state.connectionState}
        />
        <PositionPanel position={state.positionSnapshot} />
        <LatestActionCard event={state.latestEvent} />
        <PaperOpsSummary connectionState={state.connectionState} health={health} />
      </section>

      <section className="dashboard-bottom-grid">
        <RiskRuntimePanel risk={state.riskRuntimeSnapshot} />
        <AiLogPanel events={state.aiEventHistory} />
        <OrderHistory events={state.orderHistory} />
      </section>

      <section className="dashboard-settings-grid">
        <RiskSettingsAccordion />
      </section>
    </main>
  );
}