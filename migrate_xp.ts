import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getXpRequiredForLevel, MAX_LEVEL } from './src/core/utils/levelUtils';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno de Supabase no encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateUserXp() {
    console.log('Iniciando migración de XP de usuarios...');

    // 1. Obtener todos los usuarios con su nivel y XP actual
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, username, level, xp');

    if (fetchError || !users) {
        console.error('Error al obtener usuarios:', fetchError);
        return;
    }

    console.log(`Se encontraron ${users.length} usuarios.`);

    let updatedCount = 0;

    for (const user of users) {
        // En el sistema actual, el nivel se calculaba como 1 + floor(xp / 1000)
        // Y el XP mostrado en la barra era xp % 1000

        // El usuario está en "user.level"
        // Para que se mantenga en "user.level", en el nuevo sistema necesita
        // la cantidad de XP base de ese nivel

        const currentLevel = user.level || 1;

        // Si ya es nivel máximo, lo dejamos en el XP base del nivel máximo
        const targetLevel = Math.min(MAX_LEVEL, currentLevel);

        // Cuánto XP base requiere este nivel en el nuevo sistema
        const newBaseXpRequired = getXpRequiredForLevel(targetLevel);

        // Agregamos el progreso actual (xp % 1000) al nuevo base XP para que no pierda su progreso *dentro* del nivel
        const currentProgressXp = (user.xp || 0) % 1000;
        const newTotalXp = newBaseXpRequired + currentProgressXp;

        console.log(`Usuario: ${user.username} | Nivel Actual: ${currentLevel} | XP Viejo: ${user.xp} -> XP Nuevo: ${newTotalXp}`);

        // Actualizar en BD
        const { error: updateError } = await supabase
            .from('users')
            .update({ xp: newTotalXp })
            .eq('id', user.id);

        if (updateError) {
            console.error(`Error actualizando usuario ${user.username}:`, updateError);
        } else {
            updatedCount++;
        }
    }

    console.log(`Migración completada. ${updatedCount}/${users.length} usuarios actualizados.`);
}

migrateUserXp();
