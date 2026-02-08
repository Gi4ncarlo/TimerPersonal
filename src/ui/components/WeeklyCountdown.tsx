'use client';

import { useState, useEffect } from 'react';
import { getTimeRemainingInWeek } from '@/core/utils/dateUtils';

export default function WeeklyCountdown() {
    const [timeLeft, setTimeLeft] = useState(getTimeRemainingInWeek());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeRemainingInWeek());
        }, 60000); // Actualiza cada minuto

        return () => clearInterval(timer);
    }, []);

    const { days, hours, minutes, totalMs } = timeLeft;

    // Calcular porcentaje de la semana transcurrido
    // Una semana tiene 7 * 24 * 60 * 60 * 1000 ms = 604,800,000 ms
    const totalWeekMs = 604800000;
    const elapsedPercent = Math.min(100, Math.max(0, ((totalWeekMs - totalMs) / totalWeekMs) * 100));

    // Mensajes dinámicos según el tiempo restante
    const getMotivationalMessage = () => {
        if (totalMs <= 0) return "Cierre de semana. Revisa tus resultados.";
        if (days >= 4) return "La semana recién comienza. ¡Establece tu ritmo!";
        if (days >= 2) return "¡Vas por buen camino! Sigue enfocado en tus metas.";
        if (days >= 1) return "Último tramo de la semana. ¡Asegura esos objetivos!";
        return "¡Quedan pocas horas! Es el momento de dar el máximo.";
    };

    if (totalMs <= 0) {
        return (
            <div className="weekly-countdown-premium expired">
                <span className="countdown-message">La semana ha finalizado</span>
            </div>
        );
    }

    return (
        <div className="weekly-countdown-premium">
            <div className="countdown-header">
                <span className="countdown-title">TIEMPO RESTANTE</span>
                <span className="countdown-message">{getMotivationalMessage()}</span>
            </div>

            <div className="countdown-display">
                <div className="countdown-unit">
                    <span className="unit-value">{days}</span>
                    <span className="unit-label">días</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-unit">
                    <span className="unit-value">{hours}</span>
                    <span className="unit-label">horas</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-unit">
                    <span className="unit-value">{minutes}</span>
                    <span className="unit-label">min</span>
                </div>
            </div>

            <div className="week-progress-container">
                <div className="week-progress-bar-bg">
                    <div
                        className="week-progress-bar"
                        style={{ width: `${elapsedPercent}%` }}
                    ></div>
                </div>
                <div className="week-progress-labels">
                    <span>LUN</span>
                    <span>DOM</span>
                </div>
            </div>
        </div>
    );
}
