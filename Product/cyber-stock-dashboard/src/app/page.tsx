import { Disclaimer, ScanLines } from "@/components/ui";
import {
  DashboardHeader,
  IndicesGrid,
  NewsTiles,
  PicksCarousel,
  PortfolioSummary,
} from "@/components/dashboard";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  PortfolioValueChart,
  PortfolioCompositionChart,
} from "@/components/charts";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <ScanLines className="!fixed inset-0 !rounded-none opacity-40" />
      <div className="relative flex flex-col gap-8">
        <DashboardHeader />

        <IndicesGrid />

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PicksCarousel />
          </div>
          <div className="lg:col-span-1">
            <PortfolioSummary />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PortfolioValueChart />
          <PortfolioCompositionChart />
        </section>

        <NewsTiles />

        <ChatPanel
          title="AI チャット (mini)"
          collapsible
          defaultCollapsed
          showQuickPrompts
        />

        <Disclaimer />
      </div>
    </main>
  );
}
