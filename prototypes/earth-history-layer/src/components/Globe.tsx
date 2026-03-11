import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { CountryBorders } from './CountryBorders'
import { CountryGlow } from './CountryGlow'

const GLOBE_RADIUS = 2
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png'

interface GlobeProps {
    hoveredCountry: string | null
    globeRotation: { x: number; y: number }
    onRotationChange: (rotation: THREE.Euler) => void
}

/**
 * 3D地球コンポーネント。
 * NASA Blue Marbleテクスチャで地球を描画し、
 * OrbitControlsでドラッグ回転を制御する。
 */
export function Globe({ hoveredCountry, globeRotation, onRotationChange }: GlobeProps) {
    const globeRef = useRef<THREE.Group>(null)

    // テクスチャの読み込み
    const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL)
    const bumpTexture = useLoader(THREE.TextureLoader, EARTH_BUMP_URL)

    // 毎フレーム回転状態をd3-geo側に同期
    useFrame(() => {
        if (globeRef.current) {
            globeRef.current.rotation.x = THREE.MathUtils.lerp(globeRef.current.rotation.x, globeRotation.x, 0.18)
            globeRef.current.rotation.y = THREE.MathUtils.lerp(globeRef.current.rotation.y, globeRotation.y, 0.18)
            onRotationChange(globeRef.current.rotation)
        }
    })

    return (
        <>
            {/* 宇宙の星フィールド */}
            <Stars
                radius={100}
                depth={60}
                count={5000}
                factor={4}
                saturation={0.1}
                fade
                speed={0.5}
            />

            {/* 環境光＋方向光 */}
            <ambientLight intensity={0.15} />
            <directionalLight position={[5, 3, 5]} intensity={1.8} color="#fff5ee" />
            <directionalLight position={[-3, -1, -3]} intensity={0.3} color="#4488ff" />

            {/* 地球本体 */}
            <group ref={globeRef}>
                <mesh>
                    <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
                    <meshPhongMaterial
                        map={earthTexture}
                        bumpMap={bumpTexture}
                        bumpScale={0.015}
                        specular={new THREE.Color('#333344')}
                        shininess={15}
                    />

                    {/* 大気のグロー */}
                    <mesh scale={1.025}>
                        <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
                        <meshBasicMaterial
                            color="#4488ff"
                            transparent
                            opacity={0.08}
                            side={THREE.BackSide}
                        />
                    </mesh>

                    <CountryBorders globeRadius={GLOBE_RADIUS} hoveredCountry={hoveredCountry} />

                    {/* 国発光オーバーレイ */}
                    <CountryGlow
                        countryId={hoveredCountry}
                        globeRadius={GLOBE_RADIUS}
                    />
                </mesh>
            </group>
        </>
    )
}
