import { DopamineAge, DopamineAgeSurvey, DailyRecord, Balance, Strike } from './types';

export function calculateDopamineAge(params: {
    survey: DopamineAgeSurvey;
    recentRecords: DailyRecord[];
    currentBalance: Balance;
    activeStrikes: Strike[];
    currentStreak: number;
}) {
    const { survey, recentRecords, currentBalance, activeStrikes, currentStreak } = params;

    // Empezamos en la base de "Adultez Joven"
    let computedAge = 18;

    // --- FACTORES DE MADUREZ (ENCUESTA) ---
    // Disciplina de Sueño
    if (survey.sleepHours >= 7 && survey.sleepHours <= 9) computedAge += 4; // Madurez ejecutiva
    else if (survey.sleepHours < 6) computedAge -= 3; // Impulsividad por falta de sueño

    // Control de Pantallas (Inversamente proporcional a la madurez)
    if (survey.screenTimeHours <= 2) computedAge += 5; // Alta disciplina mental
    else if (survey.screenTimeHours >= 6) computedAge -= 6; // Cerebro "frito" por dopamina barata

    // Redes Sociales (El veneno de la madurez)
    if (survey.socialMediaUsage === 'low') computedAge += 4;
    else if (survey.socialMediaUsage === 'extreme') computedAge -= 7;

    // Autocuidado (Ejercicio)
    if (survey.exerciseFrequency >= 4) computedAge += 3;
    else if (survey.exerciseFrequency <= 1) computedAge -= 2;

    // Manejo de Estrés (Resiliencia)
    if (survey.stressLevel <= 2) computedAge += 3;
    else if (survey.stressLevel >= 4) computedAge -= 2;

    // --- FACTORES DE LA APP (VALORACIÓN DE SENDA) ---
    const positiveCount = recentRecords.filter(r => r.pointsCalculated > 0).length;
    const negativeCount = recentRecords.filter(r => r.pointsCalculated < 0).length;

    // Recompensamos el trabajo constante
    computedAge += Math.floor(positiveCount / 10) * 1;
    // Penalizamos las debilidades
    computedAge -= Math.floor(negativeCount / 5) * 1;

    // Racha actual (Strike)
    if (currentStreak >= 21) computedAge += 6; // Nivel de disciplina 'Monje'
    else if (currentStreak >= 7) computedAge += 2;

    // Penalización por strikes activos
    computedAge -= Math.min(activeStrikes.length, 5) * 2;

    // --- LIMITES Y RANKING ---
    // Rango definido por el usuario: 10 (Inmaduro total) a 45 (Master de Disciplina)
    computedAge = Math.max(10, Math.min(45, computedAge));

    // El delta aquí es simplemente cosmético para los mensajes
    const delta = computedAge - 20; // 20 es el punto de "normalidad"

    let status: DopamineAge['status'] = 'good';
    if (computedAge >= 35) status = 'optimal'; // Máxima madurez
    else if (computedAge >= 25 && computedAge < 35) status = 'good'; // Responsable
    else if (computedAge >= 18 && computedAge < 25) status = 'warning'; // En transición / Inestable
    else if (computedAge < 18) status = 'critical'; // Infante digital / Impulsivo

    return {
        userId: '',
        realAge: survey.realAge,
        dopamineAge: computedAge,
        delta,
        status,
        lastCalculatedAt: new Date().toISOString(),
        surveyCompleted: true,
        surveyAnswers: survey
    };
}
