import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { countriesById } from '../data/world'
import { getFeatureOuterRings, latLonToVec3 } from '../lib/globeGeometry'

interface CountryGlowProps {
    countryId: string | null
    globeRadius: number
}

function appendTriangleFan(vertices: number[], ring: [number, number][], radius: number) {
    if (ring.length < 3) return

    const points = ring.map(([lon, lat]) => latLonToVec3(lon, lat, radius))
    const center = new THREE.Vector3()

    points.forEach((point) => center.add(point))
    center.divideScalar(points.length)
    center.normalize().multiplyScalar(radius)

    for (let index = 0; index < points.length - 1; index += 1) {
        vertices.push(center.x, center.y, center.z)
        vertices.push(points[index].x, points[index].y, points[index].z)
        vertices.push(points[index + 1].x, points[index + 1].y, points[index + 1].z)
    }
}

export function CountryGlow({ countryId, globeRadius }: CountryGlowProps) {
    const shellRef = useRef<THREE.Mesh>(null)
    const pulseRef = useRef<THREE.MeshBasicMaterial>(null)
    const bloomRef = useRef<THREE.MeshBasicMaterial>(null)

    const geometry = useMemo(() => {
        if (!countryId) return null

        const country = countriesById[countryId]
        if (!country) return null

        const vertices: number[] = []
        getFeatureOuterRings(country.geometry).forEach((ring) => appendTriangleFan(vertices, ring, globeRadius + 0.012))

        const nextGeometry = new THREE.BufferGeometry()
        nextGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        nextGeometry.computeVertexNormals()
        return nextGeometry
    }, [countryId, globeRadius])

    useFrame(({ clock }) => {
        if (!countryId) return

        const elapsed = clock.getElapsedTime()
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.2)

        if (shellRef.current) {
            const scale = 1.0015 + pulse * 0.007
            shellRef.current.scale.setScalar(scale)
        }

        if (pulseRef.current) {
            pulseRef.current.opacity = 0.24 + pulse * 0.26
        }

        if (bloomRef.current) {
            bloomRef.current.opacity = 0.12 + pulse * 0.14
        }
    })

    if (!countryId || !geometry) return null

    return (
        <group>
            <mesh ref={shellRef} geometry={geometry}>
                <meshBasicMaterial
                    ref={pulseRef}
                    color="#62d7ff"
                    transparent
                    opacity={0.4}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            <mesh geometry={geometry} scale={1.01}>
                <meshBasicMaterial
                    ref={bloomRef}
                    color="#baf2ff"
                    transparent
                    opacity={0.18}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    )
}