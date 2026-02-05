import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';
import { subDays, format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const supabase = getServerClient();

        // Create demo user if not exists
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: 'demo@demo.com',
            password: 'demo123',
            email_confirm: true,
        });

        if (authError && !authError.message.includes('already registered')) {
            throw authError;
        }

        const userId = authUser?.user?.id || (await supabase.auth.signInWithPassword({
            email: 'demo@demo.com',
            password: 'demo123'
        })).data.user?.id;

        if (!userId) throw new Error('No se pudo crear usuario');

        // Insert user profile
        await supabase.from('users').upsert({
            id: userId,
            username: 'demo',
            preferences: { password: 'demo123' }
        });

        // Insert actions
        const actions = [
            { name: 'Ver Stream', type: 'negative', points_per_minute: -11, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Jugar videojuegos', type: 'negative', points_per_minute: -12, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Ver Videos YT', type: 'negative', points_per_minute: -8, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Salir a bailar', type: 'negative', points_per_minute: -12, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Redes Sociales', type: 'negative', points_per_minute: -9, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Netflix/Series', type: 'negative', points_per_minute: -8, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Procrastinar', type: 'negative', points_per_minute: -10, metadata: { inputType: 'hours', unit: 'horas' } },
            { name: 'Leer', type: 'positive', points_per_minute: 8, metadata: { inputType: 'pages', unit: 'páginas', estimatedMinutesPerPage: 3 } },
            { name: 'Correr', type: 'positive', points_per_minute: 12, metadata: { inputType: 'distance-time', unit: 'km' } },
            { name: 'Actividad Física general', type: 'positive', points_per_minute: 9, metadata: { inputType: 'time', unit: 'minutos' } },
            { name: 'Trabajar activamente', type: 'positive', points_per_minute: 8, metadata: { inputType: 'time-note', unit: 'minutos' } },
            { name: 'Estudiar', type: 'positive', points_per_minute: 12, metadata: { inputType: 'time-subject', unit: 'minutos' } },
        ];

        const { data: insertedActions } = await supabase
            .from('actions')
            .upsert(actions.map(a => ({ ...a, user_id: userId })), { onConflict: 'user_id,name' })
            .select();

        if (!insertedActions) throw new Error('Error insertando acciones');

        // Generate 60 days of historical data
        const records = [];
        const actionMap = new Map(insertedActions.map(a => [a.name, a]));

        for (let i = 60; i >= 0; i--) {
            const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

            // Weekdays: more productive activities
            if (!isWeekend) {
                // Estudiar
                if (Math.random() > 0.2) {
                    const duration = 60 + Math.floor(Math.random() * 120);
                    const action = actionMap.get('Estudiar')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `Matemáticas (${duration} min)`
                    });
                }

                // Trabajar
                if (Math.random() > 0.3) {
                    const duration = 120 + Math.floor(Math.random() * 180);
                    const action = actionMap.get('Trabajar activamente')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `Proyecto X (${duration} min)`
                    });
                }

                // Leer
                if (Math.random() > 0.4) {
                    const pages = 10 + Math.floor(Math.random() * 30);
                    const duration = pages * 3;
                    const action = actionMap.get('Leer')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${pages} páginas`
                    });
                }

                // Correr (algunos días)
                if (Math.random() > 0.6) {
                    const duration = 20 + Math.floor(Math.random() * 40);
                    const km = (duration / 6).toFixed(1);
                    const action = actionMap.get('Correr')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${km} km en ${duration} min`
                    });
                }
            }

            // Weekends: more leisure activities
            else {
                // Videojuegos
                if (Math.random() > 0.3) {
                    const hours = 2 + Math.floor(Math.random() * 4);
                    const duration = hours * 60;
                    const action = actionMap.get('Jugar videojuegos')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${hours} horas`
                    });
                }

                // Ver Stream
                if (Math.random() > 0.5) {
                    const hours = 1 + Math.floor(Math.random() * 3);
                    const duration = hours * 60;
                    const action = actionMap.get('Ver Stream')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${hours} horas`
                    });
                }

                // Netflix
                if (Math.random() > 0.6) {
                    const hours = 2 + Math.floor(Math.random() * 3);
                    const duration = hours * 60;
                    const action = actionMap.get('Netflix/Series')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${hours} horas`
                    });
                }

                // Actividad física (fin de semana también)
                if (Math.random() > 0.5) {
                    const duration = 30 + Math.floor(Math.random() * 60);
                    const action = actionMap.get('Actividad Física general')!;
                    records.push({
                        user_id: userId,
                        action_id: action.id,
                        action_name: action.name,
                        date,
                        duration_minutes: duration,
                        points_calculated: action.points_per_minute * duration,
                        notes: `${duration} minutos`
                    });
                }
            }

            // Redes sociales (todos los días, variable)
            if (Math.random() > 0.3) {
                const hours = 0.5 + Math.random() * 2;
                const duration = Math.floor(hours * 60);
                const action = actionMap.get('Redes Sociales')!;
                records.push({
                    user_id: userId,
                    action_id: action.id,
                    action_name: action.name,
                    date,
                    duration_minutes: duration,
                    points_calculated: action.points_per_minute * duration,
                    notes: `${hours.toFixed(1)} horas`
                });
            }
        }

        // Insert all records
        const { data: insertedRecords, error: recordsError } = await supabase
            .from('daily_records')
            .insert(records);

        if (recordsError) throw recordsError;

        return NextResponse.json({
            success: true,
            message: `Datos de ejemplo creados: ${insertedActions.length} acciones, ${records.length} registros de 60 días`
        });

    } catch (error: any) {
        console.error('Error seeding data:', error);
        return NextResponse.json(
            { error: error.message || 'Error generando datos de ejemplo' },
            { status: 500 }
        );
    }
}
