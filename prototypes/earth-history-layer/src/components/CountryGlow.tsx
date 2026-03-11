import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { countriesById } from '../data/countries'
import { getFeatureRings, latLonToVec3 } from '../lib/globeGeometry'

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

/**
 * ホバー中の国に対し、地球表面にオーバーレイする発光メッシュ。
 * 呼吸するようなpulseアニメーション付き。
 */
export function CountryGlow({ countryId, globeRadius }: CountryGlowProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.MeshBasicMaterial>(null)

    // GeoJSON座標からThree.jsジオメトリを生成
    const geometry = useMemo(() => {
        if (!countryId) return null

        const country = countriesById[countryId]
        if (!country) return null

        const glowRadius = globeRadius + 0.005 // 地表から少し浮かせる
        const vertices: number[] = []

        getFeatureRings(country.geometry).forEach((ring) => {
            appendTriangleFan(vertices, ring, glowRadius)
        })

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geo.computeVertexNormals()
        return geo
    }, [countryId, globeRadius])

    // 呼吸アニメーション
    useFrame(({ clock }) => {
        if (materialRef.current && countryId) {
            const t = clock.getElapsedTime()
            materialRef.current.opacity = 0.3 + 0.25 * Math.sin(t * 2.5)
        }
    })

    if (!countryId || !geometry) return null

    const color = countriesById[countryId]?.color ?? '#00ff78'

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshBasicMaterial
                ref={materialRef}
                color={color}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    )
}
