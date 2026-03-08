import { useRef, useEffect } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { CountryGlow } from './CountryGlow'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'

const GLOBE_RADIUS = 2
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const EARTH_BUMP_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png'

interface GlobeProps {
    hoveredCountry: string | null
    onRotationChange: (rotation: THREE.Euler) => void
}

/**
 * 3D地球コンポーネント。
 * NASA Blue Marbleテクスチャで地球を描画し、
 * OrbitControlsでドラッグ回転を制御する。
 */
export function Globe({ hoveredCountry, onRotationChange }: GlobeProps) {
    const controlsRef = useRef<OrbitControlsType>(null)
    const globeRef = useRef<THREE.Mesh>(null)
    const { camera } = useThree()

    // テクスチャの読み込み
    const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL)
    const bumpTexture = useLoader(THREE.TextureLoader, EARTH_BUMP_URL)

    // 初期カメラ位置
    useEffect(() => {
        camera.position.set(0, 0, 5)
    }, [camera])

    // 毎フレーム回転状態をd3-geo側に同期
    useFrame(() => {
        if (globeRef.current) {
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
            <mesh ref={globeRef}>
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

                {/* 国発光オーバーレイ */}
                <CountryGlow
                    isHovered={hoveredCountry === 'JPN'}
                    globeRadius={GLOBE_RADIUS}
                />
            </mesh>

            {/* 回転コントロール */}
            <OrbitControls
                ref={controlsRef}
                enableZoom={true}
                enablePan={false}
                minDistance={3}
                maxDistance={10}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
                enableDamping
                dampingFactor={0.08}
            />
        </>
    )
}
