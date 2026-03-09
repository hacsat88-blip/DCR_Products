import * as THREE from 'three'
import type { CountryGeometry } from '../types'

export function latLonToVec3(lon: number, lat: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)

    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    )
}

export function getFeatureBorderRings(feature: CountryGeometry): [number, number][][] {
    if (feature.geometry.type === 'Polygon') {
        return feature.geometry.coordinates as [number, number][][]
    }

    return feature.geometry.coordinates.flatMap((polygon) => polygon as [number, number][][])
}

export function getFeatureOuterRings(feature: CountryGeometry): [number, number][][] {
    if (feature.geometry.type === 'Polygon') {
        return [feature.geometry.coordinates[0] as [number, number][]]
    }

    return feature.geometry.coordinates.map((polygon) => polygon[0] as [number, number][])
}