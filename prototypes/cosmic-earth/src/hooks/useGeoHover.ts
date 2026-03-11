import { useCallback, useEffect, useRef, useState } from 'react'
import { geoContains, geoOrthographic, type GeoProjection } from 'd3-geo'
import type { Euler } from 'three'
import { countries } from '../data/world'

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

export function useGeoHover({ canvasWidth, canvasHeight, enabled }: UseGeoHoverOptions): UseGeoHoverReturn {
    const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
    const projectionRef = useRef<GeoProjection>(
        geoOrthographic()
            .scale(Math.min(canvasWidth, canvasHeight) / 2.12)
            .translate([canvasWidth / 2, canvasHeight / 2])
            .clipAngle(90)
            .precision(0.1)
    )

    useEffect(() => {
        projectionRef.current
            .scale(Math.min(canvasWidth, canvasHeight) / 2.12)
            .translate([canvasWidth / 2, canvasHeight / 2])
    }, [canvasWidth, canvasHeight])

    const updateRotation = useCallback((rotation: Euler) => {
        const lambda = -(rotation.y * 180) / Math.PI
        const phi = -(rotation.x * 180) / Math.PI
        const gamma = (rotation.z * 180) / Math.PI

        projectionRef.current.rotate([lambda, phi, gamma])
    }, [])

    const handlePointerMove = useCallback(
        (clientX: number, clientY: number, canvasRect: DOMRect) => {
            if (!enabled) {
                setHoveredCountry(null)
                return
            }

            const localX = clientX - canvasRect.left
            const localY = clientY - canvasRect.top
            const lonLat = projectionRef.current.invert?.([localX, localY])

            if (!lonLat) {
                setHoveredCountry(null)
                return
            }

            const nextHoveredCountry =
                countries.find((country) => geoContains(country.geometry, lonLat))?.id ?? null

            setHoveredCountry((current) => (current === nextHoveredCountry ? current : nextHoveredCountry))
        },
        [enabled]
    )

    return { hoveredCountry, handlePointerMove, updateRotation }
}