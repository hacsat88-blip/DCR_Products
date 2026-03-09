import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { countries } from '../data/world'
import { getFeatureBorderRings, latLonToVec3 } from '../lib/globeGeometry'

interface CountryBordersProps {
    globeRadius: number
    hoveredCountry: string | null
}

export function CountryBorders({ globeRadius, hoveredCountry }: CountryBordersProps) {
    const borderGroups = useMemo(() => {
        const radius = globeRadius + 0.008

        return countries.map((country) => ({
            id: country.id,
            rings: getFeatureBorderRings(country.geometry).map((ring) =>
                ring.map(([lon, lat]) => latLonToVec3(lon, lat, radius))
            ),
        }))
    }, [globeRadius])

    return (
        <group>
            {borderGroups.map((country) => {
                const isHovered = hoveredCountry === country.id

                return (
                    <group key={country.id}>
                        {country.rings.map((points, index) => (
                            <Line
                                key={`${country.id}-${index}`}
                                points={points}
                                color={isHovered ? '#89dfff' : '#53a9d9'}
                                transparent
                                opacity={hoveredCountry ? (isHovered ? 0.95 : 0.18) : 0.3}
                                lineWidth={isHovered ? 1.6 : 0.7}
                            />
                        ))}
                        {isHovered &&
                            country.rings.map((points, index) => (
                                <Line
                                    key={`${country.id}-${index}-glow`}
                                    points={points}
                                    color="#dff7ff"
                                    transparent
                                    opacity={0.45}
                                    lineWidth={3.4}
                                />
                            ))}
                    </group>
                )
            })}
        </group>
    )
}