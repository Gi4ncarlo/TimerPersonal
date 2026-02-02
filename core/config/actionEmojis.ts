export const ACTION_EMOJIS: Record<string, string> = {
    // Positivas
    'Leer': '📚',
    'Correr': '🏃‍♂️',
    'Actividad Física general': '🏋️‍♂️',
    'Trabajar activamente': '💼',
    'Estudiar': '🎓',

    // Negativas
    'Ver Stream': '📺',
    'Jugar videojuegos': '🎮',
    'Ver Videos YT': '▶️',
    'Salir a bailar': '💃',
    'Redes Sociales': '📱',
    'Netflix/Series': '🎬',
    'Procrastinar': '💤',

    // Default
    'default_positive': '✨',
    'default_negative': '⚠️'
};

export function getActionEmoji(actionName: string, type: 'positive' | 'negative'): string {
    // Direct match
    if (ACTION_EMOJIS[actionName]) return ACTION_EMOJIS[actionName];

    // Partial match (e.g. "Leer 10 paginas")
    const found = Object.keys(ACTION_EMOJIS).find(key => actionName.includes(key));
    if (found) return ACTION_EMOJIS[found];

    return type === 'positive' ? ACTION_EMOJIS['default_positive'] : ACTION_EMOJIS['default_negative'];
}
