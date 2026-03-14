import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isBefore, startOfDay } from 'date-fns';
import { calculateDopamineAge } from '@/core/DopamineAgeEngine';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { DopamineAge, DopamineAgeSurvey, Balance, Strike, DailyRecord } from '@/core/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const authClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await authClient.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const db = authClient; // Use the authenticated client for DB ops to respect RLS

        // Fetch User's DopamineAge Record
        const { data: daRecord, error: daError } = await db
            .from('dopamine_age')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(); // maybeSingle is safer for no rows

        if (daError) {
            console.error('Error fetching dopamine age:', daError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!daRecord) {
            // Usuario no ha completado la encuesta, no tiene edad de dopamina
            return NextResponse.json({ dopamineAge: null });
        }

        const lastCalculatedAt = new Date(daRecord.last_calculated_at);
        const today = startOfDay(new Date());

        // Si lastCalculatedAt es de un dia anterior, recalculamos
        if (isBefore(lastCalculatedAt, today)) {
            // Fetch necessary data for recalculation

            // 1. Current Balance (assuming daily for this context, or sum of month)
            // Lógica similar al WeeklySummaryEngine, asumimos que totalPoints globales o balance es lo que requiere
            // 1. Current Balance
            const { data: userData } = await db
                .from('users')
                .select('xp, total_points')
                .eq('id', userId)
                .single();

            const currentBalance: Balance = {
                periodType: 'daily',
                periodStart: new Date().toISOString(),
                periodEnd: new Date().toISOString(),
                totalPoints: userData?.total_points || userData?.xp || 0,
                timeGainedMinutes: 0
            };

            // 2. Active Strikes
            const { data: strikesData } = await db
                .from('strikes')
                .select('*')
                .eq('user_id', userId);

            const strikes: Strike[] = (strikesData || []).map(s => ({
                id: s.id,
                userId: s.user_id,
                strikeDate: s.strike_date,
                reason: s.reason,
                detectedAt: s.detected_at,
                pointsBefore: Number(s.points_before),
                pointsDeducted: Number(s.points_deducted),
                balanceAfter: Number(s.balance_after)
            }));

            // 3. Current Streak (Calculate from strikes using engine)
            const stats = StrikeDetector.calculateStats(strikes);
            const currentStreak = stats.currentStreak;

            // 4. Recent Records (30 días)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: recentRecords } = await db
                .from('daily_records')
                .select('*')
                .eq('user_id', userId)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            // Mapeo seguro a la interfaz
            const mappedRecords: DailyRecord[] = (recentRecords || []).map(r => ({
                id: r.id,
                actionId: r.action_id,
                actionName: r.action_name,
                date: r.date,
                durationMinutes: r.duration_minutes,
                pointsCalculated: r.points_calculated,
                targetGoalId: r.target_goal_id,
                notes: r.notes
            }));

            // Calculate
            const surveyAnswers: DopamineAgeSurvey = daRecord.survey_answers;
            const newAge = calculateDopamineAge({
                survey: surveyAnswers,
                recentRecords: mappedRecords,
                currentBalance,
                activeStrikes: strikes || [],
                currentStreak
            });

            newAge.userId = userId;

            // Update in DB
            const { data: updatedRecord, error: updateError } = await db
                .from('dopamine_age')
                .update({
                    dopamine_age: newAge.dopamineAge,
                    delta: newAge.delta,
                    status: newAge.status,
                    last_calculated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                console.error('Error updating dopamine age:', updateError);
                return NextResponse.json({ error: 'Error recalcula dopamina' }, { status: 500 });
            }

            return NextResponse.json({
                dopamineAge: {
                    userId: updatedRecord.user_id,
                    realAge: updatedRecord.real_age,
                    dopamineAge: updatedRecord.dopamine_age,
                    delta: updatedRecord.delta,
                    status: updatedRecord.status as DopamineAge['status'],
                    lastCalculatedAt: updatedRecord.last_calculated_at,
                    surveyCompleted: updatedRecord.survey_completed,
                    surveyAnswers: updatedRecord.survey_answers
                }
            });
        }

        // Si ya fue calculado hoy
        return NextResponse.json({
            dopamineAge: {
                userId: daRecord.user_id,
                realAge: daRecord.real_age,
                dopamineAge: daRecord.dopamine_age,
                delta: daRecord.delta,
                status: daRecord.status as DopamineAge['status'],
                lastCalculatedAt: daRecord.last_calculated_at,
                surveyCompleted: daRecord.survey_completed,
                surveyAnswers: daRecord.survey_answers
            }
        });

    } catch (error) {
        console.error('Unexpected error in GET dopamine-age:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
