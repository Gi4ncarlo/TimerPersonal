'use client';

import { useEffect, useState } from 'react';
import { League } from '@/core/types';
import './LevelUpModal.css';

interface LevelUpModalProps {
    isOpen: boolean;
    league: League | null;
    onClose: () => void;
}

export default function LevelUpModal({ isOpen, league, onClose }: LevelUpModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            setTimeout(() => setIsVisible(false), 300); // match transition
        }
    }, [isOpen]);

    if (!isVisible || !league) return null;

    return (
        <div className={`levelup-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className="levelup-content" onClick={(e) => e.stopPropagation()}>

                <div className="levelup-glow" style={{ background: `radial-gradient(circle, ${league.color}80 0%, transparent 70%)` }} />

                <h2 className="levelup-title">¡RANGO ALCANZADO!</h2>

                <img
                    src={league.imgUrl}
                    alt={league.tier}
                    className={`levelup-badge ${isOpen ? 'animate-pop' : ''}`}
                    style={{ filter: `drop-shadow(0px 10px 25px ${league.color})` }}
                />

                <h1 className="levelup-tier-name" style={{ color: league.color }}>
                    LIGA {league.tier.toUpperCase()}
                </h1>

                <p className="levelup-subtitle">
                    Has demostrado ser digno. Tu viaje en la Senda continúa.
                </p>

                <button className="levelup-btn" onClick={onClose} style={{ boxShadow: `0 0 15px ${league.color}40`, border: `1px solid ${league.color}80` }}>
                    CONTINUAR
                </button>
            </div>
        </div>
    );
}
