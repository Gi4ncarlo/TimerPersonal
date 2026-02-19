import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GachaEngine } from '@/core/services/GachaEngine';
import { getTodayString } from '@/core/utils/dateUtils';

// Server-side Supabase client (service role for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
    try {
        // 1. Authenticate user via the anon client (from cookies/header)
        const authHeader = request.headers.get('authorization');
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const anonClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader || '' } }
        });

        const { data: { user }, error: authError } = await anonClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // 2. Use service role for DB operations (bypass RLS for atomic transaction)
        const db = createClient(supabaseUrl, supabaseServiceKey);
        const userId = user.id;
        const todayStr = getTodayString();

        // 3. Get or create gacha state
        let { data: state } = await db
            .from('gacha_state')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!state) {
            const { data: created } = await db
                .from('gacha_state')
                .insert({ user_id: userId })
                .select()
                .single();
            state = created;
        }

        if (!state) {
            return NextResponse.json({ error: 'Error inicializando estado de gacha' }, { status: 500 });
        }

        // 4. Daily reset check
        let spinsToday = state.spins_today;
        if (GachaEngine.shouldResetDaily(state.last_spin_date, todayStr)) {
            spinsToday = 0;
        }

        // 5. Check free spin
        const isFree = GachaEngine.isFreeSpin(state.free_spin_available, state.free_spin_used_at);
        const cost = isFree ? 0 : GachaEngine.calculateSpinCost(spinsToday);

        // 6. Get current balance
        const { data: records } = await db
            .from('daily_records')
            .select('points_calculated')
            .eq('user_id', userId);

        const currentBalance = (records || []).reduce((sum: number, r: any) => sum + Number(r.points_calculated), 0);

        if (!isFree && currentBalance < cost) {
            return NextResponse.json({
                error: 'Saldo insuficiente',
                balance: currentBalance,
                cost,
            }, { status: 400 });
        }

        // 7. Get positive actions for RNG (activity-specific multipliers)
        const { data: actions } = await db
            .from('actions')
            .select('id, name, type')
            .or(`user_id.eq.${userId},user_id.is.null`)
            .eq('type', 'positive');

        const positiveActions = (actions || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type as 'positive',
            pointsPerMinute: 0, // Not needed for RNG
        }));

        // 7.1 Get recent history to calculate usage frequency (Last 14 days)
        // This allows GachaEngine to prioritize least used activities
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const dateStr = twoWeeksAgo.toISOString().split('T')[0];

        const { data: history } = await db
            .from('daily_records')
            .select('action_name')
            .eq('user_id', userId)
            .gte('date', dateStr);

        const usageMap = new Map<string, number>();
        (history || []).forEach((r: any) => {
            // Map based on name since we don't always have ID in records
            const name = r.action_name;
            usageMap.set(name, (usageMap.get(name) || 0) + 1);
        });

        // Sort positiveActions by usage count ASC (Least used first)
        positiveActions.sort((a: any, b: any) => {
            const countA = usageMap.get(a.name) || 0;
            const countB = usageMap.get(b.name) || 0;
            return countA - countB;
        });

        // 8. Resolve RNG
        const prize = GachaEngine.resolveRNG(positiveActions);

        // 9. Deduct cost (create negative record)
        if (!isFree && cost > 0) {
            await db.from('daily_records').insert({
                user_id: userId,
                action_name: '🎰 Ruleta Gacha',
                date: todayStr,
                timestamp: new Date().toISOString(),
                duration_minutes: 0,
                points_calculated: -cost,
                notes: `Tirada de ruleta (costo: ${cost.toLocaleString()} pts)`,
            });
        }

        // 10. Apply prize
        let buffCreated = null;

        if (prize.type === 'points' && prize.pointsAwarded > 0) {
            // Direct points reward
            await db.from('daily_records').insert({
                user_id: userId,
                action_name: `🎰 Premio: ${prize.label}`,
                date: todayStr,
                timestamp: new Date().toISOString(),
                duration_minutes: 0,
                points_calculated: prize.pointsAwarded,
                notes: `Ruleta Gacha - ${prize.rarity.toUpperCase()}: ${prize.label}`,
            });
        } else if (prize.type === 'multiplier' && prize.multiplierValue) {
            // Create buff
            const expiresAt = GachaEngine.generateBuffExpiry();

            // For activity-specific buffs, find the matching action
            let actionId = null;
            if (prize.multiplierTarget === 'activity' && prize.actionName) {
                const matchingAction = positiveActions.find(a => a.name === prize.actionName);
                actionId = matchingAction?.id || null;
            }

            const { data: buff } = await db
                .from('active_buffs')
                .insert({
                    user_id: userId,
                    buff_type: prize.multiplierTarget || 'global',
                    action_id: actionId,
                    multiplier: prize.multiplierValue,
                    expires_at: expiresAt,
                    source: 'gacha',
                })
                .select()
                .single();

            if (buff) {
                buffCreated = {
                    id: buff.id,
                    userId: buff.user_id,
                    buffType: buff.buff_type,
                    actionId: buff.action_id,
                    multiplier: Number(buff.multiplier),
                    expiresAt: buff.expires_at,
                    source: buff.source,
                    createdAt: buff.created_at,
                };
            }
        }

        // 11. Update gacha state
        const stateUpdate: any = {
            spins_today: spinsToday + 1,
            last_spin_date: todayStr,
            updated_at: new Date().toISOString(),
        };

        if (isFree) {
            stateUpdate.free_spin_available = false;
            stateUpdate.free_spin_used_at = new Date().toISOString();
        }

        await db
            .from('gacha_state')
            .update(stateUpdate)
            .eq('id', state.id);

        // 12. Log to gacha_history
        await db.from('gacha_history').insert({
            user_id: userId,
            rarity: prize.rarity,
            prize_key: prize.key,
            prize_label: prize.label,
            points_spent: cost,
            points_awarded: prize.pointsAwarded,
            was_free_spin: isFree,
        });

        // 13. Calculate new balance
        const { data: updatedRecords } = await db
            .from('daily_records')
            .select('points_calculated')
            .eq('user_id', userId);

        const newBalance = (updatedRecords || []).reduce((sum: number, r: any) => sum + Number(r.points_calculated), 0);

        // 14. Return result
        return NextResponse.json({
            prize,
            pointsSpent: cost,
            wasFreeSpin: isFree,
            newBalance,
            buffCreated,
            nextSpinCost: GachaEngine.calculateSpinCost(spinsToday + 1),
        });

    } catch (error: any) {
        console.error('Gacha spin error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
