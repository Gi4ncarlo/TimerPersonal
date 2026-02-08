import React from 'react';
import './StrikeWarning.css';

interface StrikeWarningProps {
    strikeDates: string[];
    onDismiss: () => void;
}

export default function StrikeWarning({ strikeDates, onDismiss }: StrikeWarningProps) {
    const isMultiple = strikeDates.length > 1;

    return (
        <div className="strike-overlay">
            <div className="strike-warning-card">
                <div className="strike-header">
                    <div className="strike-icon">💀</div>
                    <h2 className="strike-title">
                        {isMultiple ? `¡HAS RECIBIDO ${strikeDates.length} STRIKES!` : '¡HAS RECIBIDO UN STRIKE!'}
                    </h2>
                </div>

                <div className="strike-content">
                    <p className="strike-message">
                        {isMultiple
                            ? 'Has abandonado la senda por múltiples días:'
                            : 'No registraste ninguna actividad el día:'}
                    </p>

                    <div className="strike-dates-list">
                        {strikeDates.map(date => (
                            <span key={date} className="strike-date">{date}</span>
                        ))}
                    </div>

                    <p className="strike-description">
                        La inconsistencia drena tu progreso. Cada falta consecutiva es más costosa.
                    </p>

                    {isMultiple && (
                        <p className="strike-count-info">
                            Penalización escalada aplicada por cada día de ausencia.
                        </p>
                    )}
                </div>

                <div className="strike-actions">
                    <button className="strike-dismiss-btn" onClick={onDismiss}>
                        {isMultiple ? 'ACEPTO LAS CONSECUENCIAS' : 'ENTENDIDO, NO VOLVERÁ A PASAR'}
                    </button>
                </div>
            </div>
        </div>
    );
}
