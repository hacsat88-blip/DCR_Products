import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { countriesById } from '../data/world'
import { latLonToVec3 } from '../lib/globeGeometry'

interface CountryLabelProps {
    countryId: string | null
    globeRadius: number
}

export function CountryLabel({ countryId, globeRadius }: CountryLabelProps) {
    const groupRef = useRef<THREE.Group>(null)
    const shellRef = useRef<HTMLDivElement>(null)
    const country = countryId ? countriesById[countryId] : null
    const position = country
        ? latLonToVec3(country.centroid[0], country.centroid[1], globeRadius + 0.22)
        : null

    useFrame(({ camera }) => {
        if (!country || !groupRef.current || !shellRef.current) return

        const worldPosition = groupRef.current.getWorldPosition(new THREE.Vector3())
        const surfaceNormal = worldPosition.clone().normalize()
        const cameraDirection = camera.position.clone().normalize()
        const visibilityDot = surfaceNormal.dot(cameraDirection)
        const opacity = THREE.MathUtils.clamp((visibilityDot - 0.02) / 0.22, 0, 1)
        const scale = 0.92 + opacity * 0.08

        shellRef.current.style.opacity = String(opacity)
        shellRef.current.style.transform = `scale(${scale})`
        shellRef.current.style.visibility = opacity < 0.04 ? 'hidden' : 'visible'
    })

    if (!country || !position) return null

    return (
        <group ref={groupRef} position={position}>
            <Html center distanceFactor={8.5} occlude transform sprite>
                <div ref={shellRef} className="country-label-shell">
                    <span className="country-label-beacon" />
                    <div className="country-label-card">
                        <span className="country-label-caption">hovered nation</span>
                        <strong>{country.name}</strong>
                    </div>
                </div>
            </Html>
        </group>
    )
}