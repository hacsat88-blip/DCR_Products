import type { HistoryEvent } from '../types'

interface HistoryCardProps {
    event: HistoryEvent
    isKidsMode: boolean
    index: number
}

/**
 * 年表カード。グラスモーフィズムスタイルで年・タイトル・概要を表示。
 * 地表から浮き上がるslide-upアニメーション付き。
 */
export function HistoryCard({ event, isKidsMode, index }: HistoryCardProps) {
    const title = isKidsMode ? event.title_kids : event.title_adult
    const desc = isKidsMode ? event.desc_kids : event.desc_adult

    return (
        <div
            className="glass rounded-xl p-4 animate-slide-up hover:scale-[1.02] transition-transform duration-200"
            style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
        >
            {/* 年代バッジ */}
            <div className="flex items-center gap-2 mb-2">
                <span
                    className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-bold tracking-wider"
                    style={{
                        background: 'linear-gradient(135deg, rgba(0,255,120,0.25), rgba(0,200,255,0.2))',
                        color: '#00ff78',
                        border: '1px solid rgba(0,255,120,0.3)',
                    }}
                >
                    {event.year}年
                </span>
                <div
                    className="h-px flex-1"
                    style={{
                        background: 'linear-gradient(to right, rgba(0,255,120,0.3), transparent)',
                    }}
                />
            </div>

            {/* タイトル */}
            <h3 className="text-base font-bold mb-1.5 leading-snug" style={{ color: '#e8f4ec' }}>
                {title}
            </h3>

            {/* 概要 */}
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(200, 220, 230, 0.8)' }}>
                {desc}
            </p>
        </div>
    )
}
