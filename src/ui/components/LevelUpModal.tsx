'use client';

import { useEffect, useState } from 'react';
import { getLevelTitle } from '@/core/config/levelRewards';
import Twemoji from './Twemoji';
import './LevelUpModal.css';

interface LevelUpModalProps {
    level: number;
    onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [title, setTitle] = useState('');

    useEffect(() => {
        setTitle(getLevelTitle(level));

        // Pequeño delay para que la clase "active" detone la animación de entrada
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, [level]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 400); // Esperar que termine la animación de salida
    };

    // Partículas cósmicas para el fondo
    const particles = Array.from({ length: 20 }).map((_, i) => (
        <div
            key={i}
            className="lu-particle"
            style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
            }}
        />
    ));

    return (
        <div className={`level-up-overlay ${isVisible ? 'active' : ''}`} onClick={handleClose}>
            <div className="lu-particles-container">
                {particles}
            </div>

            <div className="level-up-modal" onClick={(e) => e.stopPropagation()}>
                <div className="lu-header-fx" />

                <h2 className="lu-title">NIVEL ALCANZADO</h2>

                <div className="lu-number-glow">{level}</div>

                <div className="lu-divider">
                    <span className="lu-divider-line"></span>
                    <Twemoji emoji="⭐" />
                    <span className="lu-divider-line"></span>
                </div>

                <h3 className="lu-rank-name">{title}</h3>

                <p className="lu-subtitle">Tu camino hacia la maestría continúa.</p>

                <button className="lu-cta-btn" onClick={handleClose}>
                    ¡ÉPICO!
                </button>
            </div>
        </div>
    );
}
