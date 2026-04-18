import { StockDetail } from "./StockDetail";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <StockDetail symbol={decodeURIComponent(symbol)} />;
}
