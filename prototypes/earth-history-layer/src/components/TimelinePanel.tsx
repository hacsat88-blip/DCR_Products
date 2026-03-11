import { useMemo } from 'react'
import { HistoryCard } from './HistoryCard'
import { historyEvents, countryNames, countryColors } from '../data/historyData'

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
    const countryColor = hoveredCountry ? countryColors[hoveredCountry] ?? '#00ff78' : '#00ff78'
    const hasCountrySelection = Boolean(hoveredCountry)
    const isComingSoon = hasCountrySelection && events.length === 0
    const showExpandedPanel = hasCountrySelection

    return (
        <>
            {!showExpandedPanel && (
                <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 pointer-events-none md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
                    <div className="glass rounded-3xl px-4 py-3 animate-fade-in" style={{ maxWidth: '320px' }}>
                        <p className="text-[10px] tracking-[0.24em] uppercase" style={{ color: 'rgba(200,220,230,0.45)' }}>
                            timeline standby
                        </p>
                        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'rgba(232,244,236,0.82)' }}>
                            国にカーソルを合わせると、その国の年表が浮かび上がります。
                        </p>
                    </div>
                </div>
            )}

            <div
                className={`absolute inset-x-0 bottom-0 z-20 flex flex-col pointer-events-none transition-opacity duration-300 md:inset-y-0 md:left-auto md:right-0 ${showExpandedPanel ? 'opacity-100' : 'opacity-0 md:opacity-0'}`}
                style={{
                    width: '100%',
                    maxWidth: '100vw',
                    height: showExpandedPanel ? '44vh' : '0px',
                }}
            >
                <div className="pointer-events-none mx-3 mb-2 mt-auto rounded-3xl glass animate-sheet-lift md:hidden">
                <div className="flex items-center justify-center pt-2">
                    <div
                        className="h-1.5 w-14 rounded-full"
                        style={{ background: 'rgba(200, 220, 230, 0.22)' }}
                    />
                </div>
                <div className="px-4 pb-2 pt-2 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] tracking-[0.24em] uppercase" style={{ color: 'rgba(200,220,230,0.45)' }}>
                            timeline deck
                        </p>
                        <p className="text-sm font-semibold" style={{ color: '#e8f4ec' }}>
                            {hoveredCountry ? `${countryName}の年表` : '地球をなぞって歴史を掘る'}
                        </p>
                    </div>
                    {hoveredCountry && (
                        <div
                            className="rounded-full px-3 py-1 text-[11px] font-semibold"
                            style={{
                                color: '#081018',
                                background: countryColor,
                                boxShadow: `0 0 16px ${countryColor}55`,
                            }}
                        >
                            ACTIVE
                        </div>
                    )}
                </div>
            </div>

            {/* ヘッダー */}
            <div
                className="pointer-events-auto px-4 pt-3 pb-2 md:px-5 md:pt-5 md:pb-3"
                style={{
                    width: '100%',
                    maxWidth: '100vw',
                }}
            >
                {/* モード切り替えトグル */}
                <div
                    className="ml-auto flex w-full items-center justify-between gap-3 rounded-3xl glass px-4 py-3 md:justify-end md:bg-transparent md:px-0 md:py-0"
                >
                    <div className="md:hidden">
                        <p className="text-[10px] tracking-[0.24em] uppercase" style={{ color: 'rgba(200,220,230,0.45)' }}>
                            mode
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(232,244,236,0.82)' }}>
                            小学生 / 大人
                        </p>
                    </div>

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
            <div
                className="pointer-events-auto flex-1 overflow-y-auto px-4 pb-4 md:px-5 md:pb-5"
                style={{
                    width: '100%',
                    maxWidth: '100vw',
                }}
            >
                {hoveredCountry && events.length > 0 ? (
                    <div key={hoveredCountry} className="animate-sheet-lift md:ml-auto" style={{ maxWidth: '360px', width: '100%' }}>
                        {/* 国名ヘッダー */}
                        <div
                            className="flex items-center gap-3 mb-4 rounded-2xl px-4 py-3"
                            style={{
                                background: `linear-gradient(135deg, ${countryColor}16, rgba(8, 16, 28, 0.72))`,
                                border: `1px solid ${countryColor}22`,
                                boxShadow: `0 12px 28px ${countryColor}12`,
                            }}
                        >
                            <div
                                className="w-2 h-2 rounded-full animate-pulse-glow"
                                style={{ backgroundColor: countryColor, boxShadow: `0 0 8px ${countryColor}` }}
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
                ) : isComingSoon ? (
                    <div className="animate-sheet-lift glass rounded-2xl p-5 mt-2 md:mt-4 md:ml-auto" style={{ maxWidth: '360px', width: '100%' }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-2 h-2 rounded-full animate-pulse-glow"
                                style={{ backgroundColor: countryColor, boxShadow: `0 0 8px ${countryColor}` }}
                            />
                            <h2 className="text-lg font-bold" style={{ color: '#e8f4ec' }}>
                                {countryName}
                            </h2>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(200, 220, 230, 0.8)' }}>
                            この国の年表データは準備中です。次のアップデートで歴史カードを追加します。
                        </p>
                    </div>
                ) : (
                    <div />
                )}
            </div>
        </div>
        </>
    )
}
