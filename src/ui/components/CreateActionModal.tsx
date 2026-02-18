import { useState } from 'react';
import Twemoji from './Twemoji';
import './CreateActionModal.css';
import { Goal } from '@/core/types';

interface CreateActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, type: 'positive' | 'negative', points: number, metadata?: any, targetGoalId?: string) => void;
    goals?: Goal[];
}

export default function CreateActionModal({ isOpen, onClose, onSubmit, goals = [] }: CreateActionModalProps) {
    const [name, setName] = useState('');
    const [inputType, setInputType] = useState<'impact' | 'hours' | 'pages' | 'distance-time' | 'time'>('impact');
    const [unit, setUnit] = useState('veces');
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && selectedGoalId) {
            // Activities linked to missions are always positive and award 0 base points 
            // because the reward comes from mission completion.
            onSubmit(name.trim(), 'positive', 0, { inputType, unit }, selectedGoalId);
            setName('');
            setInputType('impact');
            setUnit('veces');
            setSelectedGoalId('');
            onClose();
        }
    };

    const isFormValid = name.trim() !== '' && selectedGoalId !== '';

    return (
        <div className="create-action-modal-overlay" onClick={onClose}>
            <div className="create-action-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header-arcade">
                    <h2><Twemoji emoji="🛠️" /> NUEVA ACTIVIDAD</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="premium-form">
                    <div className="form-field">
                        <label htmlFor="name">NOMBRE DE LA ACTIVIDAD</label>
                        <input
                            id="name"
                            className="premium-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Cerrar Venta, Lectura Profunda..."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="targetGoal">VINCULAR A MISIÓN (OBLIGATORIO)</label>
                        <select
                            id="targetGoal"
                            value={selectedGoalId}
                            onChange={(e) => setSelectedGoalId(e.target.value)}
                            className="premium-select"
                            required
                        >
                            <option value="">-- Seleccionar Misión --</option>
                            {goals.filter(g => !g.isCompleted).map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.period === 'milestone' ? '🏆' : '🎯'} {g.title} ({g.period})
                                </option>
                            ))}
                        </select>
                        {!selectedGoalId && <p className="hint-text">Esta actividad sumará progreso a la misión seleccionada.</p>}
                    </div>

                    <div className="form-grid-2">
                        <div className="form-field">
                            <label htmlFor="inputType">MÉTRICA</label>
                            <select
                                id="inputType"
                                value={inputType}
                                onChange={(e) => setInputType(e.target.value as any)}
                                className="premium-select"
                            >
                                <option value="impact">Cantidades</option>
                                <option value="time">Minutos</option>
                                <option value="hours">Horas</option>
                                <option value="pages">Páginas</option>
                                <option value="distance-time">Deporte</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="unit">UNIDAD</label>
                            <input
                                id="unit"
                                className="premium-input"
                                type="text"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="veces, km, etc"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-premium-secondary" onClick={onClose}>CANCELAR</button>
                        <button
                            type="submit"
                            className="btn-premium-primary"
                            disabled={!isFormValid}
                        >
                            CREAR ACTIVIDAD
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
