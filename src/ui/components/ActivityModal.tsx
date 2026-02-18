import { Action, Goal } from '@/core/types';
import './ActivityModal.css';

interface ActivityModalProps {
    action: Action;
    goals?: Goal[]; // NEW: Pass goals to allow milestone selection
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { durationMinutes: number; metricValue: number; notes: string; targetGoalId?: string }) => void;
}

export default function ActivityModal({ action, goals = [], isOpen, onClose, onSubmit }: ActivityModalProps) {
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

            case 'impact':
                // If the field is hidden/fixed, it might still submit value="1" via hidden input,
                // or if handled via state. Here we trust the formData.
                // If the user didn't input anything (because input was hidden and no default?), 
                // we should fallback to 1 if it's the mission-linked type.
                const impactInput = formData.get('impact');
                if (impactInput) {
                    metricValue = parseFloat(impactInput as string);
                } else if (action.pointsPerMinute === 0 && action.type === 'positive') {
                    metricValue = 1;
                } else {
                    metricValue = 0;
                }

                durationMinutes = 0;
                notes = formData.get('notes') as string || (action.pointsPerMinute === 0 ? 'Actividad registrada' : 'Hito alcanzado');
                break;

            case 'milestone':
                const goalId = formData.get('milestoneId') as string;
                const goal = goals.find(g => g.id === goalId);
                metricValue = goal ? goal.targetValue : 1; // Complete it
                durationMinutes = 0;
                notes = `Hito Completado: ${goal ? goal.title : 'Desconocido'}`;
                onSubmit({ durationMinutes, metricValue, notes, targetGoalId: goalId });
                onClose();
                return; // Early return because we call onSubmit with targetGoalId
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

            case 'impact':
                // Check if it's a mission-linked activity (0 base points, positive type)
                // In this case, we only want a comment, and default impact to 1.
                if (action.pointsPerMinute === 0 && action.type === 'positive') {
                    return (
                        <div className="form-group">
                            <label htmlFor="notes">¿Qué lograste? (Opcional)</label>
                            <input
                                id="notes"
                                name="notes"
                                type="text"
                                placeholder="Ej: Venta #1, Capítulo 5..."
                                autoFocus
                            />
                            <input type="hidden" name="impact" value="1" />
                            <p className="impact-hint">✨ Se registrará 1 unidad. Los puntos se sumarán al completar la misión.</p>
                        </div>
                    );
                }

                return (
                    <>
                        <div className="form-group">
                            <label htmlFor="impact">Puntos de Impacto</label>
                            <input
                                id="impact"
                                name="impact"
                                type="number"
                                min="1"
                                placeholder="Ej: 1000"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="notes">¿Qué lograste?</label>
                            <input
                                id="notes"
                                name="notes"
                                type="text"
                                placeholder="Ej: Compré la camioneta, Vendí 10 productos..."
                                required
                            />
                        </div>
                    </>
                );

            case 'milestone':
                const milestoneGoals = goals.filter(g => g.isMilestone && !g.isCompleted);
                return (
                    <div className="form-group">
                        <label htmlFor="milestoneId">¿Qué Hito completaste?</label>
                        {milestoneGoals.length > 0 ? (
                            <select id="milestoneId" name="milestoneId" required autoFocus>
                                <option value="">Selecciona un hito...</option>
                                {milestoneGoals.map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="no-goals-message">No tienes hitos activos para completar.</div>
                        )}
                        <p className="impact-hint">✨ Este logro te sumará 20,000 puntos automáticamente.</p>
                    </div>
                );

            default:
                // Check if it's a count-based goal/action (like "ventas")
                const isCountBased = action.metadata?.unit === 'actividad' ||
                    action.metadata?.unit === 'unidad' ||
                    (action.metadata as any)?.metricType === 'activities';

                if (isCountBased) {
                    return (
                        <div className="form-group">
                            <label htmlFor="metric">Cantidad (Unidades)</label>
                            <input
                                id="metric"
                                name="metric"
                                type="number"
                                defaultValue="1"
                                min="1"
                                required
                                autoFocus
                            />
                        </div>
                    );
                }

                return (
                    <div className="form-group">
                        <label htmlFor="minutes">Duración (minutos)</label>
                        <input
                            id="minutes"
                            name="minutes"
                            type="number"
                            min="1"
                            placeholder="Ej: 30"
                            required
                            autoFocus
                        />
                    </div>
                );
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
