export interface HistoryEvent {
    id: string
    countryId: string
    year: number
    title_kids: string
    title_adult: string
    desc_kids: string
    desc_adult: string
}

export interface CountryInfo {
    id: string
    name: string
    color: string
    geometry: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
}
