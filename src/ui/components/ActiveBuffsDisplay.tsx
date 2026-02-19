'use client';

import { useState, useEffect } from 'react';
import { ActiveBuff } from '@/core/types';
import './GachaRoulette.css';

interface ActiveBuffsDisplayProps {
    buffs: ActiveBuff[];
}

function getTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default function ActiveBuffsDisplay({ buffs }: ActiveBuffsDisplayProps) {
    const [, forceUpdate] = useState(0);

    // Tick every minute to update timers
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 60_000);
        return () => clearInterval(interval);
    }, []);

    // Filter only non-expired buffs
    const activeBuffs = buffs.filter(b => new Date(b.expiresAt) > new Date());

    if (activeBuffs.length === 0) return null;

    return (
        <div className="active-buffs-container">
            {activeBuffs.map(buff => (
                <div key={buff.id} className={`active-buff-card ${buff.buffType}`}>
                    {/* LEFT: Icon & Multiplier */}
                    <div className="buff-left">
                        <div className="buff-icon-container">
                            <span className="buff-icon">
                                {buff.buffType === 'global' ? '⚡' : '🔥'}
                            </span>
                        </div>
                        <div className="buff-multiplier-group">
                            <span className="buff-multiplier">x{buff.multiplier}</span>
                            <span className="buff-label">BOOST</span>
                        </div>
                    </div>

                    {/* CENTER: Title */}
                    <div className="buff-center">
                        <span className="buff-title-large">
                            {buff.buffType === 'global'
                                ? 'Multiplicador Global'
                                : 'Bonus de Actividad'}
                        </span>
                    </div>

                    {/* RIGHT: Timer */}
                    <div className="buff-right">
                        <div className="buff-timer">
                            <span className="timer-icon">⏳</span>
                            <span className="timer-text">
                                {getTimeRemaining(buff.expiresAt)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
