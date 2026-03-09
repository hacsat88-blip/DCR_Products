import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { geoCentroid } from 'd3-geo'
import { feature } from 'topojson-client'
import worldAtlas from 'world-atlas/countries-110m.json'
import type { CountryInfo } from '../types'

const highlightPalette = ['#57c8ff', '#7be2ff', '#4fb4ff', '#9ee6ff', '#77b7ff']

type AtlasFeature = Feature<Polygon | MultiPolygon> & {
    id?: string | number
    properties?: {
        name?: string
    }
}

type AtlasCollection = FeatureCollection<Polygon | MultiPolygon>

const atlasCountries = feature(
    worldAtlas as unknown as never,
    (worldAtlas as { objects: { countries: unknown } }).objects.countries as never
) as unknown as AtlasCollection

const rawCountries = atlasCountries.features as AtlasFeature[]

export const countries: CountryInfo[] = rawCountries
    .filter((country) => country.properties?.name && country.properties.name !== 'Antarctica')
    .map((country, index) => ({
        id: String(country.id ?? country.properties?.name ?? index),
        name: country.properties?.name ?? 'Unknown country',
        geometry: country,
        color: highlightPalette[index % highlightPalette.length],
        centroid: geoCentroid(country) as [number, number],
    }))

export const countriesById = Object.fromEntries(countries.map((country) => [country.id, country]))