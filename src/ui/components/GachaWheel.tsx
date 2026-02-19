import React from 'react';

interface GachaWheelProps {
    spinning: boolean;
    size?: number;
}

export default function GachaWheel({ spinning, size = 280 }: GachaWheelProps) {
    // Wheel segments configuration
    const segments = [
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
        { color: '#4da6ff', label: 'RARO', type: 'rare' },
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
        { color: '#b44dff', label: 'EPICO', type: 'epic' },
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
        { color: '#ff6b6b', label: 'TROLL', type: 'troll' },
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
        { color: '#4da6ff', label: 'RARO', type: 'rare' },
        { color: '#ffd700', label: 'LEGEND', type: 'legendary' },
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
        { color: '#b44dff', label: 'EPICO', type: 'epic' },
        { color: '#a0a0a0', label: 'COMUN', type: 'common' },
    ];

    const radius = 100;
    const center = 150;
    const totalSegments = segments.length;
    const anglePerSegment = 360 / totalSegments;

    // Helper to calculate SVG path for a segment
    const getSectorPath = (index: number) => {
        const startAngle = index * anglePerSegment;
        const endAngle = (index + 1) * anglePerSegment;

        // Convert to radians (subtract 90deg to start from top)
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;

        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);

        return `M${center},${center} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;
    };

    return (
        <div className="roulette-container" style={{ width: size, height: size }}>
            <svg viewBox="0 0 300 300" className={`roulette-svg ${spinning ? 'spinning-fast' : ''}`}>
                <defs>
                    <filter id="metallic-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                        <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
                        <feFlood floodColor="rgba(255, 215, 0, 0.4)" result="glowColor" />
                        <feComposite in="glowColor" in2="offsetBlur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <linearGradient id="grad-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#444" />
                        <stop offset="50%" stopColor="#111" />
                        <stop offset="100%" stopColor="#333" />
                    </linearGradient>

                    <radialGradient id="grad-center" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="90%" stopColor="#b8860b" />
                        <stop offset="100%" stopColor="#8b6914" />
                    </radialGradient>
                </defs>

                {/* Outer Case / Lights Ring */}
                <circle cx="150" cy="150" r="145" fill="#1a1a2e" stroke="#000" strokeWidth="2" />
                <circle cx="150" cy="150" r="140" fill="#111" stroke="#ffd700" strokeWidth="4" filter="url(#metallic-glow)" />

                {/* Lights (Static for now, could be animated via CSS) */}
                {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i * 360 / 24) * Math.PI / 180;
                    const r = 132;
                    const x = 150 + r * Math.cos(angle);
                    const y = 150 + r * Math.sin(angle);
                    return <circle key={i} cx={x} cy={y} r="3" fill={i % 2 === 0 ? '#ffd700' : '#fff'} className="roulette-light" />;
                })}

                {/* The Wheel */}
                <g className="wheel-rotator">
                    {/* Background Circle */}
                    <circle cx="150" cy="150" r="100" fill="#222" />

                    {/* Segments */}
                    {segments.map((seg, i) => (
                        <g key={i}>
                            <path
                                d={getSectorPath(i)}
                                fill={seg.color}
                                stroke="#1a1a2e"
                                strokeWidth="1"
                            />
                            {/* Segment Content (Icon/Text) - Simplified for rotation */}
                            <g transform={`translate(150, 150) rotate(${i * anglePerSegment + anglePerSegment / 2}) translate(0, -70)`} >
                                <text
                                    textAnchor="middle"
                                    fill="rgba(0,0,0,0.6)"
                                    fontSize="8"
                                    fontWeight="bold"
                                    transform="rotate(90)"
                                >
                                    {/* Optional text or icon */}
                                    •
                                </text>
                            </g>
                        </g>
                    ))}

                    {/* Inner Divider Lines (Gold) */}
                    {segments.map((_, i) => {
                        const angle = (i * 360 / totalSegments - 90) * Math.PI / 180;
                        const x2 = 150 + 100 * Math.cos(angle);
                        const y2 = 150 + 100 * Math.sin(angle);
                        return <line key={`line-${i}`} x1="150" y1="150" x2={x2} y2={y2} stroke="#ffd700" strokeWidth="0.5" opacity="0.5" />;
                    })}
                </g>

                {/* Center Hub */}
                <circle cx="150" cy="150" r="25" fill="url(#grad-center)" stroke="#fff" strokeWidth="1" filter="url(#metallic-glow)" />
                <text x="150" y="150" dy="4" textAnchor="middle" fontSize="16" fill="#000">🎰</text>

                {/* Top Pointer */}
                <path d="M150,20 L140,5 L160,5 Z" fill="#ff4d4d" stroke="#fff" strokeWidth="2" filter="url(#metallic-glow)" />
            </svg>

            <style jsx>{`
                .roulette-container {
                    position: relative;
                    margin: 0 auto;
                }
                .roulette-svg {
                    width: 100%;
                    height: 100%;
                    overflow: visible;
                }
                .wheel-rotator {
                    transform-origin: 150px 150px;
                }
                .spinning-fast .wheel-rotator {
                    animation: spin 0.8s linear infinite;
                }
                .roulette-light {
                    animation: blink 1s infinite alternate;
                }
                .roulette-light:nth-child(even) {
                    animation-delay: 0.5s;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes blink {
                    from { opacity: 0.4; }
                    to { opacity: 1; filter: drop-shadow(0 0 5px #ffd700); }
                }
            `}</style>
        </div>
    );
}
