import type { Feature, MultiPolygon, Polygon } from 'geojson'

export type CountryGeometry = Feature<Polygon | MultiPolygon>

export interface CountryInfo {
    id: string
    name: string
    geometry: CountryGeometry
    color: string
    centroid: [number, number]
}