import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testDopamineAge() {
    try {
        const { data: users, error: userError } = await supabase.from('users').select('id, username').limit(1);
        if (userError || !users?.length) {
            console.error('No users found', userError);
            return;
        }
        const userId = users[0].id;
        const username = users[0].username;
        console.log(`Testing for user: ${username} (${userId})`);

        const { data: daRecord, error: daError } = await supabase
            .from('dopamine_age')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (daError) {
            console.error('Error fetching daRecord', daError);
        } else {
            console.log('Record found:', daRecord);
        }
    } catch (e) {
        console.error('Unexpected error', e);
    }
}

testDopamineAge();
