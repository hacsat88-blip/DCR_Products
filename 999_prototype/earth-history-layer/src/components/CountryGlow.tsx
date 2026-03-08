import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geoOrthographic, geoPath } from 'd3-geo'

// 日本のGeoJSON外形（useGeoHoverと同じ定義）
const JAPAN_COORDS: [number, number][] = [
    [129.5, 31.0], [131.0, 31.0], [132.0, 33.0], [134.0, 33.5],
    [135.5, 34.5], [137.0, 35.0], [140.0, 36.0], [141.0, 38.0],
    [141.5, 41.0], [141.0, 43.0], [140.0, 43.5], [139.5, 43.0],
    [140.0, 41.5], [139.5, 38.5], [137.0, 36.5], [136.0, 36.0],
    [134.5, 35.5], [132.5, 34.0], [131.5, 33.5], [130.5, 33.0],
    [130.0, 32.5], [129.5, 31.0],
]

/**
 * 緯度経度→球面上の3D座標に変換
 * @param lon 経度（度）
 * @param lat 緯度（度）
 * @param radius 球の半径
 */
function latLonToVec3(lon: number, lat: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    )
}

interface CountryGlowProps {
    isHovered: boolean
    globeRadius: number
}

/**
 * ホバー中の国に対し、地球表面にオーバーレイする発光メッシュ。
 * 呼吸するようなpulseアニメーション付き。
 */
export function CountryGlow({ isHovered, globeRadius }: CountryGlowProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.MeshBasicMaterial>(null)

    // GeoJSON座標からThree.jsジオメトリを生成
    const geometry = useMemo(() => {
        const glowRadius = globeRadius + 0.005 // 地表から少し浮かせる
        const points = JAPAN_COORDS.map(([lon, lat]) =>
            latLonToVec3(lon, lat, glowRadius)
        )

        // 中心点を計算
        const center = new THREE.Vector3()
        points.forEach((p) => center.add(p))
        center.divideScalar(points.length)
        center.normalize().multiplyScalar(glowRadius)

        // 三角形ファンでジオメトリを構成
        const vertices: number[] = []
        for (let i = 0; i < points.length - 1; i++) {
            vertices.push(center.x, center.y, center.z)
            vertices.push(points[i].x, points[i].y, points[i].z)
            vertices.push(points[i + 1].x, points[i + 1].y, points[i + 1].z)
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geo.computeVertexNormals()
        return geo
    }, [globeRadius])

    // 呼吸アニメーション
    useFrame(({ clock }) => {
        if (materialRef.current && isHovered) {
            const t = clock.getElapsedTime()
            materialRef.current.opacity = 0.3 + 0.25 * Math.sin(t * 2.5)
        }
    })

    if (!isHovered) return null

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshBasicMaterial
                ref={materialRef}
                color="#00ff78"
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    )
}
