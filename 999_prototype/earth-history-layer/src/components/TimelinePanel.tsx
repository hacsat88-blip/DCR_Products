import { useMemo } from 'react'
import { HistoryCard } from './HistoryCard'
import { historyEvents, countryNames } from '../data/historyData'

interface TimelinePanelProps {
    hoveredCountry: string | null
    isKidsMode: boolean
    onToggleMode: () => void
}

/**
 * 年表パネル。右サイドに年表カードを縦並びで表示。
 * ホバー国が変わるとFade + Slide-inアニメーションで切り替え。
 */
export function TimelinePanel({ hoveredCountry, isKidsMode, onToggleMode }: TimelinePanelProps) {
    const events = useMemo(() => {
        if (!hoveredCountry) return []
        return historyEvents
            .filter((e) => e.countryId === hoveredCountry)
            .sort((a, b) => a.year - b.year)
    }, [hoveredCountry])

    const countryName = hoveredCountry ? countryNames[hoveredCountry] : null

    return (
        <div
            className="absolute top-0 right-0 h-full flex flex-col pointer-events-none"
            style={{ width: '360px', maxWidth: '40vw' }}
        >
            {/* ヘッダー */}
            <div className="pointer-events-auto px-5 pt-5 pb-3">
                {/* モード切り替えトグル */}
                <div className="flex items-center justify-end gap-3 mb-4">
                    <span
                        className="text-xs font-medium tracking-wide"
                        style={{ color: isKidsMode ? '#00ff78' : 'rgba(200,220,230,0.5)' }}
                    >
                        🎒 小学生
                    </span>
                    <button
                        onClick={() => {
                            onToggleMode()
                            console.log(`[Mode] モード切り替え: ${isKidsMode ? '大人' : '小学生'}`)
                        }}
                        className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#00ff78]/30"
                        style={{
                            background: isKidsMode
                                ? 'linear-gradient(135deg, rgba(0,255,120,0.3), rgba(0,180,255,0.3))'
                                : 'linear-gradient(135deg, rgba(100,140,200,0.3), rgba(180,140,255,0.3))',
                            border: '1px solid rgba(255,255,255,0.15)',
                        }}
                        aria-label="小学生/大人モード切り替え"
                        id="mode-toggle"
                    >
                        <div
                            className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow-lg"
                            style={{
                                left: isKidsMode ? '2px' : '26px',
                                background: isKidsMode ? '#00ff78' : '#b088ff',
                                boxShadow: isKidsMode
                                    ? '0 0 10px rgba(0,255,120,0.5)'
                                    : '0 0 10px rgba(176,136,255,0.5)',
                            }}
                        />
                    </button>
                    <span
                        className="text-xs font-medium tracking-wide"
                        style={{ color: !isKidsMode ? '#b088ff' : 'rgba(200,220,230,0.5)' }}
                    >
                        🎓 大人
                    </span>
                </div>
            </div>

            {/* カードリスト */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 pointer-events-auto">
                {hoveredCountry && events.length > 0 ? (
                    <div key={hoveredCountry} className="animate-fade-in">
                        {/* 国名ヘッダー */}
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-2 h-2 rounded-full animate-pulse-glow"
                                style={{ backgroundColor: '#00ff78', boxShadow: '0 0 8px #00ff78' }}
                            />
                            <h2 className="text-lg font-bold glow-text" style={{ color: '#e8f4ec' }}>
                                {countryName}の歴史
                            </h2>
                        </div>

                        <div className="flex flex-col gap-3">
                            {events.map((event, i) => (
                                <HistoryCard
                                    key={event.id}
                                    event={event}
                                    isKidsMode={isKidsMode}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p
                            className="text-center text-sm animate-pulse-glow"
                            style={{ color: 'rgba(200, 220, 230, 0.4)' }}
                        >
                            🌍 国にカーソルを合わせると
                            <br />
                            歴史が浮かび上がります
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
