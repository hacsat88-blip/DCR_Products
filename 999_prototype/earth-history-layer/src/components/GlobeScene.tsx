import { useRef, useCallback, Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Globe } from './Globe'
import type { Euler } from 'three'

interface GlobeSceneProps {
    hoveredCountry: string | null
    isDragging: boolean
    onPointerMoveGeo: (clientX: number, clientY: number, rect: DOMRect) => void
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onRotationChange: (rotation: Euler) => void
}

/**
 * Canvas外のラッパーコンポーネント。
 * ポインタイベントをキャプチャし、d3-geoに座標を渡す。
 */
export function GlobeScene({
    hoveredCountry,
    isDragging,
    onPointerMoveGeo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onRotationChange,
}: GlobeSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })

    // Canvasサイズの追跡
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                })
            }
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            onPointerMove(e)
            if (!isDragging && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                onPointerMoveGeo(e.clientX, e.clientY, rect)
            }
        },
        [isDragging, onPointerMove, onPointerMoveGeo]
    )

    return (
        <div
            ref={containerRef}
            className="absolute inset-0"
            onPointerDown={onPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: hoveredCountry ? 'pointer' : 'grab' }}
        >
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true, alpha: false }}
                style={{ background: '#000' }}
            >
                <Suspense fallback={null}>
                    <Globe
                        hoveredCountry={hoveredCountry}
                        onRotationChange={onRotationChange}
                    />
                </Suspense>
            </Canvas>

            {/* WebGL非対応フォールバック */}
            <noscript>
                <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
                    <p>このアプリは JavaScript を有効にする必要があります。</p>
                </div>
            </noscript>
        </div>
    )
}
