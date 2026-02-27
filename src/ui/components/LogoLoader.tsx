'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   SENDA DE LOGROS — EPIC LOADER
   4 phases, orbital particles, motivational text,
   progress bar, and cinematic exit transition.
   ═══════════════════════════════════════════════════════════ */

const PHRASES = [
    'Cargando tu progreso...',
    'Cada día cuenta.',
    'Tu racha te espera.',
    'Preparando la experiencia...',
];

const BRAND = 'SENDA DE LOGROS';

// ── Particle config ──
const RING_1 = { radius: 120, count: 8, speed: 4, dir: 1 };
const RING_2 = { radius: 180, count: 12, speed: 7, dir: -1 };
const RING_3 = { radius: 250, count: 6, speed: 11, dir: 1 };
const SPARK_COUNT = 18;

interface Props {
    onComplete?: () => void;
}

export default function LogoLoader({ onComplete }: Props) {
    const [phase, setPhase] = useState(0); // 0=hidden, 1–4
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [phraseVisible, setPhraseVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const [brandRevealed, setBrandRevealed] = useState(false);
    const [exitFlash, setExitFlash] = useState(false);
    const [exitDone, setExitDone] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const startRef = useRef(0);
    const convergeRef = useRef(false);

    // ── Phase timeline ──
    useEffect(() => {
        const t0 = Date.now();
        startRef.current = t0;

        // Phase 1: 0ms
        setPhase(1);
        setBrandRevealed(true);

        // Phase 2: 400ms
        const p2 = setTimeout(() => setPhase(2), 400);

        // Phase 3: 1600ms
        const p3 = setTimeout(() => setPhase(3), 1600);

        // Phase 4: 2400ms — exit sequence
        const p4 = setTimeout(() => {
            setPhase(4);
            convergeRef.current = true;
            setTimeout(() => setExitFlash(true), 200);
            setTimeout(() => {
                setExitFlash(false);
                setExitDone(true);
                onComplete?.();
            }, 650);
        }, 2400);

        return () => { clearTimeout(p2); clearTimeout(p3); clearTimeout(p4); };
    }, [onComplete]);

    // ── Phrase rotation ──
    useEffect(() => {
        if (phase < 2) return;
        setPhraseVisible(true);
        const interval = setInterval(() => {
            setPhraseVisible(false);
            setTimeout(() => {
                setPhraseIdx(i => (i + 1) % PHRASES.length);
                setPhraseVisible(true);
            }, 300);
        }, 1100);
        return () => clearInterval(interval);
    }, [phase]);

    // ── Progress bar ──
    useEffect(() => {
        if (phase < 1) return;
        const start = Date.now();
        const dur = 2400;
        const tick = () => {
            const elapsed = Date.now() - start;
            const p = Math.min(1, elapsed / dur);
            // ease-in-out
            const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            setProgress(eased * 100);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [phase]);

    // ── Canvas particles (Sparks — Type B) ──
    const drawSparks = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width = window.innerWidth;
        const H = canvas.height = window.innerHeight;
        const cx = W / 2;
        const cy = H / 2;

        type Spark = { x: number; y: number; vy: number; vx: number; life: number; maxLife: number; size: number };
        const sparks: Spark[] = [];

        const spawnSpark = () => {
            sparks.push({
                x: cx + (Math.random() - 0.5) * 40,
                y: cy + 10,
                vy: -(1 + Math.random() * 2),
                vx: (Math.random() - 0.5) * 1.2,
                life: 0,
                maxLife: 90 + Math.random() * 60,
                size: 1 + Math.random() * 1.5,
            });
        };

        for (let i = 0; i < SPARK_COUNT; i++) {
            sparks.push({
                x: cx + (Math.random() - 0.5) * 40,
                y: cy + 10 - Math.random() * 120,
                vy: -(1 + Math.random() * 2),
                vx: (Math.random() - 0.5) * 1.2,
                life: Math.random() * 60,
                maxLife: 90 + Math.random() * 60,
                size: 1 + Math.random() * 1.5,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, W, H);

            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.life++;
                s.x += s.vx;
                s.y += s.vy;

                if (convergeRef.current) {
                    // Converge toward center
                    s.vx += (cx - s.x) * 0.05;
                    s.vy += (cy - s.y) * 0.05;
                }

                const alpha = Math.max(0, 1 - s.life / s.maxLife) * 0.5;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fill();

                if (s.life >= s.maxLife) {
                    sparks.splice(i, 1);
                    if (!convergeRef.current) spawnSpark();
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };
        animate();
    }, []);

    useEffect(() => {
        if (phase >= 1) drawSparks();
        return () => cancelAnimationFrame(rafRef.current);
    }, [phase, drawSparks]);

    if (exitDone) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
    const scale = isMobile ? 0.75 : 1;

    return (
        <div style={{
            ...S.root,
            opacity: exitFlash ? 0 : 1,
            transition: 'opacity 0.3s',
        }}>
            {/* Full-screen white flash */}
            {exitFlash && <div style={S.flash} />}

            {/* Canvas for ascending sparks */}
            <canvas ref={canvasRef} style={S.canvas} />

            {/* Content */}
            <div style={{ ...S.content, transform: `scale(${scale})` }}>
                {/* Brand letters */}
                <p style={S.brand}>
                    {BRAND.split('').map((ch, i) => (
                        <span key={i} style={{
                            ...S.brandLetter,
                            opacity: brandRevealed ? 1 : 0,
                            transform: brandRevealed ? 'translateY(0)' : 'translateY(8px)',
                            transitionDelay: `${i * 40}ms`,
                        }}>{ch}</span>
                    ))}
                </p>

                {/* Logo wrapper */}
                <div style={S.logoArea}>
                    {/* Halo layers */}
                    <div style={{
                        ...S.haloInner,
                        opacity: phase >= 2 ? 0.5 : 0,
                    }} />
                    <div style={{
                        ...S.haloOuter,
                        opacity: phase >= 2 ? 0.3 : 0,
                    }} />

                    {/* Pulse rings */}
                    {phase >= 2 && (
                        <>
                            <div style={S.pulseRing} className="ll-pulse-1" />
                            <div style={S.pulseRing} className="ll-pulse-2" />
                        </>
                    )}

                    {/* Orbital particles – Type A */}
                    {phase >= 2 && (
                        <>
                            {renderRing(RING_1, 'violet')}
                            {renderRing(RING_2, 'gold')}
                            {renderRing(RING_3, 'violet')}
                        </>
                    )}

                    {/* Energy bolts – Type C (Phase 2 only) */}
                    {phase === 2 && (
                        <div className="ll-bolts">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`ll-bolt ll-bolt-${i}`} />
                            ))}
                        </div>
                    )}

                    {/* Logo image */}
                    <img
                        src="/logo.png"
                        alt="Senda de Logros"
                        style={{
                            ...S.logo,
                            borderRadius: '40%',
                            opacity: phase >= 1 ? 1 : 0,
                            transform: phase >= 4
                                ? 'scale(1.15)'
                                : phase >= 1
                                    ? 'scale(1)'
                                    : 'scale(0.6)',
                        }}
                        className={phase >= 2 && phase < 4 ? 'll-float' : ''}
                    />
                </div>

                {/* Phrase */}
                <p style={{
                    ...S.phrase,
                    opacity: phraseVisible ? 1 : 0,
                    transform: phraseVisible ? 'translateY(0)' : 'translateY(10px)',
                    color: phase >= 4 ? '#f5c842' : 'rgba(255,255,255,0.6)',
                }}>
                    {phase >= 4 ? '¡Listo!' : PHRASES[phraseIdx]}
                </p>

                {/* Progress bar */}
                <div style={S.progressWrap}>
                    <div style={S.progressTrack}>
                        <div style={{
                            ...S.progressFill,
                            width: `${progress}%`,
                        }} />
                        <div style={{
                            ...S.progressDot,
                            left: `${progress}%`,
                        }} />
                    </div>
                </div>
            </div>

            {/* Inline styles for keyframes */}
            <style>{KEYFRAMES}</style>
        </div>
    );
}

// ── Orbital ring renderer ──
function renderRing(cfg: { radius: number; count: number; speed: number; dir: number }, color: 'violet' | 'gold') {
    const c = color === 'violet' ? '#6c63ff' : '#f5c842';
    const size = cfg.radius * 2;
    return (
        <div
            className="ll-orbit-ring"
            style={{
                width: size,
                height: size,
                animationDuration: `${cfg.speed}s`,
                animationDirection: cfg.dir === -1 ? 'reverse' : 'normal',
            }}
        >
            {Array.from({ length: cfg.count }).map((_, i) => {
                const angle = (360 / cfg.count) * i;
                const dotSize = 3 + Math.random() * 2;
                return (
                    <div key={i} style={{
                        position: 'absolute' as const,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: '50%',
                        background: c,
                        boxShadow: `0 0 6px ${c}, 0 0 12px ${c}50`,
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${angle}deg) translateX(${cfg.radius}px) translateY(-50%)`,
                        transformOrigin: '0 0',
                    }} />
                );
            })}
        </div>
    );
}

// ── Static inline styles (no external CSS dependency) ──
const S: Record<string, React.CSSProperties> = {
    root: {
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#07070e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    flash: {
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'white',
        animation: 'llFlash 0.45s ease-out forwards',
    },
    canvas: {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none' as const,
    },
    content: {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
    },
    brand: {
        fontFamily: "'Sora', sans-serif",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: 'uppercase' as const,
        color: '#6c63ff',
        margin: 0,
        display: 'flex',
    },
    brandLetter: {
        display: 'inline-block',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
    },
    logoArea: {
        position: 'relative',
        width: 300,
        height: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    haloInner: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.4) 0%, transparent 70%)',
        filter: 'blur(30px)',
        transition: 'opacity 0.6s',
    },
    haloOuter: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,200,66,0.25) 0%, transparent 70%)',
        filter: 'blur(50px)',
        transition: 'opacity 0.6s',
    },
    pulseRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: '2px solid rgba(108,99,255,0.5)',
        boxShadow: '0 0 15px rgba(245,200,66,0.3), 0 0 30px rgba(108,99,255,0.2)',
        pointerEvents: 'none' as const,
    },
    logo: {
        width: 120,
        height: 120,
        objectFit: 'contain' as const,
        position: 'relative',
        zIndex: 2,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
        filter: 'drop-shadow(0 0 20px rgba(108,99,255,0.5))',
    },
    phrase: {
        fontFamily: "'Sora', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
        margin: 0,
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, color 0.3s',
        minHeight: 22,
    },
    progressWrap: {
        width: 200,
    },
    progressTrack: {
        position: 'relative',
        width: '100%',
        height: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'visible',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
        background: 'linear-gradient(90deg, #6c63ff, #f5c842)',
        boxShadow: '0 0 8px #6c63ff',
        transition: 'width 0.05s linear',
    },
    progressDot: {
        position: 'absolute',
        top: -1,
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 0 6px #fff, 0 0 12px #6c63ff',
        transform: 'translateX(-50%)',
        transition: 'left 0.05s linear',
    },
};

// ── Keyframes ──
const KEYFRAMES = `
@keyframes llFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1); }
}
.ll-float { animation: llFloat 2.5s ease-in-out infinite; }

@keyframes llPulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
}
.ll-pulse-1 { animation: llPulse 1.2s ease-out infinite; }
.ll-pulse-2 { animation: llPulse 1.2s ease-out infinite 0.6s; }

@keyframes llOrbit { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
.ll-orbit-ring {
    position: absolute;
    top: 50%; left: 50%;
    animation: llOrbit linear infinite;
    pointer-events: none;
}

/* Energy bolts – Type C */
.ll-bolts { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.ll-bolt {
    position: absolute;
    top: 50%; left: 50%;
    width: 2px;
    background: linear-gradient(to right, rgba(255,255,255,0.9), transparent);
    border-radius: 2px;
    opacity: 0;
    animation: llBoltFlicker 0.8s ease-in-out infinite;
}
.ll-bolt-0 { height: 18px; transform: rotate(30deg) translateX(60px); animation-delay: 0s; }
.ll-bolt-1 { height: 14px; transform: rotate(110deg) translateX(65px); animation-delay: 0.15s; }
.ll-bolt-2 { height: 20px; transform: rotate(200deg) translateX(55px); animation-delay: 0.3s; }
.ll-bolt-3 { height: 12px; transform: rotate(280deg) translateX(70px); animation-delay: 0.45s; }
.ll-bolt-4 { height: 16px; transform: rotate(340deg) translateX(60px); animation-delay: 0.6s; }
@keyframes llBoltFlicker {
    0%, 100% { opacity: 0; }
    25% { opacity: 0.9; }
    50% { opacity: 0; }
    75% { opacity: 0.7; }
}

@keyframes llFlash {
    0% { opacity: 0; }
    30% { opacity: 0.85; }
    100% { opacity: 0; }
}

/* Mobile scale */
@media (max-width: 480px) {
    .ll-orbit-ring { transform: scale(0.65) !important; }
}
`;
