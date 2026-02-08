import { Action } from '@/core/types';
import './ActivityModal.css';

interface ActivityModalProps {
    action: Action;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { durationMinutes: number; metricValue: number; notes: string }) => void;
}

export default function ActivityModal({ action, isOpen, onClose, onSubmit }: ActivityModalProps) {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let durationMinutes = 0;
        let metricValue = 0;
        let notes = '';

        switch (action.metadata?.inputType) {
            case 'hours':
                const hours = parseFloat(formData.get('hours') as string || '0');
                durationMinutes = hours * 60;
                metricValue = hours;
                notes = `${hours} horas`;
                break;

            case 'pages':
                const pages = parseInt(formData.get('pages') as string || '0');
                durationMinutes = pages * (action.metadata?.estimatedMinutesPerPage || 3);
                metricValue = pages;
                notes = `${pages} páginas`;
                break;

            case 'distance-time':
                const km = parseFloat(formData.get('km') as string || '0');
                const minutes = parseInt(formData.get('minutes') as string || '0');
                durationMinutes = minutes;
                metricValue = km;
                notes = `${km} km en ${minutes} minutos`;
                break;

            case 'time':
                durationMinutes = parseInt(formData.get('minutes') as string || '0');
                metricValue = durationMinutes;
                notes = `${durationMinutes} minutos`;
                break;

            case 'time-note':
                durationMinutes = parseInt(formData.get('minutes') as string || '0');
                metricValue = durationMinutes;
                const task = formData.get('task') as string || '';
                notes = `${durationMinutes} min - ${task}`;
                break;

            case 'time-subject':
                durationMinutes = parseInt(formData.get('minutes') as string || '0');
                metricValue = durationMinutes;
                const subject = formData.get('subject') as string || '';
                notes = `${subject} (${durationMinutes} min)`;
                break;
        }

        onSubmit({ durationMinutes, metricValue, notes });
        onClose();
    };

    const renderInputFields = () => {
        switch (action.metadata?.inputType) {
            case 'hours':
                return (
                    <div className="form-group">
                        <label htmlFor="hours">¿Cuántas horas?</label>
                        <input
                            id="hours"
                            name="hours"
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder="Ej: 0.5"
                            required
                            autoFocus
                        />
                    </div>
                );

            case 'pages':
                return (
                    <div className="form-group">
                        <label htmlFor="pages">¿Cuántas páginas leíste?</label>
                        <input
                            id="pages"
                            name="pages"
                            type="number"
                            min="1"
                            placeholder="Ej: 20"
                            required
                            autoFocus
                        />
                    </div>
                );

            case 'distance-time':
                return (
                    <>
                        <div className="form-group">
                            <label htmlFor="km">Distancia (km)</label>
                            <input
                                id="km"
                                name="km"
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="Ej: 5"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="minutes">Duración (minutos)</label>
                            <input
                                id="minutes"
                                name="minutes"
                                type="number"
                                min="1"
                                placeholder="Ej: 30"
                                required
                            />
                        </div>
                    </>
                );

            case 'time':
                return (
                    <div className="form-group">
                        <label htmlFor="minutes">Duración (minutos)</label>
                        <input
                            id="minutes"
                            name="minutes"
                            type="number"
                            min="1"
                            placeholder="Ej: 45"
                            required
                            autoFocus
                        />
                    </div>
                );

            case 'time-note':
                return (
                    <>
                        <div className="form-group">
                            <label htmlFor="minutes">Duración (minutos)</label>
                            <input
                                id="minutes"
                                name="minutes"
                                type="number"
                                min="1"
                                placeholder="Ej: 120"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task">¿En qué trabajaste?</label>
                            <input
                                id="task"
                                name="task"
                                type="text"
                                placeholder="Ej: Proyecto X, reuniones..."
                                required
                            />
                        </div>
                    </>
                );

            case 'time-subject':
                return (
                    <>
                        <div className="form-group">
                            <label htmlFor="subject">¿Qué estudiaste?</label>
                            <input
                                id="subject"
                                name="subject"
                                type="text"
                                placeholder="Ej: Matemáticas, Historia..."
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="minutes">Duración (minutos)</label>
                            <input
                                id="minutes"
                                name="minutes"
                                type="number"
                                min="1"
                                placeholder="Ej: 60"
                                required
                            />
                        </div>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{action.name}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {renderInputFields()}

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-submit">
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
