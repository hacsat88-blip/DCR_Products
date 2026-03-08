import { useState, useCallback, useRef, useEffect } from 'react'
import { GlobeScene } from './components/GlobeScene'
import { TimelinePanel } from './components/TimelinePanel'
import { useGeoHover } from './hooks/useGeoHover'
import { usePointerIntent } from './hooks/usePointerIntent'
import type { Euler } from 'three'

/**
 * 地球史層儀 — メインアプリケーション
 * 
 * 3D地球を回転・ホバーし、国が発光して年表カードが浮き上がる。
 * d3-geoで球面ホバー判定、Three.jsは描画専任。
 */
function App() {
    const [isKidsMode, setIsKidsMode] = useState(true)
    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight })

    // ウィンドウリサイズ追跡
    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ドラッグ/タップ判定
    const { isDragging, onPointerDown, onPointerMove, onPointerUp } = usePointerIntent()

    // d3-geoホバー判定
    const { hoveredCountry, handlePointerMove: handleGeoPointerMove, updateRotation } =
        useGeoHover({
            canvasWidth: canvasSize.width,
            canvasHeight: canvasSize.height,
            enabled: !isDragging,
        })

    // Three.jsの回転をd3-geoに同期
    const handleRotationChange = useCallback(
        (rotation: Euler) => {
            updateRotation(rotation)
        },
        [updateRotation]
    )

    const handleToggleMode = useCallback(() => {
        setIsKidsMode((prev) => !prev)
    }, [])

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            {/* 3D地球シーン */}
            <GlobeScene
                hoveredCountry={hoveredCountry}
                isDragging={isDragging}
                onPointerMoveGeo={handleGeoPointerMove}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onRotationChange={handleRotationChange}
            />

            {/* 年表パネル */}
            <TimelinePanel
                hoveredCountry={hoveredCountry}
                isKidsMode={isKidsMode}
                onToggleMode={handleToggleMode}
            />

            {/* タイトル */}
            <div className="absolute top-5 left-6 pointer-events-none">
                <h1
                    className="text-2xl font-bold tracking-wider animate-fade-in"
                    style={{
                        background: 'linear-gradient(135deg, #00ff78, #00c8ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 40px rgba(0,255,120,0.15)',
                    }}
                >
                    🌍 地球史層儀
                </h1>
                <p
                    className="text-xs mt-1 tracking-wider animate-fade-in"
                    style={{ color: 'rgba(200, 220, 230, 0.4)', animationDelay: '300ms' }}
                >
                    Earth History Layer — 触って掘る歴史
                </p>
            </div>

            {/* WebGL非対応時のフォールバック */}
            {!hasWebGL() && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
                    <div className="text-center p-8 glass rounded-2xl max-w-md">
                        <p className="text-xl mb-3">⚠️ WebGL非対応</p>
                        <p className="text-sm" style={{ color: 'rgba(200,220,230,0.6)' }}>
                            このアプリの3D表示にはWebGL対応のブラウザが必要です。
                            <br />
                            Chrome, Firefox, Safari, Edge の最新版をお使いください。
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

/** WebGL対応チェック */
function hasWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas')
        return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'))
    } catch {
        return false
    }
}

export default App
