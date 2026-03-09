import { useCallback, useEffect, useState } from 'react'
import type { Euler } from 'three'
import { GlobeScene } from './components/GlobeScene'
import { Hud } from './components/Hud'
import { useGeoHover } from './hooks/useGeoHover'
import { usePointerIntent } from './hooks/usePointerIntent'

const MAX_POLAR_ROTATION = Math.PI / 2.35

function App() {
    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight })
    const [globeRotation, setGlobeRotation] = useState({ x: -0.28, y: -0.48 })

    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleGlobeDrag = useCallback((deltaX: number, deltaY: number) => {
        setGlobeRotation((current) => ({
            x: Math.max(-MAX_POLAR_ROTATION, Math.min(MAX_POLAR_ROTATION, current.x + deltaY)),
            y: current.y + deltaX,
        }))
    }, [])

    const { isDragging, onPointerDown, onPointerMove, onPointerUp } = usePointerIntent({
        onDrag: handleGlobeDrag,
    })

    const { hoveredCountry, handlePointerMove, updateRotation } = useGeoHover({
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
        enabled: !isDragging,
    })

    const handleRotationChange = useCallback(
        (rotation: Euler) => {
            updateRotation(rotation)
        },
        [updateRotation]
    )

    return (
        <div className="app-shell">
            <div className="space-gradient" />
            <div className="space-vignette" />
            <div className="space-noise" />
            <div className="orbital-ring orbital-ring-left" />
            <div className="orbital-ring orbital-ring-right" />

            <GlobeScene
                hoveredCountry={hoveredCountry}
                isDragging={isDragging}
                globeRotation={globeRotation}
                onPointerMoveGeo={handlePointerMove}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onRotationChange={handleRotationChange}
            />

            <Hud hoveredCountry={hoveredCountry} />

            {!hasWebGL() && (
                <div className="fallback-panel">
                    <h2>WebGL が必要です</h2>
                    <p>このプロトタイプは 3D 描画に WebGL を使います。Chrome、Edge、Firefox の最新版で開いてください。</p>
                </div>
            )}
        </div>
    )
}

function hasWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas')
        return Boolean(canvas.getContext('webgl') || canvas.getContext('webgl2'))
    } catch {
        return false
    }
}

export default App