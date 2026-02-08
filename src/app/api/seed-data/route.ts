import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';
import { subDays, format } from 'date-fns';

export async function POST(request: NextRequest) {
    try {
        const supabase = getServerClient();
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode'); // 'full' or 'sync'

        // Since getServerClient uses service role, we can't easily get the browsing user
        // We will identify the target user: 'demo@demo.com' as admin by default
        // or we check if there's an auth header (if we were using standard client)

        // Let's find/create the demo user safely
        const { data: { users } } = await supabase.auth.admin.listUsers();
        let adminUser = users.find(u => u.email === 'demo@demo.com');
        let adminId: string;

        if (!adminUser) {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: 'demo@demo.com',
                password: 'demo123',
                email_confirm: true,
            });
            if (createError) throw createError;
            adminId = newUser.user.id;
        } else {
            adminId = adminUser.id;
        }

        // Ensure user profile exists with 'admin' role
        await supabase.from('users').upsert({
            id: adminId,
            username: 'demo',
            email: 'demo@demo.com',
            role: 'admin',
            preferences: { password: 'demo123' }
        });

        // Global Actions (user_id IS NULL)
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

        // Sync Global Actions (NULL user_id)
        const insertedActions = [];
        for (const a of actions) {
            const { data: existing } = await supabase
                .from('actions')
                .select('id')
                .eq('name', a.name)
                .is('user_id', null)
                .single();

            if (existing) {
                const { data: updated } = await supabase
                    .from('actions')
                    .update(a)
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (updated) insertedActions.push(updated);
            } else {
                const { data: inserted } = await supabase
                    .from('actions')
                    .insert({ ...a, user_id: null })
                    .select()
                    .single();
                if (inserted) insertedActions.push(inserted);
            }
        }

        if (insertedActions.length === 0) throw new Error('No se pudieron sincronizar las acciones globales');

        if (mode === 'sync') {
            return NextResponse.json({
                success: true,
                message: `Puntos globales actualizados: ${insertedActions.length} acciones sincronizadas.`
            });
        }

        // Generate 60 days of historical data for demo user
        const records = [];
        const actionMap = new Map(insertedActions.map(a => [a.name, a]));

        for (let i = 60; i >= 0; i--) {
            const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

            if (!isWeekend) {
                if (Math.random() > 0.2) {
                    const duration = 60 + Math.floor(Math.random() * 120);
                    const action = actionMap.get('Estudiar')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `Matemáticas (${duration} min)` });
                }
                // ... (rest same, abbreviated for brevity in replacement but keep logic)
                if (Math.random() > 0.3) {
                    const duration = 120 + Math.floor(Math.random() * 180);
                    const action = actionMap.get('Trabajar activamente')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `Proyecto X (${duration} min)` });
                }
                if (Math.random() > 0.4) {
                    const pages = 10 + Math.floor(Math.random() * 30);
                    const duration = pages * 3;
                    const action = actionMap.get('Leer')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${pages} páginas` });
                }
                if (Math.random() > 0.6) {
                    const duration = 20 + Math.floor(Math.random() * 40);
                    const km = (duration / 6).toFixed(1);
                    const action = actionMap.get('Correr')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${km} km en ${duration} min` });
                }
            } else {
                if (Math.random() > 0.3) {
                    const hours = 2 + Math.floor(Math.random() * 4);
                    const duration = hours * 60;
                    const action = actionMap.get('Jugar videojuegos')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${hours} horas` });
                }
                if (Math.random() > 0.5) {
                    const hours = 1 + Math.floor(Math.random() * 3);
                    const duration = hours * 60;
                    const action = actionMap.get('Ver Stream')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${hours} horas` });
                }
                if (Math.random() > 0.6) {
                    const hours = 2 + Math.floor(Math.random() * 3);
                    const duration = hours * 60;
                    const action = actionMap.get('Netflix/Series')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${hours} horas` });
                }
                if (Math.random() > 0.5) {
                    const duration = 30 + Math.floor(Math.random() * 60);
                    const action = actionMap.get('Actividad Física general')!;
                    if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${duration} minutos` });
                }
            }
            if (Math.random() > 0.3) {
                const hours = 0.5 + Math.random() * 2;
                const duration = Math.floor(hours * 60);
                const action = actionMap.get('Redes Sociales')!;
                if (action) records.push({ user_id: adminId, action_id: action.id, action_name: action.name, date, duration_minutes: duration, points_calculated: action.points_per_minute * duration, notes: `${hours.toFixed(1)} horas` });
            }
        }

        // Insert all records
        const { data: insertedRecords, error: recordsError } = await supabase
            .from('daily_records')
            .insert(records);

        if (recordsError) throw recordsError;

        return NextResponse.json({
            success: true,
            message: `Semilla completa: ${insertedActions.length} acciones, ${records.length} registros creados para el usuario.`
        });

    } catch (error: any) {
        console.error('Error seeding data:', error);
        return NextResponse.json(
            { error: error.message || 'Error generando datos' },
            { status: 500 }
        );
    }
}
