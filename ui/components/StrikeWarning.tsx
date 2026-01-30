import React from 'react';
import './StrikeWarning.css';

interface StrikeWarningProps {
    strikeDate: string;
    onDismiss: () => void;
}

export default function StrikeWarning({ strikeDate, onDismiss }: StrikeWarningProps) {
    return (
        <div className="strike-overlay">
            <div className="strike-warning-card">
                <div className="strike-header">
                    <div className="strike-icon">⚠️</div>
                    <h2 className="strike-title">¡HAS RECIBIDO UN STRIKE!</h2>
                </div>

                <div className="strike-content">
                    <p className="strike-message">
                        No registraste ninguna actividad el día <br />
                        <span className="strike-date">{strikeDate}</span>
                    </p>
                    <p className="strike-description">
                        La consistencia es clave. No dejes que vuelva a pasar.
                    </p>
                </div>

                <div className="strike-actions">
                    <button className="strike-dismiss-btn" onClick={onDismiss}>
                        ENTENDIDO, NO VOLVERÁ A PASAR
                    </button>
                </div>
            </div>
        </div>
    );
}
