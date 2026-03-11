import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Euler } from 'three'
import { Globe } from './Globe'

interface GlobeSceneProps {
    hoveredCountry: string | null
    isDragging: boolean
    globeRotation: { x: number; y: number }
    onPointerMoveGeo: (clientX: number, clientY: number, rect: DOMRect) => void
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onRotationChange: (rotation: Euler) => void
}

export function GlobeScene({
    hoveredCountry,
    isDragging,
    globeRotation,
    onPointerMoveGeo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onRotationChange,
}: GlobeSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const element = containerRef.current
        if (!element) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                })
            }
        })

        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    const handlePointerMove = useCallback(
        (event: React.PointerEvent) => {
            onPointerMove(event)
            if (!isDragging && containerRef.current) {
                onPointerMoveGeo(event.clientX, event.clientY, containerRef.current.getBoundingClientRect())
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
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: hoveredCountry ? 'pointer' : 'grab', touchAction: 'none' }}
        >
            <Canvas
                dpr={[1, 2]}
                camera={{ position: [0, 0.15, 5.7], fov: 35 }}
                gl={{ antialias: true, alpha: true }}
                style={{ touchAction: 'none' }}
            >
                <Suspense fallback={null}>
                    <Globe
                        hoveredCountry={hoveredCountry}
                        globeRotation={globeRotation}
                        onRotationChange={onRotationChange}
                    />
                </Suspense>
            </Canvas>

            {size.width === 0 && size.height === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    Loading canvas...
                </div>
            )}
        </div>
    )
}