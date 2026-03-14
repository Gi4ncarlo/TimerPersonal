import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

        // Fetch user's latest 30 historical calculations ascending (oldest first for the chart X axis)
        const { data: historyRecords, error: historyError } = await authClient
            .from('dopamine_age_history')
            .select('*')
            .eq('user_id', userId)
            .order('calculated_at', { ascending: false }) // Sort backwards to grab last 30
            .limit(30);

        if (historyError) {
            console.error('Error fetching dopamine age history:', historyError);
            return NextResponse.json({ error: 'Database error fetching history' }, { status: 500 });
        }

        // Map and format the response, re-ordering chronologically (ASC)
        const formattedHistory = (historyRecords || []).reverse().map(record => ({
            date: new Date(record.calculated_at).toISOString().split('T')[0],
            dopamineAge: record.dopamine_age,
            status: record.status
        }));

        return NextResponse.json({
            history: formattedHistory
        });

    } catch (error) {
        console.error('Unexpected error in GET dopamine-age/history:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
