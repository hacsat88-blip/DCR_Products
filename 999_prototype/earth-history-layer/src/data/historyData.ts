import type { HistoryEvent } from '../types'

// ダミー歴史データ（日本のみ — Step 1）
export const historyEvents: HistoryEvent[] = [
    {
        id: 'jp-1',
        countryId: 'JPN',
        year: 710,
        title_kids: 'なら時代がはじまったよ！',
        title_adult: '平城京遷都 — 奈良時代の幕開け',
        desc_kids: 'おおきなお寺やお城がたくさんつくられた時代。おぼうさんが大かつやくしたよ。',
        desc_adult: '元明天皇が藤原京から平城京へ遷都。律令国家体制が確立し、東大寺や正倉院など壮大な文化遺産が生まれた。',
    },
    {
        id: 'jp-2',
        countryId: 'JPN',
        year: 1603,
        title_kids: 'とくがわさんが将軍になった！',
        title_adult: '江戸幕府成立 — 260年の太平',
        desc_kids: 'とくがわいえやすが日本のリーダーになって、ながーいへいわな時代がはじまったよ。',
        desc_adult: '徳川家康が征夷大将軍に就任し江戸幕府を開いた。参勤交代や鎖国政策で中央集権体制を維持し、約260年にわたる平和と文化の成熟期を実現。',
    },
    {
        id: 'jp-3',
        countryId: 'JPN',
        year: 1868,
        title_kids: 'めいじ時代スタート！',
        title_adult: '明治維新 — 近代日本の出発点',
        desc_kids: 'サムライの時代がおわって、あたらしい日本がはじまったよ。でんしゃや学校ができたんだ！',
        desc_adult: '王政復古の大号令を経て明治政府が樹立。廃藩置県・殖産興業・文明開化を推進し、急速な近代化で西洋列強に伍する国力を構築した。',
    },
]

export const countryNames: Record<string, string> = {
    JPN: '日本',
}

export const countryColors: Record<string, string> = {
    JPN: '#00ff78',
}
