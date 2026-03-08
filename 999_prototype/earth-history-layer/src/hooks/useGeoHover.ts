import { useCallback, useEffect, useRef, useState } from 'react'
import { geoOrthographic, geoContains, type GeoProjection } from 'd3-geo'
import type { Euler } from 'three'

// 日本の簡易バウンディングポリゴン（Step 1用 — 後でGeoJSONに差し替え）
const JAPAN_FEATURE: GeoJSON.Feature = {
    type: 'Feature',
    properties: { id: 'JPN', name: '日本' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [129.5, 31.0],
            [131.0, 31.0],
            [132.0, 33.0],
            [134.0, 33.5],
            [135.5, 34.5],
            [137.0, 35.0],
            [140.0, 36.0],
            [141.0, 38.0],
            [141.5, 41.0],
            [141.0, 43.0],
            [140.0, 43.5],
            [139.5, 43.0],
            [140.0, 41.5],
            [139.5, 38.5],
            [137.0, 36.5],
            [136.0, 36.0],
            [134.5, 35.5],
            [132.5, 34.0],
            [131.5, 33.5],
            [130.5, 33.0],
            [130.0, 32.5],
            [129.5, 31.0],
        ]],
    },
}

interface UseGeoHoverOptions {
    canvasWidth: number
    canvasHeight: number
    enabled: boolean
}

interface UseGeoHoverReturn {
    hoveredCountry: string | null
    handlePointerMove: (clientX: number, clientY: number, canvasRect: DOMRect) => void
    updateRotation: (rotation: Euler) => void
}

/**
 * d3-geoを使ったホバー判定。
 * Three.jsの回転行列からd3-geoの投影パラメータを同期し、
 * マウス座標から緯度経度を逆変換して国コードを判定する。
 */
export function useGeoHover({ canvasWidth, canvasHeight, enabled }: UseGeoHoverOptions): UseGeoHoverReturn {
    const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
    const projectionRef = useRef<GeoProjection>(
        geoOrthographic()
            .scale(Math.min(canvasWidth, canvasHeight) / 2)
            .translate([canvasWidth / 2, canvasHeight / 2])
            .clipAngle(90)
    )
    const rotationRef = useRef<[number, number, number]>([0, 0, 0])

    // Canvasサイズが変わったら投影を更新
    useEffect(() => {
        const proj = projectionRef.current
        proj.scale(Math.min(canvasWidth, canvasHeight) / 2)
        proj.translate([canvasWidth / 2, canvasHeight / 2])
    }, [canvasWidth, canvasHeight])

    const updateRotation = useCallback((rotation: Euler) => {
        // Three.jsのEulerからd3-geoのrotateパラメータに変換
        // Three.js: Y軸回転→X軸回転→Z軸回転 (YXZ order for globe)
        // d3-geo: [lambda(経度), phi(緯度), gamma(回転)]
        // Three.jsのY回転 = 経度方向、X回転 = 緯度方向
        const lambda = -(rotation.y * 180) / Math.PI
        const phi = -(rotation.x * 180) / Math.PI
        const gamma = (rotation.z * 180) / Math.PI
        rotationRef.current = [lambda, phi, gamma]
        projectionRef.current.rotate([lambda, phi, gamma])
    }, [])

    const handlePointerMove = useCallback(
        (clientX: number, clientY: number, canvasRect: DOMRect) => {
            if (!enabled) {
                setHoveredCountry(null)
                return
            }

            const proj = projectionRef.current
            // Canvas内座標に変換
            const x = clientX - canvasRect.left
            const y = clientY - canvasRect.top

            // 画面座標→緯度経度に逆変換
            const lonLat = proj.invert?.([x, y])

            if (!lonLat) {
                setHoveredCountry(null)
                return
            }

            // 日本のポリゴンに含まれるか判定
            if (geoContains(JAPAN_FEATURE, lonLat)) {
                if (hoveredCountry !== 'JPN') {
                    console.log('[GeoHover] ホバー国: 日本 (JPN)')
                    setHoveredCountry('JPN')
                }
            } else {
                if (hoveredCountry !== null) {
                    setHoveredCountry(null)
                }
            }
        },
        [enabled, hoveredCountry]
    )

    return { hoveredCountry, handlePointerMove, updateRotation }
}
