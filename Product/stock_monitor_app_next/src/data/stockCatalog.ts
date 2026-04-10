import { mockStocks } from "@/data/mockStocks";

export interface StockCatalogEntry {
  code: string;
  name: string;
  sector: string | null;
  tags: string[];
  oneLiner: string;
  summary: string;
}

const supplementalCatalog: StockCatalogEntry[] = [
  {
    code: "7203",
    name: "トヨタ自動車",
    sector: "自動車",
    tags: ["自動車", "グローバル", "ハイブリッド", "円安", "輸出"],
    oneLiner: "世界販売と電動化投資を同時に見たい日本代表株。",
    summary: "トヨタ自動車はグローバル販売台数、ハイブリッド競争力、為替耐性を軸に確認したい自動車大手です。利益の質と北米・アジアの需要動向をあわせて確認します。",
  },
  {
    code: "8306",
    name: "三菱UFJフィナンシャル・グループ",
    sector: "銀行",
    tags: ["銀行", "メガバンク", "金利", "還元", "資本効率"],
    oneLiner: "金利環境と株主還元の両面で追いたいメガバンク。",
    summary: "三菱UFJフィナンシャル・グループは国内外の金利差、与信コスト、株主還元余地をあわせて見たい銀行株です。自己資本と業績変動耐性が重要です。",
  },
  {
    code: "6758",
    name: "ソニーグループ",
    sector: "エレクトロニクス",
    tags: ["エンタメ", "イメージセンサー", "ゲーム", "映画", "半導体"],
    oneLiner: "複数事業の質を横断で見たい大型成長株。",
    summary: "ソニーグループはゲーム、音楽、映画、イメージセンサーの分散収益を持つ大型株です。単一事業ではなくポートフォリオ全体の収益質で評価したい銘柄です。",
  },
  {
    code: "7974",
    name: "任天堂",
    sector: "ゲーム",
    tags: ["ゲーム", "IP", "Switch", "キャラクター", "海外売上"],
    oneLiner: "ハード周期よりIPの持続力で判断したいゲーム株。",
    summary: "任天堂はハード更新サイクルだけでなく、IP展開とソフトの継続販売力で評価したい企業です。新作偏重かストック化が進むかを確認します。",
  },
  {
    code: "9984",
    name: "ソフトバンクグループ",
    sector: "投資",
    tags: ["投資", "AI", "NAV", "アーム", "財務"],
    oneLiner: "テーマ性は強いが財務と資産価値の見極めが必要な投資株。",
    summary: "ソフトバンクグループはAIテーマの強さだけでなく、NAVディスカウント、財務安全性、保有資産の実現性で見るべき銘柄です。",
  },
  {
    code: "9983",
    name: "ファーストリテイリング",
    sector: "小売",
    tags: ["小売", "ユニクロ", "海外成長", "アパレル", "粗利"],
    oneLiner: "海外展開の質と粗利防衛を追いたい小売主力株。",
    summary: "ファーストリテイリングは既存店だけでなく海外展開の収益質と値引き依存度を確認したい企業です。高評価が前提になりやすいため失速局面も重要です。",
  },
  {
    code: "8035",
    name: "東京エレクトロン",
    sector: "半導体装置",
    tags: ["半導体", "装置", "生成AI", "設備投資", "市況循環"],
    oneLiner: "AI投資追い風と市況循環の両方を見る半導体装置株。",
    summary: "東京エレクトロンは生成AI関連投資の恩恵を受けやすい一方、半導体設備投資サイクルの変動も受けやすい装置株です。受注と顧客投資計画が重要です。",
  },
  {
    code: "6861",
    name: "キーエンス",
    sector: "FA",
    tags: ["FA", "高収益", "工場自動化", "営業利益率", "海外"],
    oneLiner: "景気敏感でも高収益の質で見たいFA株。",
    summary: "キーエンスは高収益体質を誇るFA企業です。受注の減速よりも粗利率と営業効率の維持、海外需要の変化を重点的に確認します。",
  },
  {
    code: "4063",
    name: "信越化学工業",
    sector: "化学",
    tags: ["化学", "半導体", "塩ビ", "高収益", "シリコンウェハ"],
    oneLiner: "景気循環に強い収益体質を見たい化学主力株。",
    summary: "信越化学工業はシリコンウェハと生活基盤素材の両輪を持つ化学大手です。市況に左右されても収益性を保てるかが判断の軸になります。",
  },
  {
    code: "6501",
    name: "日立製作所",
    sector: "電機",
    tags: ["DX", "インフラ", "鉄道", "グローバル", "改革"],
    oneLiner: "事業再編後の質を見たいインフラDX株。",
    summary: "日立製作所は事業再編を経てインフラとDXの収益質が改善しているかを確認したい企業です。大型案件依存とキャッシュ創出力が重要です。",
  },
  {
    code: "7013",
    name: "IHI",
    sector: "重工",
    tags: ["防衛", "航空", "エネルギー", "大型株", "景気敏感"],
    oneLiner: "テーマ追い風の裏で収益の波も見たい重工株。",
    summary: "IHIは防衛や航空エンジンの追い風がある一方、大型案件の採算変動も大きい企業です。テーマ性ではなく受注残と採算の質で見ます。",
  },
  {
    code: "3778",
    name: "さくらインターネット",
    sector: "クラウド",
    tags: ["クラウド", "GPU", "データセンター", "AI", "高成長"],
    oneLiner: "テーマ先行になりやすいが設備投資回収力を見たいクラウド株。",
    summary: "さくらインターネットはAI向け需要の追い風がある一方、設備投資回収や供給制約の影響も受けやすい企業です。話題性と収益化を切り分けて評価します。",
  },
  {
    code: "4755",
    name: "楽天グループ",
    sector: "インターネット",
    tags: ["EC", "金融", "通信", "再建", "モバイル"],
    oneLiner: "再建ストーリーの進捗を四半期ごとに確認したい複合ネット株。",
    summary: "楽天グループはモバイル赤字の縮小、金融子会社の価値、ECの競争力を分けて見る必要がある企業です。改善速度が投資判断の中心です。",
  },
  {
    code: "9432",
    name: "日本電信電話",
    sector: "通信",
    tags: ["通信", "ディフェンシブ", "還元", "データセンター", "安定"],
    oneLiner: "守りと還元を重視するなら見やすい通信主力株。",
    summary: "日本電信電話は安定キャッシュフローと還元を評価しやすい大型通信株です。成長性は高くないため、守りの厚みと新領域の上積みを確認します。",
  },
  {
    code: "6098",
    name: "リクルートホールディングス",
    sector: "人材サービス",
    tags: ["人材", "求人", "SaaS", "海外", "マッチング"],
    oneLiner: "景気変動を受けつつも構造優位を見たい人材株。",
    summary: "リクルートホールディングスは求人市況に左右される一方、マッチング基盤の強みを持つ企業です。景気敏感でもシェアを保てるかが焦点です。",
  },
  {
    code: "4661",
    name: "オリエンタルランド",
    sector: "レジャー",
    tags: ["テーマパーク", "ディズニー", "値上げ", "客単価", "インバウンド"],
    oneLiner: "客単価と来園体験の両立を見たいレジャー株。",
    summary: "オリエンタルランドは集客力だけでなく客単価、混雑許容、設備投資回収を見たい企業です。期待先行になりやすく、運営効率の確認が重要です。",
  },
];

const baseCatalog: StockCatalogEntry[] = mockStocks.map((stock) => ({
  code: stock.code,
  name: stock.name,
  sector: stock.sector,
  tags: stock.themeTags,
  oneLiner: stock.oneLiner,
  summary: stock.summary,
}));

function dedupeCatalog(entries: StockCatalogEntry[]): StockCatalogEntry[] {
  const map = new Map<string, StockCatalogEntry>();
  for (const entry of entries) {
    map.set(entry.code, entry);
  }
  return [...map.values()];
}

export const stockCatalog: StockCatalogEntry[] = dedupeCatalog([
  ...baseCatalog,
  ...supplementalCatalog,
]);
