// Updated mock data with more negative activities
import { Action, DailyRecord, User } from '../core/types';

export const mockUsers: User[] = [
    {
        id: 'user-1',
        username: 'demo',
        preferences: { password: 'demo123' },
        level: 1,
        xp: 0,
    },
];


export const mockActions: Action[] = [
    // Actividades Negativas (más peso negativo)
    {
        id: 'action-1',
        name: 'Ver Stream',
        type: 'negative',
        pointsPerMinute: -8,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-2',
        name: 'Jugar videojuegos',
        type: 'negative',
        pointsPerMinute: -11,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-3',
        name: 'Ver Videos YT',
        type: 'negative',
        pointsPerMinute: -8,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-9',
        name: 'Salir a bailar',
        type: 'negative',
        pointsPerMinute: -10,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-10',
        name: 'Redes Sociales',
        type: 'negative',
        pointsPerMinute: -8,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-11',
        name: 'Netflix/Series',
        type: 'negative',
        pointsPerMinute: -7,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },
    {
        id: 'action-12',
        name: 'Procrastinar',
        type: 'negative',
        pointsPerMinute: -8,
        metadata: {
            inputType: 'hours',
            unit: 'horas',
        },
    },

    // Actividades Positivas
    {
        id: 'action-4',
        name: 'Leer',
        type: 'positive',
        pointsPerMinute: 5,
        metadata: {
            inputType: 'pages',
            unit: 'páginas',
            estimatedMinutesPerPage: 3,
        },
    },
    {
        id: 'action-5',
        name: 'Correr',
        type: 'positive',
        pointsPerMinute: 12,
        metadata: {
            inputType: 'distance-time',
            unit: 'km',
        },
    },
    {
        id: 'action-6',
        name: 'Actividad Física general',
        type: 'positive',
        pointsPerMinute: 9,
        metadata: {
            inputType: 'time',
            unit: 'minutos',
        },
    },
    {
        id: 'action-7',
        name: 'Trabajar activamente',
        type: 'positive',
        pointsPerMinute: 8,
        metadata: {
            inputType: 'time-note',
            unit: 'minutos',
        },
    },
    {
        id: 'action-8',
        name: 'Estudiar',
        type: 'positive',
        pointsPerMinute: 10,
        metadata: {
            inputType: 'time-subject',
            unit: 'minutos',
        },
    },
];

export const mockRecords: DailyRecord[] = [
    {
        id: 'record-1',
        actionId: 'action-4',
        actionName: 'Leer',
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 60,
        pointsCalculated: 300,
        notes: '20 páginas leídas',
    },
    {
        id: 'record-2',
        actionId: 'action-5',
        actionName: 'Correr',
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 30,
        pointsCalculated: 360,
        notes: '5 km',
    },
    {
        id: 'record-3',
        actionId: 'action-1',
        actionName: 'Ver Stream',
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 120,
        pointsCalculated: -960,
        notes: '2 horas',
    },
];

// In-memory storage
let users = [...mockUsers];
let actions = [...mockActions];
let records = [...mockRecords];
let currentUser: User | null = null;

export const MockDataStore = {
    // Authentication
    login: (username: string, password: string): User | null => {
        const user = users.find(
            u => u.username === username && u.preferences.password === password
        );
        if (user) {
            currentUser = user;
        }
        return user || null;
    },

    logout: () => {
        currentUser = null;
    },

    getCurrentUser: () => currentUser,

    // Actions
    getActions: (): Action[] => [...actions],
    getAction: (id: string): Action | undefined => actions.find(a => a.id === id),
    createAction: (action: Omit<Action, 'id'>): Action => {
        const newAction = { ...action, id: `action-${Date.now()}` };
        actions.push(newAction);
        return newAction;
    },
    updateAction: (id: string, updates: Partial<Action>): Action | undefined => {
        const index = actions.findIndex(a => a.id === id);
        if (index === -1) return undefined;
        actions[index] = { ...actions[index], ...updates };
        return actions[index];
    },
    deleteAction: (id: string): boolean => {
        const index = actions.findIndex(a => a.id === id);
        if (index === -1) return false;
        actions.splice(index, 1);
        return true;
    },

    // Records
    getRecords: (): DailyRecord[] => [...records],
    getRecordsByDate: (date: string): DailyRecord[] =>
        records.filter(r => r.date === date),
    getRecordsByDateRange: (startDate: string, endDate: string): DailyRecord[] =>
        records.filter(r => r.date >= startDate && r.date <= endDate),
    createRecord: (record: Omit<DailyRecord, 'id'>): DailyRecord => {
        const newRecord = { ...record, id: `record-${Date.now()}` };
        records.push(newRecord);
        return newRecord;
    },
    deleteRecord: (id: string): boolean => {
        const index = records.findIndex(r => r.id === id);
        if (index === -1) return false;
        records.splice(index, 1);
        return true;
    },

    // Reset for testing
    reset: () => {
        users = [...mockUsers];
        actions = [...mockActions];
        records = [...mockRecords];
        currentUser = null;
    },
};
