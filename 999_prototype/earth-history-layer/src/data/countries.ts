import type { CountryInfo } from '../types'

const japanGeometry: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { id: 'JPN', name: '日本' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [129.5, 31.0],
            [131.0, 31.0],
            [132.0, 33.0],
            [134.0, 33.5],
            [135.5, 34.5],
            [137.0, 35.0],
            [140.0, 36.0],
            [141.0, 38.0],
            [141.5, 41.0],
            [141.0, 43.0],
            [140.0, 43.5],
            [139.5, 43.0],
            [140.0, 41.5],
            [139.5, 38.5],
            [137.0, 36.5],
            [136.0, 36.0],
            [134.5, 35.5],
            [132.5, 34.0],
            [131.5, 33.5],
            [130.5, 33.0],
            [130.0, 32.5],
            [129.5, 31.0],
        ]],
    },
}

const unitedStatesGeometry: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { id: 'USA', name: 'アメリカ合衆国' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-124.8, 32.0],
            [-122.0, 40.0],
            [-124.0, 48.8],
            [-111.0, 49.0],
            [-95.0, 49.0],
            [-82.0, 45.0],
            [-67.0, 44.0],
            [-73.0, 40.0],
            [-75.5, 35.0],
            [-80.0, 30.0],
            [-97.0, 25.8],
            [-107.0, 31.0],
            [-117.0, 32.0],
            [-124.8, 32.0],
        ]],
    },
}

const chinaGeometry: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { id: 'CHN', name: '中国' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [73.5, 18.0],
            [79.0, 29.0],
            [87.0, 39.0],
            [95.0, 48.0],
            [109.0, 49.5],
            [123.0, 47.0],
            [134.5, 48.0],
            [131.5, 42.0],
            [124.0, 40.0],
            [121.0, 31.0],
            [113.0, 22.0],
            [104.0, 21.0],
            [97.0, 24.0],
            [88.0, 28.0],
            [81.0, 31.0],
            [73.5, 18.0],
        ]],
    },
}

const indiaGeometry: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { id: 'IND', name: 'インド' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [68.0, 23.0],
            [70.0, 28.0],
            [73.5, 34.5],
            [78.0, 35.5],
            [84.0, 30.0],
            [89.0, 27.0],
            [92.5, 26.0],
            [88.0, 21.0],
            [81.0, 8.0],
            [76.0, 8.0],
            [72.0, 19.0],
            [68.0, 23.0],
        ]],
    },
}

const unitedKingdomGeometry: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
    type: 'Feature',
    properties: { id: 'GBR', name: 'イギリス' },
    geometry: {
        type: 'MultiPolygon',
        coordinates: [
            [[
                [-8.6, 49.8],
                [-6.0, 50.0],
                [-4.0, 50.2],
                [-1.0, 50.5],
                [1.8, 51.0],
                [1.0, 53.0],
                [-2.0, 55.8],
                [-4.5, 57.8],
                [-6.5, 58.5],
                [-7.8, 56.0],
                [-8.6, 52.0],
                [-8.6, 49.8],
            ]],
            [[
                [-10.5, 51.2],
                [-8.0, 51.2],
                [-6.0, 53.0],
                [-6.0, 55.2],
                [-8.5, 55.3],
                [-10.5, 53.5],
                [-10.5, 51.2],
            ]],
        ],
    },
}

const brazilGeometry: GeoJSON.Feature<GeoJSON.Polygon> = {
    type: 'Feature',
    properties: { id: 'BRA', name: 'ブラジル' },
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-73.5, -7.0],
            [-70.0, 1.0],
            [-60.0, 5.0],
            [-50.0, 4.5],
            [-35.0, -7.0],
            [-38.0, -14.0],
            [-43.0, -22.5],
            [-49.0, -30.0],
            [-57.0, -33.0],
            [-62.0, -28.0],
            [-69.0, -14.0],
            [-73.5, -7.0],
        ]],
    },
}

export const countries: CountryInfo[] = [
    {
        id: 'JPN',
        name: '日本',
        color: '#00ff78',
        geometry: japanGeometry,
    },
    {
        id: 'USA',
        name: 'アメリカ合衆国',
        color: '#53b8ff',
        geometry: unitedStatesGeometry,
    },
    {
        id: 'CHN',
        name: '中国',
        color: '#4fe08d',
        geometry: chinaGeometry,
    },
    {
        id: 'IND',
        name: 'インド',
        color: '#ffd166',
        geometry: indiaGeometry,
    },
    {
        id: 'GBR',
        name: 'イギリス',
        color: '#9d8cff',
        geometry: unitedKingdomGeometry,
    },
    {
        id: 'BRA',
        name: 'ブラジル',
        color: '#22d98a',
        geometry: brazilGeometry,
    },
]

export const countriesById = Object.fromEntries(countries.map((country) => [country.id, country]))