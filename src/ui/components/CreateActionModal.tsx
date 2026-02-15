import { useState } from 'react';
import Twemoji from './Twemoji';
import './ActivityModal.css'; // Reusing styles for consistency

interface CreateActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, type: 'positive' | 'negative', points: number) => void;
}

export default function CreateActionModal({ isOpen, onClose, onSubmit }: CreateActionModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'positive' | 'negative'>('positive');
    const [points, setPoints] = useState(500);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit(name.trim(), type, points);
            setName('');
            setPoints(500);
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Twemoji emoji="🛠️" /> Nueva Actividad</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="activity-form">
                    <div className="form-group">
                        <label htmlFor="name">Nombre de la Actividad</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Venta Cerrada, Reporte, Bug Fix..."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Tipo de Impacto</label>
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn positive ${type === 'positive' ? 'active' : ''}`}
                                onClick={() => setType('positive')}
                            >
                                <Twemoji emoji="⭐" /> Positivo
                            </button>
                            <button
                                type="button"
                                className={`type-btn negative ${type === 'negative' ? 'active' : ''}`}
                                onClick={() => setType('negative')}
                            >
                                <Twemoji emoji="⚠️" /> Negativo
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="points">Valor sugerido (Puntos)</label>
                        <input
                            id="points"
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(parseInt(e.target.value))}
                            placeholder="500"
                            required
                        />
                        <p className="hint">
                            Estos puntos se sumarán cada vez que registres esta actividad.
                        </p>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="primary-btn">Crear Actividad</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
