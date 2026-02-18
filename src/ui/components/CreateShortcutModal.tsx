import { useState } from 'react';
import { Action } from '@/core/types';
import Twemoji from './Twemoji';
import './CreateShortcutModal.css';

interface CreateShortcutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (label: string, actionId: string, duration: number, note: string) => void;
    actions: Action[];
}

export default function CreateShortcutModal({ isOpen, onClose, onSave, actions }: CreateShortcutModalProps) {
    const [label, setLabel] = useState('');
    const [selectedActionId, setSelectedActionId] = useState('');
    const [duration, setDuration] = useState(60);
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (label && selectedActionId) {
            onSave(label, selectedActionId, duration, note);
            // Reset form
            setLabel('');
            setSelectedActionId('');
            setDuration(60);
            setNote('');
            onClose();
        }
    };

    const selectedAction = actions.find(a => a.id === selectedActionId);

    return (
        <div className="shortcut-modal-overlay" onClick={onClose}>
            <div className="shortcut-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header-shortcut">
                    <h2><Twemoji emoji="⚡" /> NUEVO ATAJO</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="shortcut-form">
                    <div className="form-group">
                        <label htmlFor="label">Nombre del Botón</label>
                        <input
                            id="label"
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="shortcut-input"
                            placeholder="Ej: Gym 1h, Leer Mañana..."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="action">Actividad Base</label>
                        <select
                            id="action"
                            value={selectedActionId}
                            onChange={(e) => setSelectedActionId(e.target.value)}
                            className="shortcut-select"
                            required
                        >
                            <option value="">-- Seleccionar Actividad --</option>
                            {actions.map(action => (
                                <option key={action.id} value={action.id}>
                                    {action.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedAction && (
                        <>
                            <div className="form-group">
                                <label htmlFor="duration">Duración (minutos)</label>
                                <input
                                    id="duration"
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="shortcut-input"
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="note">Comentario por defecto</label>
                                <input
                                    id="note"
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="shortcut-input"
                                    placeholder="Ej: Rutina A, Capítulo del día..."
                                />
                            </div>
                        </>
                    )}

                    <div className="shortcut-actions">
                        <button type="button" className="btn-shortcut-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-shortcut-save"
                            disabled={!label || !selectedActionId}
                        >
                            Crear Atajo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
