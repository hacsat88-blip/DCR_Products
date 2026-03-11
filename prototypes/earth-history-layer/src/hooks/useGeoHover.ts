import { useCallback, useEffect, useRef, useState } from 'react'
import { geoOrthographic, geoContains, type GeoProjection } from 'd3-geo'
import type { Euler } from 'three'
import { countries } from '../data/countries'

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

            const nextHoveredCountry =
                countries.find((country) => geoContains(country.geometry, lonLat))?.id ?? null

            if (nextHoveredCountry !== hoveredCountry) {
                if (nextHoveredCountry) {
                    const country = countries.find((item) => item.id === nextHoveredCountry)
                    console.log(`[GeoHover] ホバー国: ${country?.name ?? nextHoveredCountry} (${nextHoveredCountry})`)
                }

                setHoveredCountry(nextHoveredCountry)
            }
        },
        [enabled, hoveredCountry]
    )

    return { hoveredCountry, handlePointerMove, updateRotation }
}
