import { useEffect, useMemo, useRef } from 'react'
import { Sparkles, Stars } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { CountryBorders } from './CountryBorders'
import { CountryGlow } from './CountryGlow'
import { CountryLabel } from './CountryLabel'

const GLOBE_RADIUS = 2
const DAY_TEXTURE_URL = '/textures/earth_day.jpg'
const BUMP_TEXTURE_URL = '/textures/earth_bump.png'
const NIGHT_TEXTURE_URL = '/textures/earth_night.png'
const CLOUD_TEXTURE_URL = '/textures/earth_clouds.png'

const atmosphereVertexShader = `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const atmosphereFragmentShader = `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDirection, normalize(vWorldNormal)), 0.0), 3.8);
  vec3 glow = mix(vec3(0.10, 0.35, 0.85), vec3(0.55, 0.88, 1.0), 0.62);
  gl_FragColor = vec4(glow, fresnel * 0.55);
}
`

interface GlobeProps {
    hoveredCountry: string | null
    globeRotation: { x: number; y: number }
    onRotationChange: (rotation: THREE.Euler) => void
}

export function Globe({ hoveredCountry, globeRotation, onRotationChange }: GlobeProps) {
    const globeRef = useRef<THREE.Group>(null)
    const cloudsRef = useRef<THREE.Mesh>(null)
    const [dayTexture, bumpTexture, nightTexture, cloudTexture] = useLoader(THREE.TextureLoader, [
        DAY_TEXTURE_URL,
        BUMP_TEXTURE_URL,
        NIGHT_TEXTURE_URL,
        CLOUD_TEXTURE_URL,
    ])

    useEffect(() => {
        dayTexture.colorSpace = THREE.SRGBColorSpace
        nightTexture.colorSpace = THREE.SRGBColorSpace
        cloudTexture.colorSpace = THREE.SRGBColorSpace
        ;[dayTexture, bumpTexture, nightTexture, cloudTexture].forEach((texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.anisotropy = 8
        })
    }, [bumpTexture, cloudTexture, dayTexture, nightTexture])

    const atmosphereMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: atmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                side: THREE.BackSide,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            }),
        []
    )

    useFrame(({ clock }) => {
        if (globeRef.current) {
            globeRef.current.rotation.x = THREE.MathUtils.lerp(globeRef.current.rotation.x, globeRotation.x, 0.14)
            globeRef.current.rotation.y = THREE.MathUtils.lerp(globeRef.current.rotation.y, globeRotation.y, 0.14)
            onRotationChange(globeRef.current.rotation)
        }

        if (cloudsRef.current) {
            cloudsRef.current.rotation.y += 0.00055
        }

        const pulse = 0.75 + Math.sin(clock.getElapsedTime() * 0.2) * 0.08
        atmosphereMaterial.opacity = pulse
    })

    return (
        <>
            <color attach="background" args={['#02040b']} />

            <fog attach="fog" args={['#02040b', 8, 18]} />

            <Stars radius={90} depth={50} count={6000} factor={3.8} saturation={0} fade speed={0.32} />
            <Sparkles count={90} scale={[12, 12, 12]} size={2.6} speed={0.18} opacity={0.9} color="#8fd8ff" />

            <ambientLight intensity={0.22} color="#6ca7ff" />
            <hemisphereLight intensity={0.46} color="#b6e9ff" groundColor="#040712" />
            <directionalLight position={[5, 2, 5]} intensity={2.1} color="#fff5db" />
            <pointLight position={[-6, -2, -5]} intensity={24} distance={18} color="#1e6dff" />

            <group ref={globeRef}>
                <mesh>
                    <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
                    <meshPhongMaterial
                        map={dayTexture}
                        bumpMap={bumpTexture}
                        bumpScale={0.06}
                        emissiveMap={nightTexture}
                        emissive={new THREE.Color('#2647a8')}
                        emissiveIntensity={0.9}
                        specular={new THREE.Color('#7ec7ff')}
                        shininess={18}
                    />
                </mesh>

                <mesh ref={cloudsRef} scale={1.015}>
                    <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
                    <meshPhongMaterial
                        map={cloudTexture}
                        transparent
                        opacity={0.18}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                <mesh scale={1.11} material={atmosphereMaterial}>
                    <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
                </mesh>

                <mesh scale={1.17}>
                    <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
                    <meshBasicMaterial
                        color="#183f95"
                        transparent
                        opacity={0.06}
                        side={THREE.BackSide}
                    />
                </mesh>

                <CountryBorders globeRadius={GLOBE_RADIUS} hoveredCountry={hoveredCountry} />
                <CountryGlow countryId={hoveredCountry} globeRadius={GLOBE_RADIUS} />
                <CountryLabel countryId={hoveredCountry} globeRadius={GLOBE_RADIUS} />
            </group>
        </>
    )
}