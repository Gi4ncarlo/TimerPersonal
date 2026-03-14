'use client';

import React, { useState } from 'react';
import styles from './DopamineAgeSurvey.module.css';
import { useAppStore } from '@/store';
import { DopamineAgeSurvey as SurveyType } from '@/core/types';

export default function DopamineAgeSurvey() {
    const { completeSurvey, isLoadingDopamineAge } = useAppStore();

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState<Partial<SurveyType>>({});

    const totalSteps = 7;

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(prev => prev + 1);
        } else {
            submitSurvey();
        }
    };

    const submitSurvey = async () => {
        // Validación básica cubierta por la UI per-step
        const finalSurvey: SurveyType = {
            realAge: Number(answers.realAge || 25),
            sleepHours: Number(answers.sleepHours || 7),
            screenTimeHours: Number(answers.screenTimeHours || 4),
            exerciseFrequency: Number(answers.exerciseFrequency || 2),
            socialMediaUsage: answers.socialMediaUsage || 'medium',
            dietQuality: answers.dietQuality || 'average',
            stressLevel: answers.stressLevel || 3,
        };
        await completeSurvey(finalSurvey);
    };

    const setAnswerAndNext = (key: keyof SurveyType, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
        setTimeout(handleNext, 300); // Pequeña pausa para ver la selección
    };

    const getProgress = () => ((step - 1) / totalSteps) * 100;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {/* Step 1: Real Age */}
                <div className={`${styles.stepContainer} ${step === 1 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cuántos años tenés?</h2>
                    <input
                        type="number"
                        className={styles.inputField}
                        placeholder="Ej: 27"
                        value={answers.realAge || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, realAge: Number(e.target.value) }))}
                        onKeyDown={(e) => e.key === 'Enter' && answers.realAge && handleNext()}
                        autoFocus
                    />
                    <button
                        className={styles.actionBtn}
                        disabled={!answers.realAge}
                        onClick={handleNext}
                    >
                        Siguiente
                    </button>
                </div>

                {/* Step 2: Sleep */}
                <div className={`${styles.stepContainer} ${step === 2 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cuántas horas dormís por noche promedio?</h2>
                    <input
                        type="number"
                        className={styles.inputField}
                        placeholder="Ej: 7"
                        value={answers.sleepHours || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, sleepHours: Number(e.target.value) }))}
                        onKeyDown={(e) => e.key === 'Enter' && answers.sleepHours && handleNext()}
                    />
                    <button
                        className={styles.actionBtn}
                        disabled={!answers.sleepHours}
                        onClick={handleNext}
                    >
                        Siguiente
                    </button>
                </div>

                {/* Step 3: Screen Time */}
                <div className={`${styles.stepContainer} ${step === 3 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cuántas horas de pantalla recreativa tenés por día?</h2>
                    <input
                        type="number"
                        className={styles.inputField}
                        placeholder="Ej: 4"
                        value={answers.screenTimeHours || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, screenTimeHours: Number(e.target.value) }))}
                        onKeyDown={(e) => e.key === 'Enter' && answers.screenTimeHours && handleNext()}
                    />
                    <button
                        className={styles.actionBtn}
                        disabled={!answers.screenTimeHours}
                        onClick={handleNext}
                    >
                        Siguiente
                    </button>
                </div>

                {/* Step 4: Exercise */}
                <div className={`${styles.stepContainer} ${step === 4 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cuántos días por semana hacés ejercicio?</h2>
                    <input
                        type="number"
                        className={styles.inputField}
                        placeholder="0 - 7"
                        min="0" max="7"
                        value={answers.exerciseFrequency ?? ''}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 0 && val <= 7) setAnswers(prev => ({ ...prev, exerciseFrequency: val }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && answers.exerciseFrequency !== undefined && handleNext()}
                    />
                    <button
                        className={styles.actionBtn}
                        disabled={answers.exerciseFrequency === undefined}
                        onClick={handleNext}
                    >
                        Siguiente
                    </button>
                </div>

                {/* Step 5: Social Media */}
                <div className={`${styles.stepContainer} ${step === 5 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cómo describís tu uso de redes sociales?</h2>
                    <div className={styles.optionsGrid}>
                        <button className={`${styles.optionBtn} ${answers.socialMediaUsage === 'low' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('socialMediaUsage', 'low')}>Bajo</button>
                        <button className={`${styles.optionBtn} ${answers.socialMediaUsage === 'medium' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('socialMediaUsage', 'medium')}>Moderado</button>
                        <button className={`${styles.optionBtn} ${answers.socialMediaUsage === 'high' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('socialMediaUsage', 'high')}>Alto</button>
                        <button className={`${styles.optionBtn} ${answers.socialMediaUsage === 'extreme' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('socialMediaUsage', 'extreme')}>Extremo</button>
                    </div>
                </div>

                {/* Step 6: Diet */}
                <div className={`${styles.stepContainer} ${step === 6 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cómo calificarías tu alimentación?</h2>
                    <div className={styles.optionsGrid}>
                        <button className={`${styles.optionBtn} ${answers.dietQuality === 'poor' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('dietQuality', 'poor')}>Mala</button>
                        <button className={`${styles.optionBtn} ${answers.dietQuality === 'average' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('dietQuality', 'average')}>Regular</button>
                        <button className={`${styles.optionBtn} ${answers.dietQuality === 'good' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('dietQuality', 'good')}>Buena</button>
                        <button className={`${styles.optionBtn} ${answers.dietQuality === 'excellent' ? styles.selected : ''}`} onClick={() => setAnswerAndNext('dietQuality', 'excellent')}>Excelente</button>
                    </div>
                </div>

                {/* Step 7: Stress */}
                <div className={`${styles.stepContainer} ${step === 7 ? styles.activeStep : ''}`}>
                    <h2 className={styles.title}>¿Cuál es tu nivel de estrés habitual?</h2>

                    <div className={styles.rangeContainer}>
                        <input
                            type="range"
                            className={styles.rangeInput}
                            min="1" max="5" step="1"
                            value={answers.stressLevel || 3}
                            onChange={(e) => setAnswers(prev => ({ ...prev, stressLevel: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
                        />
                        <div className={styles.rangeLabels}>
                            <span>Muy bajo</span>
                            <span>Medio</span>
                            <span>Muy alto</span>
                        </div>

                        <div style={{ marginTop: '20px', fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
                            {answers.stressLevel || 3}
                        </div>
                    </div>

                    <button
                        className={styles.actionBtn}
                        onClick={handleNext}
                        disabled={isLoadingDopamineAge}
                        style={{ width: '100%', maxWidth: '300px' }}
                    >
                        {isLoadingDopamineAge ? <span className={styles.loader}></span> : 'Descubrir mi Dopamine Age'}
                    </button>
                </div>

                <div className={styles.progress} style={{ width: `${getProgress()}%` }} />
            </div>
        </div>
    );
}
