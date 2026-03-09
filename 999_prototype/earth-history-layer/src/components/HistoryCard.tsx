import { useState } from 'react'
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
    const [isExpanded, setIsExpanded] = useState(false)
    const title = isKidsMode ? event.title_kids : event.title_adult
    const desc = isKidsMode ? event.desc_kids : event.desc_adult

    return (
        <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="glass w-full rounded-xl p-4 animate-rise-surface hover:scale-[1.02] transition-transform duration-200 text-left"
            style={{
                animationDelay: `${index * 120}ms`,
                animationFillMode: 'both',
                boxShadow: isExpanded
                    ? '0 18px 48px rgba(0, 24, 54, 0.38), 0 0 0 1px rgba(130, 225, 255, 0.12) inset'
                    : '0 10px 24px rgba(0, 10, 30, 0.28)',
            }}
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
            <h3 className="text-base font-bold mb-1.5 leading-snug text-left" style={{ color: '#e8f4ec' }}>
                {title}
            </h3>

            {/* 概要 */}
            <p
                className="text-sm leading-relaxed text-left"
                style={{
                    color: 'rgba(200, 220, 230, 0.8)',
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? undefined : 2,
                    WebkitBoxOrient: isExpanded ? undefined : 'vertical',
                    overflow: isExpanded ? 'visible' : 'hidden',
                }}
            >
                {desc}
            </p>

            <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'rgba(200, 220, 230, 0.55)' }}>
                <span>{isExpanded ? 'クリックで閉じる' : 'クリックで詳しく見る'}</span>
                <span style={{ color: '#00ff78', letterSpacing: '0.18em' }}>{isExpanded ? 'CLOSE' : 'OPEN'}</span>
            </div>
        </button>
    )
}
