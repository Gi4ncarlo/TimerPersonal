'use client';

import React, { useRef, useState, useEffect } from 'react';
import styles from './DopamineAgeCard.module.css';
import { useAppStore } from '@/store';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function DopamineAgeCard() {
    const { dopamineAge } = useAppStore();
    const captureRef = useRef<HTMLDivElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [message, setMessage] = useState('');

    // Seteo del color base
    const colorMap = {
        optimal: '#00ff88',
        good: '#4488ff',
        warning: '#ff8800',
        critical: '#ff2244'
    };

    // Logica de mensajes locos randómicos al montar la card
    useEffect(() => {
        if (!dopamineAge) return;

        const delta = dopamineAge.delta;
        let msgList: string[] = [];

        if (delta >= 15) {
            msgList = [
                "Tu cerebro opera como el de un adicto en crisis. La dopamina ya no trabaja para vos.",
                "Cada mal hábito es una deuda que tu mente paga con años.",
                "Tu sistema de recompensa está en colapso. Es hora de parar."
            ];
        } else if (delta >= 10 && delta <= 14) {
            msgList = [
                "Estás envejeciendo tu mente a velocidad acelerada.",
                "Los números no mienten. Tus hábitos están destruyendo tu neurología.",
                "Hay daño, pero todavía estás a tiempo de revertirlo."
            ];
        } else if (delta >= 1 && delta <= 9) {
            msgList = [
                "Tu sistema de recompensa está bajo presión. En el límite.",
                "No estás mal. Pero tampoco estás bien. Elegí un lado.",
                "Tus hábitos te están costando años de función cerebral."
            ];
        } else if (delta <= 0 && delta >= -4) {
            msgList = [
                "Tu cerebro está en forma. Mantené el ritmo.",
                "Vas por buen camino. No bajes la guardia.",
                "Tu dopamina trabaja a tu favor. Seguí así."
            ];
        } else {
            msgList = [
                "Tu dopamina opera a nivel élite. Sos una anomalía positiva.",
                "Mientras otros destruyen su cerebro, vos lo estás construyendo.",
                "Nivel de disciplina que el 95% no puede sostener."
            ];
        }

        setMessage(msgList[Math.floor(Math.random() * msgList.length)]);
    }, [dopamineAge]);

    if (!dopamineAge) return null;

    const statusColor = colorMap[dopamineAge.status];
    const deltaText = dopamineAge.delta > 0
        ? `+${dopamineAge.delta} años sobre tu edad real`
        : dopamineAge.delta === 0
            ? `Igual a tu edad real`
            : `${Math.abs(dopamineAge.delta)} años menos que tu edad real (óptimo)`;

    const handleShare = async () => {
        if (!captureRef.current) return;
        try {
            setIsCapturing(true);

            const canvas = await html2canvas(captureRef.current, {
                backgroundColor: '#0a0a0a',
                scale: 2,
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `dopamine-age-${dopamineAge.dopamineAge}.png`;
            link.href = imgData;
            link.click();

            toast.success('¡Imagen lista para compartir!', {
                description: 'Se descargó en tu dispositivo para que la subas a redes sociales.'
            });

        } catch (error) {
            console.error('Error al capturar imagen:', error);
            toast.error('Error al generar la imagen', { description: 'Reintentá en un momento.' });
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h3 className={styles.title}>🧠 DOPAMINE AGE</h3>
                    <span
                        className={styles.badge}
                        style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
                    >
                        {dopamineAge.status}
                    </span>
                </div>

                <div className={styles.realAge}>Tu edad: {dopamineAge.realAge}</div>

                <div className={styles.numberBox} style={{ borderColor: `${statusColor}44`, color: statusColor }}>
                    <h1 className={styles.ageNumber}>{dopamineAge.dopamineAge}</h1>
                </div>

                <div className={styles.delta} style={{ color: dopamineAge.delta > 0 ? '#ff4444' : '#00ff88' }}>
                    {deltaText}
                </div>

                <div className={styles.message}>
                    "{message}"
                </div>

                <button
                    className={styles.shareBtn}
                    onClick={handleShare}
                    disabled={isCapturing}
                >
                    {isCapturing ? 'Generando...' : '📸 Compartir mi resultado'}
                </button>
            </div>

            {/* Contenedor Oculto para Screenshot HD */}
            <div ref={captureRef} className={styles.captureContainer}>
                <div className={styles.captureTitle}>🧠 DOPAMINE AGE</div>
                <div className={styles.captureSubtitle}>Mi resultado:</div>

                <div className={styles.captureNumber} style={{ color: statusColor, textShadow: `0 0 40px ${statusColor}66` }}>
                    {dopamineAge.dopamineAge}
                </div>

                <div className={styles.captureDivider}></div>
                <div className={styles.realAge} style={{ fontSize: '1.5rem', marginBottom: '30px' }}>
                    edad real: {dopamineAge.realAge}
                </div>

                <div className={styles.captureDelta} style={{ color: dopamineAge.delta > 0 ? '#ff4444' : '#00ff88' }}>
                    {deltaText}
                </div>

                <div className={styles.captureMessage}>
                    "{message}"
                </div>

                <div className={styles.captureFooter}>
                    ¿Qué tan destruido está el tuyo?<br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '5px', display: 'block' }}>
                        TimeTracker App  •  Mide tu Dopamina
                    </span>
                </div>
            </div>
        </>
    );
}
