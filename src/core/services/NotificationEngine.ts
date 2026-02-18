// NotificationEngine - Smart message generation and trigger analysis
// Business Logic layer: "blind" to UI, "agnostic" to data source

import { NotificationType, SarcasmLevel } from '../types';

// ═══════════════════════════════════════════════════
// MESSAGE TEMPLATE POOL
// ═══════════════════════════════════════════════════

interface MessageTemplate {
    title: string;
    messages: {
        low: string[];
        medium: string[];
        brutal: string[];
    };
    icon: string;
}

const MESSAGE_POOL: Record<NotificationType, MessageTemplate> = {
    inactivity: {
        title: '⏰ Inactividad Detectada',
        icon: '⏰',
        messages: {
            low: [
                '¡Hora de registrar algo! Tu día espera. 💪',
                'Todavía no registraste nada hoy. ¡Dale que se puede!',
                'Un pequeño paso hoy = un gran avance mañana. Registrá algo. ✨',
            ],
            medium: [
                'Tus actividades te extrañan... hace rato que no las tocás. 😴',
                'El reloj corre y tus puntos siguen en 0 hoy. ¿Qué onda?',
                'Tus competidores están registrando mientras vos... ¿descansás? 🤔',
            ],
            brutal: [
                'Tus libros te extrañan... y tus puntos negativos te están saludando. 📉',
                'Si la procrastinación fuera deporte, ya serías profesional. Registrá algo. 🏆',
                'Otro día sin hacer nada = otro strike más cerca. ¿Eso es lo que querés? ⚰️',
                'El sofá no da puntos. Levantate y registrá algo, dale. 🛋️',
            ],
        },
    },
    ranking_drop: {
        title: '📊 Cambio en el Ranking',
        icon: '📊',
        messages: {
            low: [
                '{leader} te superó en el ranking. ¡Todavía podés recuperarte!',
                'Hubo cambios en el leaderboard. {leader} subió por encima tuyo.',
                '{leader} está avanzando. ¡No te quedes atrás!',
            ],
            medium: [
                '{leader} te acaba de pasar en el ranking. ¿Vas a quedarte mirando? 👀',
                'Mientras vos no registrás, {leader} sumó {points} puntos. Auch. 😬',
                '{leader} te pasó como si no existieras. ¿Reacción? 🤨',
            ],
            brutal: [
                '¿Viste a {leader}? Estudió {hours}h hoy. Vos seguís en 0. ¿Vas a dejar que te humille así? 💀',
                '{leader} te pasó en el ranking con {points} puntos. Tu dignidad está en juego. 🪦',
                'Breaking News: {leader} te destruyó en el ranking. Tus excusas no suman puntos. 📰',
                '{leader} manda. Vos... bueno, vos estás leyendo esta notificación. 😶',
            ],
        },
    },
    streak_danger: {
        title: '🔥 Racha en Peligro',
        icon: '🔥',
        messages: {
            low: [
                'Tu racha de {streak} días necesita una actividad hoy. ¡No la pierdas!',
                'Llevás {streak} días seguidos. ¡Registrá algo para mantener el ritmo!',
                'Tu racha de {streak} días depende de lo que hagas hoy. 💪',
            ],
            medium: [
                '¡Alerta! Tu racha de {streak} días se apaga a medianoche si no hacés algo. ⚠️',
                '{streak} días de esfuerzo... ¿los vas a tirar por no registrar HOY? 😤',
                'Tu racha de {streak} días necesita respiración artificial. Actuá ya. 🏥',
            ],
            brutal: [
                '¡Tu racha de {streak} días está en terapia intensiva! Registrá algo ahora o RIP. ⚰️',
                '{streak} días construyendo algo... y hoy lo vas a dejar morir como si nada. Mirá qué fácil destruís cosas. 🔥',
                'Tu racha de {streak} días fuma su último cigarrillo. Tenés hasta medianoche. 🚬',
            ],
        },
    },
    weekly_decline: {
        title: '📉 Rendimiento Semanal',
        icon: '📉',
        messages: {
            low: [
                'Tu rendimiento bajó un {percent}% esta semana. ¡Todavía hay tiempo para mejorar!',
                'Esta semana viene más floja que la anterior. ¡Podés revertirlo!',
                'Vas por debajo de tu promedio. ¡Un empujón más y lo igualás!',
            ],
            medium: [
                'Rendís un {percent}% menos que la semana pasada. ¿Semana difícil o pura fiaca? 🤷',
                'El "yo del lunes" estaría decepcionado con estos números. Dale, reaccioná. 😒',
                'Tu versión de la semana pasada te ganaría fácil. ¿Vas a permitirlo? 💢',
            ],
            brutal: [
                'Rendís un {percent}% menos que la semana pasada. ¿Te rendiste o qué? 🤨',
                'Si esto fuera un partido, te estarían goleando contra vos mismo. Reaccioná. ⚽',
                'Tu promedio semanal llora en un rincón. Lo estás haciendo un {percent}% peor. Felicidades (?) 🎊',
            ],
        },
    },
    streak_milestone: {
        title: '🏆 Hito de Racha',
        icon: '🏆',
        messages: {
            low: [
                '¡Increíble! Llevás {streak} días seguidos registrando actividad. ¡Seguí así!',
                '¡{streak} días de racha! Tu constancia es admirable. 🌟',
            ],
            medium: [
                '¡{streak} días sin parar! Sos una máquina. Tus competidores tiemblan. 💪',
                'Racha de {streak} días. Algunos lo llaman disciplina, otros locura. Vos lo llamás martes. 😎',
            ],
            brutal: [
                '¡{streak} días de racha! Hasta tus enemigos te respetan. Mentira, te odian. Seguí así. 😈',
                '{streak} días. A esta altura ya sos más consistente que el WiFi del país. Leyenda. 🇦🇷',
            ],
        },
    },
    comeback: {
        title: '🔄 Regreso Detectado',
        icon: '🔄',
        messages: {
            low: [
                '¡Bienvenido de vuelta! Hace {days} días que no te veíamos. ¡A recuperar terreno!',
                'Volviste después de {days} días. ¡El primer paso es el más importante!',
            ],
            medium: [
                '¡Mirá quién volvió! {days} días desaparecido pero acá estás. A laburar. 🫡',
                '¿{days} días sin registrar? No pasa nada... mentira, sí pasa. Pero te perdonamos. Ahora a meterle. 😤',
            ],
            brutal: [
                '¡El hijo pródigo regresa después de {days} días! Tus puntos están en terapia. 🏥',
                '{days} días ausente. Pensábamos que habías abandonado la vida productiva. Bienvenido al sufrimiento. 💀',
                'Ah, ¿te acordaste de que existías? {days} días y contando. Tus rivales te mandan saludos desde arriba del ranking. 👋',
            ],
        },
    },
};

// ═══════════════════════════════════════════════════
// USER SEGMENTS
// ═══════════════════════════════════════════════════

export type UserSegment = 'productive' | 'idle' | 'inactive';

// ═══════════════════════════════════════════════════
// NOTIFICATION ENGINE
// ═══════════════════════════════════════════════════

export interface NotificationContext {
    leader?: string;
    hours?: number;
    points?: number;
    streak?: number;
    percent?: number;
    days?: number;
    username?: string;
    [key: string]: any;
}

export interface TriggerResult {
    type: NotificationType;
    title: string;
    message: string;
    context: NotificationContext;
}

export class NotificationEngine {
    /**
     * Generates a dynamic message based on type, context variables, and sarcasm level.
     * This is the core "template engine".
     */
    static getSmartMessage(
        type: NotificationType,
        context: NotificationContext,
        sarcasmLevel: SarcasmLevel = 'medium'
    ): { title: string; message: string } {
        const template = MESSAGE_POOL[type];
        if (!template) {
            return { title: 'Notificación', message: 'Tenés una nueva notificación.' };
        }

        const pool = template.messages[sarcasmLevel];
        const rawMessage = pool[Math.floor(Math.random() * pool.length)];

        // Replace template variables with actual context values
        const message = rawMessage.replace(/\{(\w+)\}/g, (_, key) => {
            const value = context[key];
            return value !== undefined ? String(value) : `{${key}}`;
        });

        return { title: template.title, message };
    }

    /**
     * Classifies user into a segment based on their weekly performance vs average.
     */
    static classifyUser(
        thisWeekPoints: number,
        avgWeeklyPoints: number
    ): UserSegment {
        if (avgWeeklyPoints <= 0) return 'inactive';
        const ratio = thisWeekPoints / avgWeeklyPoints;
        if (ratio >= 0.8) return 'productive';
        if (ratio >= 0.3) return 'idle';
        return 'inactive';
    }

    /**
     * Analyzes current stats and generates notification triggers.
     * This is a pure function: takes data in, returns triggers out.
     * The caller is responsible for persisting and displaying them.
     */
    static analyzeAndTrigger(params: {
        username: string;
        todayRecordsCount: number;
        daysSinceLastActivity: number;
        currentStreak: number;
        streakMilestones?: number[];
        thisWeekPoints: number;
        lastWeekPoints: number;
        weeklyAvgPoints: number;
        leaderAbove?: { username: string; points: number; hours: number } | null;
        sarcasmLevel: SarcasmLevel;
    }): TriggerResult[] {
        const triggers: TriggerResult[] = [];
        const {
            username, todayRecordsCount, daysSinceLastActivity,
            currentStreak, streakMilestones = [7, 14, 30, 60, 100],
            thisWeekPoints, lastWeekPoints, weeklyAvgPoints,
            leaderAbove, sarcasmLevel
        } = params;

        // 1. COMEBACK — User returned after multiple days of inactivity
        if (daysSinceLastActivity >= 2 && todayRecordsCount > 0) {
            const ctx: NotificationContext = { days: daysSinceLastActivity, username };
            const msg = this.getSmartMessage('comeback', ctx, sarcasmLevel);
            triggers.push({ type: 'comeback', ...msg, context: ctx });
        }

        // 2. INACTIVITY — No records today
        if (todayRecordsCount === 0 && daysSinceLastActivity >= 0) {
            const ctx: NotificationContext = { username };
            const msg = this.getSmartMessage('inactivity', ctx, sarcasmLevel);
            triggers.push({ type: 'inactivity', ...msg, context: ctx });
        }

        // 3. STREAK DANGER — Has a streak but no activity today
        if (currentStreak >= 3 && todayRecordsCount === 0) {
            const ctx: NotificationContext = { streak: currentStreak, username };
            const msg = this.getSmartMessage('streak_danger', ctx, sarcasmLevel);
            triggers.push({ type: 'streak_danger', ...msg, context: ctx });
        }

        // 4. STREAK MILESTONE — Reached a milestone
        if (streakMilestones.includes(currentStreak) && todayRecordsCount > 0) {
            const ctx: NotificationContext = { streak: currentStreak, username };
            const msg = this.getSmartMessage('streak_milestone', ctx, sarcasmLevel);
            triggers.push({ type: 'streak_milestone', ...msg, context: ctx });
        }

        // 5. WEEKLY DECLINE — Performing significantly worse than last week
        if (lastWeekPoints > 0) {
            const percentDecline = Math.round(((lastWeekPoints - thisWeekPoints) / lastWeekPoints) * 100);
            if (percentDecline >= 30) {
                const ctx: NotificationContext = { percent: percentDecline, username };
                const msg = this.getSmartMessage('weekly_decline', ctx, sarcasmLevel);
                triggers.push({ type: 'weekly_decline', ...msg, context: ctx });
            }
        }

        // 6. RANKING DROP — Someone above you
        if (leaderAbove) {
            const ctx: NotificationContext = {
                leader: leaderAbove.username,
                points: Math.floor(leaderAbove.points),
                hours: Math.round(leaderAbove.hours * 10) / 10,
                username,
            };
            const msg = this.getSmartMessage('ranking_drop', ctx, sarcasmLevel);
            triggers.push({ type: 'ranking_drop', ...msg, context: ctx });
        }

        return triggers;
    }

    /**
     * Returns the icon for a notification type
     */
    static getNotificationIcon(type: NotificationType): string {
        return MESSAGE_POOL[type]?.icon || '🔔';
    }

    /**
     * Anti-spam: filter triggers to avoid sending too many notifications.
     * Rules:
     * 1. Global Daily Limit: Max 2 notifications per day.
     * 2. Global Cooldown: Minimum 6 hours between ANY notification.
     * 3. Per-Type Cooldown: Minimum 6 hours between notifications of the same type.
     */
    static deduplicateTriggers(
        newTriggers: TriggerResult[],
        existingNotifications: { type: string; createdAt: string }[],
        config: {
            perTypeCooldownHours: number;
            globalCooldownHours: number;
            maxPerDay: number;
        } = {
                perTypeCooldownHours: 6,
                globalCooldownHours: 6,
                maxPerDay: 2
            }
    ): TriggerResult[] {
        const now = Date.now();
        const todayStr = new Date().toDateString(); // "Mon Feb 18 2026"

        // 1. Check Daily Limit
        const todayNotifications = existingNotifications.filter(n =>
            new Date(n.createdAt).toDateString() === todayStr
        );

        if (todayNotifications.length >= config.maxPerDay) {
            console.log('NotificationEngine: Daily limit reached.');
            return [];
        }

        // 2. Check Global Cooldown (time since ANY last notification)
        if (existingNotifications.length > 0) {
            // existingNotifications is ordered desc by DB, but safe to trust 0 index or sort
            const latest = existingNotifications[0];
            const diffHours = (now - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60);

            if (diffHours < config.globalCooldownHours) {
                console.log(`NotificationEngine: Global cooldown active. Last notification was ${diffHours.toFixed(1)}h ago.`);
                return [];
            }
        }

        const typeCooldownMs = config.perTypeCooldownHours * 60 * 60 * 1000;

        return newTriggers.filter(trigger => {
            const recent = existingNotifications.find(n =>
                n.type === trigger.type &&
                (now - new Date(n.createdAt).getTime()) < typeCooldownMs
            );
            return !recent;
        });
    }
}
