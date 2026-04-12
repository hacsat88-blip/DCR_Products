import { AiLogPanel } from "@/components/AiLogPanel";
import { LatestActionCard } from "@/components/LatestActionCard";
import { OrderHistory } from "@/components/OrderHistory";
import { PositionPanel } from "@/components/PositionPanel";
import { PricePanel } from "@/components/PricePanel";
import { RiskRuntimePanel } from "@/components/RiskRuntimePanel";
import { RiskSettingsAccordion } from "@/components/RiskSettingsAccordion";
import { StatusHeader } from "@/components/StatusHeader";
import type { TraderViewModel } from "@/types/trader";

interface DashboardShellProps {
  state: TraderViewModel;
}

export function DashboardShell({ state }: DashboardShellProps): JSX.Element {
  return (
    <main className="dashboard-shell">
      <StatusHeader connectionState={state.connectionState} lastUpdatedAt={state.lastUpdatedAt} />

      <section className="dashboard-top-grid">
        <PricePanel
          executionPrice={state.latestPrice}
          referencePrice={state.referencePrice}
          connectionState={state.connectionState}
        />
        <PositionPanel position={state.positionSnapshot} />
        <LatestActionCard event={state.latestEvent} />
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