import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { countries } from '../data/countries'
import { getFeatureRings, latLonToVec3 } from '../lib/globeGeometry'

interface CountryBordersProps {
    globeRadius: number
    hoveredCountry: string | null
}

export function CountryBorders({ globeRadius, hoveredCountry }: CountryBordersProps) {
    const borderGroups = useMemo(() => {
        const radius = globeRadius + 0.01

        return countries.map((country) => ({
            id: country.id,
            color: country.color,
            rings: getFeatureRings(country.geometry).map((ring) =>
                ring.map(([lon, lat]) => latLonToVec3(lon, lat, radius))
            ),
        }))
    }, [globeRadius])

    return (
        <group>
            {borderGroups.map((country) => {
                const isHovered = hoveredCountry === country.id
                const opacity = hoveredCountry ? (isHovered ? 0.95 : 0.22) : 0.4

                return (
                    <group key={country.id}>
                        {country.rings.map((points, index) => (
                            <Line
                                key={`${country.id}-${index}`}
                                points={points}
                                color={country.color}
                                transparent
                                opacity={opacity}
                                lineWidth={1}
                            />
                        ))}

                        {isHovered &&
                            country.rings.map((points, index) => (
                                <Line
                                    key={`${country.id}-${index}-glow`}
                                    points={points}
                                    color={country.color}
                                    transparent
                                    opacity={0.55}
                                    lineWidth={2.4}
                                />
                            ))}
                    </group>
                )
            })}
        </group>
    )
}