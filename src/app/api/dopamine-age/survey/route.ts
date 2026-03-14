import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculateDopamineAge } from '@/core/DopamineAgeEngine';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { DopamineAgeSurvey, Balance, Strike, DopamineAge } from '@/core/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        const db = authClient;
        const survey: DopamineAgeSurvey = await request.json();

        if (!survey || !survey.realAge) {
            return NextResponse.json({ error: 'Invalid survey data' }, { status: 400 });
        }

        // Fetch current user details if exist
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

        const stats = StrikeDetector.calculateStats(strikes);
        const currentStreak = stats.currentStreak;

        // Fetch recent records
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentRecords } = await db
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

        const mappedRecords = (recentRecords || []).map(r => ({
            id: r.id,
            actionId: r.action_id,
            actionName: r.action_name,
            date: r.date,
            durationMinutes: r.duration_minutes,
            pointsCalculated: r.points_calculated
        }));

        // Strikes already fetched above for streak calculation


        // Calculo Inicial
        const dopamineAgeResult = calculateDopamineAge({
            survey,
            recentRecords: mappedRecords,
            currentBalance,
            activeStrikes: strikes,
            currentStreak
        });

        dopamineAgeResult.userId = userId;

        // Actualizar real_age en User (Si aplica a la DB original)
        await db
            .from('users')
            .update({ real_age: survey.realAge })
            .eq('id', userId);

        // Guardar en tabla Dopamine Age
        const { data: insertedRecord, error: insertError } = await db
            .from('dopamine_age')
            .upsert({
                user_id: userId,
                real_age: survey.realAge,
                dopamine_age: dopamineAgeResult.dopamineAge,
                delta: dopamineAgeResult.delta,
                status: dopamineAgeResult.status,
                last_calculated_at: new Date().toISOString(),
                survey_completed: true,
                survey_answers: survey,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting dopamine age:', insertError);
            return NextResponse.json({ error: 'Database error while saving survey' }, { status: 500 });
        }

        return NextResponse.json({
            dopamineAge: {
                userId: insertedRecord.user_id,
                realAge: insertedRecord.real_age,
                dopamineAge: insertedRecord.dopamine_age,
                delta: insertedRecord.delta,
                status: insertedRecord.status as DopamineAge['status'],
                lastCalculatedAt: insertedRecord.last_calculated_at,
                surveyCompleted: insertedRecord.survey_completed,
                surveyAnswers: insertedRecord.survey_answers
            }
        });

    } catch (error) {
        console.error('Unexpected error in POST dopamine-age/survey:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
