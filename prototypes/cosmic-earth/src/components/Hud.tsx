import { countriesById } from '../data/world'

interface HudProps {
    hoveredCountry: string | null
}

export function Hud({ hoveredCountry }: HudProps) {
    const hovered = hoveredCountry ? countriesById[hoveredCountry] : null

    return (
        <>
            <div className="hero-shell pointer-events-none">
                <div className="hero-copy reveal-on-load">
                    <p className="hero-kicker">Orbital Atlas</p>
                    <h1 className="hero-title">宇宙に浮かぶ地球をなぞる</h1>
                    <p className="hero-description">
                        国にカーソルを合わせると、輪郭が青く発光し、地表から淡く浮き上がります。
                        ドラッグすると、静かな宇宙の中で地球をゆっくり回せます。
                    </p>
                </div>

                <div className="hero-meta reveal-on-load delayed-1">
                    <div className="status-card">
                        <span className="status-label">status</span>
                        <strong>{hovered ? hovered.name : 'Hover a nation'}</strong>
                        <span>{hovered ? 'Blue bloom engaged' : 'Scan the surface for countries'}</span>
                    </div>
                    <div className="status-card compact">
                        <span className="status-label">interaction</span>
                        <strong>Hover + drag</strong>
                        <span>world-atlas / d3-geo / Three.js</span>
                    </div>
                </div>
            </div>

            <div className="bottom-instruction reveal-on-load delayed-2">
                <span className="instruction-dot" />
                {hovered ? `${hovered.name} が青く浮かび上がっています` : 'ドラッグして回転 / 国にホバーして発光'}
            </div>
        </>
    )
}