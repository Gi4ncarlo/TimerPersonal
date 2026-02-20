// NotificationEngine - Smart message generation and trigger analysis
// Business Logic layer: "blind" to UI, "agnostic" to data source

import { NotificationType, SarcasmLevel } from '../types';

// ═══════════════════════════════════════════════════
// MESSAGE TEMPLATE POOL  (~312 unique messages)
// ═══════════════════════════════════════════════════

interface MessageTemplate {
    title: string;
    messages: {
        low: string[];
        medium: string[];
        brutal: string[];
    };
    icon: string;
}

const MESSAGE_POOL: Record<NotificationType, MessageTemplate> = {
    // ──────────────────────────────────────────────────
    // INACTIVITY (no records today)
    // ──────────────────────────────────────────────────
    inactivity: {
        title: '⏰ Inactividad Detectada',
        icon: '⏰',
        messages: {
            low: [
                '¡Hora de registrar algo! Tu día espera. 💪',
                'Todavía no registraste nada hoy. ¡Dale que se puede!',
                'Un pequeño paso hoy = un gran avance mañana. Registrá algo. ✨',
                'Tu progreso necesita un empujón hoy. ¡Arrancá con lo que sea!',
                'El día avanza y tus puntos siguen en cero. ¡Todavía estás a tiempo!',
                'Cada actividad cuenta. ¡No dejes pasar el día sin sumar!',
                'Tu yo del futuro te agradecerá si registrás algo hoy. 🙏',
                'Falta tu aporte del día. ¡Cualquier actividad suma!',
            ],
            medium: [
                'Tus actividades te extrañan... hace rato que no las tocás. 😴',
                'El reloj corre y tus puntos siguen en 0 hoy. ¿Qué onda?',
                'Tus competidores están registrando mientras vos... ¿descansás? 🤔',
                'El día ya arrancó y tus puntos no. ¿Cuándo empezás? 😏',
                'Tu tablero está más vacío que heladera de estudiante. Registrá algo. 🧊',
                'Mientras vos leés esto, alguien está sumando puntos. Solo digo... 👀',
                '0 actividades hoy. Eso es menos que tu sombra. Ella al menos se mueve. 🫥',
                'Otro día que empieza sin puntos. ¿Aburrido de ganar? 🥱',
            ],
            brutal: [
                'Tus libros te extrañan... y tus puntos negativos te están saludando. 📉',
                'Si la procrastinación fuera deporte, ya serías profesional. Registrá algo. 🏆',
                'Otro día sin hacer nada = otro strike más cerca. ¿Eso es lo que querés? ⚰️',
                'El sofá no da puntos. Levantate y registrá algo, dale. 🛋️',
                'Tu historial de hoy es más vacío que tu excusa favorita. 💀',
                'Alerta de productividad negativa: 0 horas, 0 puntos, 100% vergüenza. 📊',
                '¿Hoy es tu día libre? Ah no, eso no existe acá. A laburar. 🔨',
                'Ni un minuto registrado. Tus rivales te mandan flores... al funeral de tu racha. 💐',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // RANKING DROP (someone passed you)
    // ──────────────────────────────────────────────────
    ranking_drop: {
        title: '📊 Cambio en el Ranking',
        icon: '📊',
        messages: {
            low: [
                '{leader} te superó en el ranking. ¡Todavía podés recuperarte!',
                'Hubo cambios en el leaderboard. {leader} subió por encima tuyo.',
                '{leader} está avanzando. ¡No te quedes atrás!',
                'El ranking se movió: {leader} ahora está arriba tuyo. ¡A reaccionar!',
                '{leader} sumó puntos y te pasó. ¡Podés recuperar tu lugar!',
                'Posición perdida ante {leader}. ¡Todavía hay tiempo de revertirlo!',
                '{leader} te adelantó con {points} pts. ¡Defendé tu posición!',
                'Cambio de posiciones: {leader} sube, vos bajás. ¡Dale la vuelta!',
            ],
            medium: [
                '{leader} te acaba de pasar en el ranking. ¿Vas a quedarte mirando? 👀',
                'Mientras vos no registrás, {leader} sumó {points} puntos. Auch. 😬',
                '{leader} te pasó como si no existieras. ¿Reacción? 🤨',
                '{leader} metió {hours}h hoy y te sacó del podio. ¿Qué hacés? 😤',
                'Ranking actualizado: {leader} arriba, vos abajo. Suena feo, ¿no? 💔',
                '{leader} está on fire con {points} pts. Tu turno de responder. 🔥',
                'Te comieron en el ranking. {leader} ya celebra. ¿Vas a dejar que se ría? 😏',
                '{leader} te superó con estilo. ¿Tu respuesta? 🎯',
            ],
            brutal: [
                '¿Viste a {leader}? Metió {hours}h hoy. Vos seguís en 0. ¿Vas a dejar que te humille así? 💀',
                '{leader} te pasó en el ranking con {points} puntos. Tu dignidad está en juego. 🪦',
                'Breaking News: {leader} te destruyó en el ranking. Tus excusas no suman puntos. 📰',
                '{leader} manda. Vos... bueno, vos estás leyendo esta notificación. 😶',
                '{leader} te pasó corriendo. No te preocupes, desde abajo la vista es... bueno, no es vista. 🕳️',
                'Ranking: {leader} sube, vos caés. Es como un ascensor, pero vos sos el que baja. 📉',
                '{leader} te dió una clase magistral de productividad con {points} pts. Sentate y tomá apuntes. 📝',
                '¿{leader} te preocupa? No debería, ya te pasó. Ahora preocupate por el que viene atrás. 🏃',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // STREAK DANGER (about to lose streak)
    // ──────────────────────────────────────────────────
    streak_danger: {
        title: '🔥 Racha en Peligro',
        icon: '🔥',
        messages: {
            low: [
                'Tu racha de {streak} días necesita una actividad hoy. ¡No la pierdas!',
                'Llevás {streak} días seguidos. ¡Registrá algo para mantener el ritmo!',
                'Tu racha de {streak} días depende de lo que hagas hoy. 💪',
                '{streak} días de esfuerzo acumulado. ¡No dejes que se pierda!',
                'Solo necesitás una actividad para mantener tu racha de {streak} días. ¡Vamos!',
                'Tu constancia de {streak} días está en tus manos. ¡Registrá algo!',
                'Hoy es clave para tu racha de {streak} días. ¡No la sueltes!',
                '¡{streak} días de compromiso! Solo falta la actividad de hoy. 🎯',
            ],
            medium: [
                '¡Alerta! Tu racha de {streak} días se apaga a medianoche si no hacés algo. ⚠️',
                '{streak} días de esfuerzo... ¿los vas a tirar por no registrar HOY? 😤',
                'Tu racha de {streak} días necesita respiración artificial. Actuá ya. 🏥',
                'Quedan horas para salvar tu racha de {streak} días. ¡No seas vago! 🕐',
                'Tu racha de {streak} días te mira con ojos de cachorro. No la abandones. 🐶',
                '{streak} días de gloria a punto de convertirse en un recuerdo. ¿Eso querés? 😬',
                'Emergencia: racha de {streak} días en estado crítico. Solo vos podés salvarla. 🚑',
                'Tick tock... tu racha de {streak} días se queda sin tiempo. ⏳',
            ],
            brutal: [
                '¡Tu racha de {streak} días está en terapia intensiva! Registrá algo ahora o RIP. ⚰️',
                '{streak} días construyendo algo... y hoy lo vas a dejar morir como si nada. Mirá qué fácil destruís cosas. 🔥',
                'Tu racha de {streak} días fuma su último cigarrillo. Tenés hasta medianoche. 🚬',
                '{streak} días al tacho por pereza. Deberían darte un premio a la inconsistencia. 🏅',
                'Tu racha de {streak} días está escribiendo su testamento. ¿Vas a dejar que muera? 📜',
                '{streak} días de sacrificio a punto de valer CERO. Bien hecho, campeón. 👏',
                'Si tu racha de {streak} días fuera una persona, ya estaría llamando al abogado. Último aviso. ⚖️',
                'RIP racha de {streak} días (en unas horas). Causa de muerte: fiaca terminal. 💀',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // WEEKLY DECLINE (performing worse than last week)
    // ──────────────────────────────────────────────────
    weekly_decline: {
        title: '📉 Rendimiento Semanal',
        icon: '📉',
        messages: {
            low: [
                'Tu rendimiento bajó un {percent}% esta semana. ¡Todavía hay tiempo para mejorar!',
                'Esta semana viene más floja que la anterior. ¡Podés revertirlo!',
                'Vas por debajo de tu promedio. ¡Un empujón más y lo igualás!',
                'Semana complicada, pero no imposible. ¡Revertí esa caída del {percent}%!',
                'Tu rendimiento semanal bajó. ¡Cada actividad ayuda a remontar!',
                'Estás {percent}% por debajo de la semana pasada. ¡Todavía podés emparejarlo!',
                'Semana floja hasta ahora, pero el final depende de vos. 💪',
                'Bajaste un {percent}% vs la semana pasada. ¡A cambiar la tendencia!',
            ],
            medium: [
                'Rendís un {percent}% menos que la semana pasada. ¿Semana difícil o pura fiaca? 🤷',
                'El "yo del lunes" estaría decepcionado con estos números. Dale, reaccioná. 😒',
                'Tu versión de la semana pasada te ganaría fácil. ¿Vas a permitirlo? 💢',
                'Caída del {percent}%. Tu gráfico parece montaña rusa pero solo la parte de bajada. 🎢',
                'La semana pasada rendiste más. ¿Qué pasó? ¿Se fue la motivación de vacaciones? ✈️',
                '{percent}% menos. Si fuera una acción en bolsa, tus inversores estarían nerviosos. 📉',
                'Tu rendimiento esta semana: decepcionante. La semana pasada: aceptable. ¿La próxima? Depende de vos. 🎲',
                'Bajón del {percent}%. Tus actividades negativas aprovechan el descuido. ⚠️',
            ],
            brutal: [
                'Rendís un {percent}% menos que la semana pasada. ¿Te rendiste o qué? 🤨',
                'Si esto fuera un partido, te estarían goleando contra vos mismo. Reaccioná. ⚽',
                'Tu promedio semanal llora en un rincón. Lo estás haciendo un {percent}% peor. Felicidades (?) 🎊',
                'Caída del {percent}%. A este ritmo, la semana que viene vas a deber puntos. 💸',
                '{percent}% peor que la semana pasada. Tu versión anterior te mira con vergüenza ajena. 😐',
                'Tu gráfico semanal parece la caída del imperio romano. Un {percent}% para abajo. 🏛️',
                'Si la mediocridad fuera un deporte, esta semana sacás medalla. {percent}% menos que antes. 🥇',
                'Bajaste un {percent}%. Ni tu peor enemigo te haría tanto daño como tu propia pereza. 💀',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // STREAK MILESTONE (reached 7, 14, 30, etc.)
    // ──────────────────────────────────────────────────
    streak_milestone: {
        title: '🏆 Hito de Racha',
        icon: '🏆',
        messages: {
            low: [
                '¡Increíble! Llevás {streak} días seguidos registrando actividad. ¡Seguí así!',
                '¡{streak} días de racha! Tu constancia es admirable. 🌟',
                '¡Hito alcanzado! {streak} días sin parar. ¡Qué disciplina!',
                '{streak} días seguidos. ¡Eso es compromiso real! 💫',
                '¡Wow! {streak} días consecutivos de actividad. ¡Imparable!',
                'Racha de {streak} días. Tu consistencia inspira. ¡Seguí rompiéndola!',
                '{streak} días y contando. ¡Sos un ejemplo de constancia! 🎯',
                '¡{streak} días! Ese nivel de disciplina es de campeón. 🏅',
            ],
            medium: [
                '¡{streak} días sin parar! Sos una máquina. Tus competidores tiemblan. 💪',
                'Racha de {streak} días. Algunos lo llaman disciplina, otros locura. Vos lo llamás martes. 😎',
                '{streak} días consecutivos. Tu consistencia es más confiable que el clima. ☀️',
                '¡{streak} días! Hasta Netflix te envidia la constancia. 📺',
                'Racha de {streak} días. Estás más enchufado que cargador de celular. 🔌',
                '{streak} días seguidos. A esta altura ya es hábito, no esfuerzo. 🧠',
                '¡{streak} días! Tu racha tiene más capítulos que serie coreana. Seguí sumando. 📈',
                'Milestone: {streak} días. Tu disciplina ya debería tener su propio fan club. 🎪',
            ],
            brutal: [
                '¡{streak} días de racha! Hasta tus enemigos te respetan. Mentira, te odian. Seguí así. 😈',
                '{streak} días. A esta altura ya sos más consistente que el WiFi del país. Leyenda. 🇦🇷',
                '{streak} días sin fallar. ¿Quién sos y qué hiciste con el vago de antes? 🤖',
                'Racha de {streak} días. La gente normal se rinde antes. Vos no sos normal. Y eso es un cumplido... creo. 🤔',
                '{streak} días. Si la constancia pagara impuestos, AFIP te estaría mirando. 💰',
                '¡{streak} días seguidos! Tu compromiso es tan sólido que podrían construir un edificio encima. 🏗️',
                'Milestone: {streak} días. Empezaste como hobby, ahora es obsesión. Me gusta. 😏',
                '{streak} días ininterrumpidos. Ya podés ponerlo en el CV. "Habilidades: imparable". 📄',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // COMEBACK (returned after days of absence)
    // ──────────────────────────────────────────────────
    comeback: {
        title: '🔄 Regreso Detectado',
        icon: '🔄',
        messages: {
            low: [
                '¡Bienvenido de vuelta! Hace {days} días que no te veíamos. ¡A recuperar terreno!',
                'Volviste después de {days} días. ¡El primer paso es el más importante!',
                '¡Qué bueno verte de nuevo! {days} días fuera, pero ya estás acá. 💛',
                'Regresaste después de {days} días. ¡Cada minuto de hoy cuenta!',
                '¡De vuelta en acción! {days} días son nada si volvés con ganas. 🔥',
                '{days} días fuera, pero lo importante es que volviste. ¡Arrancá con todo!',
                '¡Bienvenido! Los {days} días sin actividad quedan atrás. ¡Nuevo capítulo!',
                'Después de {days} días, acá estás de nuevo. ¡A sumar puntos!',
            ],
            medium: [
                '¡Mirá quién volvió! {days} días desaparecido pero acá estás. A laburar. 🫡',
                '¿{days} días sin registrar? No pasa nada... mentira, sí pasa. Pero te perdonamos. Ahora a meterle. 😤',
                'El regreso del año: {days} días fuera y ahora volvés como si nada. A producir. 🎬',
                '{days} días desaparecido. Te buscamos en los clasificados. Bienvenido de vuelta. 📰',
                'Ah, ¿recordaste que tenés una cuenta acá? {days} días después. Mejor tarde que nunca. ⏰',
                '{days} días fuera. Tus rivales festejaron tu ausencia. Ahora a arruinarles la fiesta. 🎉',
                'El comeback del siglo: {days} días en la nada y hoy volvés. Esperemos que dure. 🤞',
                '¿{days} días de vacaciones no autorizadas? Bueno, bienvenido. A compensar. 🧳',
            ],
            brutal: [
                '¡El hijo pródigo regresa después de {days} días! Tus puntos están en terapia. 🏥',
                '{days} días ausente. Pensábamos que habías abandonado la vida productiva. Bienvenido al sufrimiento. 💀',
                'Ah, ¿te acordaste de que existías? {days} días y contando. Tus rivales te mandan saludos desde arriba del ranking. 👋',
                '{days} días sin aparecer. Te declaramos muerto productivamente. Ahora resucitá y a laburar. ⚰️',
                '¿{days} días? ¿Estabas en coma? Porque no hay otra excusa válida. A recuperar lo perdido. 🏥',
                'Bienvenido del más allá productivo. {days} días que no recuperás nunca. Pero hoy es hoy. 🌅',
                '{days} días fuera. Si esto fuera un trabajo, ya estarías despedido tres veces. Pero acá somos misericordiosos. 😇',
                'Oh, mirá quién apareció. {days} días después. Tus strikes te extrañaban. 💀',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // ACHIEVEMENT (mission completed)
    // ──────────────────────────────────────────────────
    achievement: {
        title: '🏆 Logro Desbloqueado',
        icon: '🏆',
        messages: {
            low: [
                '¡Misión cumplida! "{mission}" completada.',
                '¡Bien hecho! Completaste "{mission}" y ganaste {points} pts.',
                'Objetivo alcanzado: "{mission}". ¡Seguí así!',
                '"{mission}" completada con éxito. ¡{points} pts sumados! 🎉',
                '¡Lo lograste! "{mission}" lista. A por la siguiente.',
                'Excelente: "{mission}" terminada. {points} puntos para vos. ⭐',
                '"{mission}" ✓ — ¡Gran trabajo! Seguí sumando.',
                '¡{points} pts ganados! Misión "{mission}" completada. 💪',
            ],
            medium: [
                '¡Boom! "{mission}" liquidada. {points} pts a la bolsa. 💰',
                'Tachaste "{mission}" de la lista. Nada mal. 😎',
                'Una menos: "{mission}". A por la siguiente.',
                '"{mission}" completada. Tu cuenta bancaria de puntos agradece. 🏧',
                '¡Zas! "{mission}" destruida. +{points} pts a tu nombre. 💥',
                'Misión "{mission}": eliminada. Empezás a asustar a tus rivales. 😈',
                '"{mission}" out. {points} pts in. Así se hace. 🔄',
                'Check ✓: "{mission}". Tu versión productiva está ganando hoy. 🏆',
            ],
            brutal: [
                'Milagro: completaste "{mission}". Ya era hora. 🙄',
                '"{mission}" lista. ¿Ves que no era tan difícil? 💅',
                'Por fin hiciste "{mission}". {points} pts para que no llores. 🍼',
                'Oh, completaste "{mission}". ¿Querés un aplauso? 👏... ahí tenés.',
                '"{mission}" terminada. Un logro tan básico merece... estos {points} pts. 🎁',
                'Wow, hiciste "{mission}". Impresionante. Bueno, no tanto. Pero sumaste {points} pts. 🤷',
                '"{mission}" completada. Sabemos que costó. A vos todo te cuesta. Pero lo hiciste. 😤',
                'Finalmente "{mission}" done. El bar estaba bajo, y aun así te costó. {points} pts. 📏',
            ],
        },
    },

    // ══════════════════════════════════════════════════
    //  NEW TYPES
    // ══════════════════════════════════════════════════

    // ──────────────────────────────────────────────────
    // PERSONAL RECORD (new best day, best week, etc.)
    // ──────────────────────────────────────────────────
    personal_record: {
        title: '⭐ Récord Personal',
        icon: '⭐',
        messages: {
            low: [
                '¡Nuevo récord personal! {recordValue} pts en un solo día. ¡Increíble!',
                '¡Superaste tu mejor marca! {recordValue} pts hoy. ¡Seguí así!',
                'Día histórico: {recordValue} pts, tu mejor día hasta ahora. 🎉',
                '¡Rompiste tu propio récord con {recordValue} pts! Impresionante.',
                'Tu mejor día acaba de actualizarse: {recordValue} pts. ¡Bravo!',
                '{recordValue} pts hoy — eso es un nuevo máximo personal. 🏔️',
                '¡Nuevo pico! {recordValue} pts hoy, superando tu marca anterior.',
                'Histórico: nunca habías tenido un día de {recordValue} pts. ¡Wow!',
            ],
            medium: [
                '🚨 ¡NUEVO RÉCORD! {recordValue} pts en un día. Tu versión anterior queda obsoleta. 📈',
                '¡{recordValue} pts! Acabás de reescribir tu propia historia. El viejo récord llora. 😢',
                'Récord aplastado: {recordValue} pts. Tu gráfico necesita zoom out. 🔭',
                '{recordValue} pts hoy. Tu yo del pasado está shockeado. Tu yo del futuro, orgulloso. ⏳',
                '¡Boom! {recordValue} pts = nuevo récord. Los demás deberían estar preocupados. 🎯',
                'Récord personal destrozado: {recordValue} pts. Eso no se ve todos los días. 🌟',
                '{recordValue} pts en un día. Si alguien te decía que podías, tenía razón. 💪',
                '¡Record day! {recordValue} pts. Tu mejor versión acaba de llegar. 🏅',
            ],
            brutal: [
                '¡{recordValue} pts! ¿Quién sos y qué hiciste con el vago de siempre? 🤖',
                'Récord: {recordValue} pts. Impresionante para alguien que usualmente hace lo mínimo. 🙄',
                '{recordValue} pts en un día. Milagro certificado. ¿Quién te amenazó? 🔫',
                '¡Nuevo récord de {recordValue} pts! Demostraste que podías. ¿Por qué no lo hacés siempre? 🤨',
                '{recordValue} pts. Un día productivo entre muchos mediocres. Pero hey, récord es récord. 🎪',
                'OMG {recordValue} pts. ¿Tomaste algo? Porque normalmente no rendís así. ☕',
                'Récord de {recordValue} pts. Esperemos que no sea un evento astronómico irrepetible. 🌌',
                '{recordValue} pts hoy. Tu madre estaría orgullosa. Por primera vez. 💀',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // GOAL PROGRESS (50%, 75%, 90% of a goal)
    // ──────────────────────────────────────────────────
    goal_progress: {
        title: '🎯 Progreso de Meta',
        icon: '🎯',
        messages: {
            low: [
                '¡Vas por el {goalPercent}% de tu meta "{goalTitle}"! ¡Seguí así!',
                'Progreso en "{goalTitle}": {goalPercent}% completado. ¡Cada vez más cerca!',
                'Tu meta "{goalTitle}" avanza bien: {goalPercent}% logrado. 💫',
                '¡{goalPercent}% de "{goalTitle}"! El objetivo está cada vez más cerca.',
                'Gran avance: {goalPercent}% de "{goalTitle}" completado. ¡No pares!',
                '"{goalTitle}" al {goalPercent}%. ¡La meta está al alcance!',
                'Progresando: {goalPercent}% de "{goalTitle}". ¡Falta menos!',
                '¡Buen ritmo! {goalPercent}% de "{goalTitle}" ya está hecho. 🏃',
            ],
            medium: [
                '"{goalTitle}" al {goalPercent}%. La meta ya siente tu aliento en la nuca. 😤',
                '¡{goalPercent}% de "{goalTitle}"! Estás a tiro. No aflojes ahora. 🔥',
                'Progreso: {goalPercent}% en "{goalTitle}". Ya olés la victoria. ¿La vas a cerrar? 🏆',
                '"{goalTitle}": {goalPercent}% done. Falta un sprint. ¿Tenés lo que se necesita? 🏁',
                '¡{goalPercent}%! Tu meta "{goalTitle}" ya casi es un hecho. Solo empujá un poco más. 💪',
                'Estás al {goalPercent}% de "{goalTitle}". No es momento de aflojar, es momento de cerrar. 🔒',
                '"{goalTitle}" al {goalPercent}%. Si la dejás ahora, la vergüenza será eterna. 😬',
                'Meta "{goalTitle}": {goalPercent}% completada. Tu yo del futuro te agradecerá que la cierres. ⏰',
            ],
            brutal: [
                '"{goalTitle}" al {goalPercent}%. Bastante bien para alguien que suele abandonar todo. 🙃',
                '{goalPercent}% de "{goalTitle}". Mirá vos, parece que SÍ podés cuando te da la gana. 💅',
                'Progreso: {goalPercent}% en "{goalTitle}". Si no la terminás después de llegar tan lejos, mereces un strike extra. ⚡',
                '"{goalTitle}" al {goalPercent}%. Impresionante. No te lo arruines abandonándola como las anteriores. 🗑️',
                '{goalPercent}% de "{goalTitle}". Ya llegaste tan lejos que abandonar ahora sería más patético que no haber empezado. 📉',
                'Wow, {goalPercent}% en "{goalTitle}". ¿Esto es real o estoy soñando? No lo arruines. 😑',
                '"{goalTitle}": {goalPercent}%. Falta poquito. No seas de los que se rinden a la mitad... otra vez. 🔄',
                '{goalPercent}% de tu meta. Ya casi. Si la dejás ahora, la notificación de mañana va a ser peor. Te aviso. 💀',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // COMPETITIVE TAUNT (close to surpassing / being surpassed)
    // ──────────────────────────────────────────────────
    competitive_taunt: {
        title: '⚔️ Rivalidad',
        icon: '⚔️',
        messages: {
            low: [
                '¡Estás a solo {gap} pts de superar a {rival}! ¡Un poco más y lo lográs!',
                '{rival} está a {gap} pts por encima tuyo. ¡Recortá la distancia!',
                'La diferencia con {rival} es de solo {gap} pts. ¡Podés cerrarlo hoy!',
                'Estás cerquísima de {rival}: solo {gap} pts de diferencia. ¡Dale!',
                '{rival} está al alcance: {gap} pts. ¡Un buen día y lo pasás!',
                'La brecha con {rival} se achica: {gap} pts. ¡Seguí así!',
                'A {gap} pts de {rival}. Cada actividad te acerca más. 🎯',
                '¡Casi! {gap} pts separan entre vos y {rival}. ¡Hoy podés pasarlo!',
            ],
            medium: [
                '{rival} está a {gap} pts. Un día productivo y le comés el puesto. ¿Aceptás el desafío? 😈',
                'Solo {gap} pts te separan de {rival}. ¿Vas a dejar esa oportunidad pasar? 🤔',
                '{rival} duerme tranquilo a {gap} pts de ventaja. ¿Le arruinamos el sueño? 😏',
                'A {gap} pts de {rival}. El leaderboard se pone picante. ¿Quién da más? 🌶️',
                '{rival} no sabe que estás a {gap} pts. Surprise attack incoming. 🥷',
                'Diferencia con {rival}: {gap} pts. Eso se cierra en un día con ganas. ¿Tenés ganas? 💪',
                'Sprint final: {gap} pts y superás a {rival}. ¿Hoy es el día? 🏁',
                '{rival} te lleva {gap} pts. Nada que un buen turbo-día no pueda resolver. 🚀',
            ],
            brutal: [
                '{rival} te gana por {gap} míseros pts. Si no lo pasás hoy, no tenés excusa. Literalmente ninguna. 💀',
                '{gap} pts es lo que te separa de {rival}. Eso es nada. NADA. ¿Y no lo pasás? Vergonzoso. 🤡',
                '{rival} está a {gap} pts. Si tuvieras la mitad de disciplina que tu ego, ya lo habrías pasado. 🪞',
                'A {gap} pts de {rival}. Un café, una hora de estudio, y lo humillás. ¿O seguís siendo tibio? ☕',
                '{gap} pts de diferencia con {rival}. Podés cerrar eso tosiendo. ¿Qué esperás, una invitación formal? 📩',
                '{rival} te lleva {gap} pts. Pathetic. Un buen día y se acabó. ¿Pero tenés "buenos días"? 😐',
                'Solo {gap} pts te separan de la gloria (bueno, de pasar a {rival}). Dejá de leer esta notificación y ponete a producir. 📵',
                '{rival} cree que está seguro con {gap} pts de ventaja. Demostrále que no. O seguí sentado, como siempre. 🛋️',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // CONSISTENCY PRAISE (high weekly consistency)
    // ──────────────────────────────────────────────────
    consistency_praise: {
        title: '📅 Consistencia Destacada',
        icon: '📅',
        messages: {
            low: [
                '¡{activeDays} de 7 días activo esta semana! Tu consistencia es excelente. 🌟',
                'Semana consistente: {activeDays}/7 días con actividad registrada. ¡Genial!',
                '¡Qué constancia! {activeDays} días activo esta semana. ¡Seguí así!',
                '{activeDays} días productivos esta semana. ¡Tu disciplina brilla!',
                'Consistencia semanal: {activeDays}/7. ¡Eso es compromiso real!',
                '¡Gran semana! {activeDays} de 7 días con registros. 💪',
                'Tu semana muestra {activeDays} días de actividad. ¡Impecable!',
                '{activeDays}/7 días activo. ¡Tu constancia es tu superpoder! ⚡',
            ],
            medium: [
                '{activeDays}/7 días esta semana. Sos una máquina de consistencia. Los demás deberían tomar nota. 🗒️',
                '¡{activeDays} días activo esta semana! Si mantener hábitos fuera un deporte, ya tendrías medalla. 🏅',
                'Consistencia: {activeDays}/7. Estás más presente que notificación de WhatsApp. 📱',
                '{activeDays} días de 7 registrando. Tu constancia haría llorar de orgullo a un espartano. 🛡️',
                'Esta semana: {activeDays}/7 días on fire. Si seguís así, vas a necesitar un trofeo más grande. 🏆',
                '{activeDays}/7. La disciplina se nota. Tus rivales deberían estar preocupados. 😎',
                'Semana épica: {activeDays} de 7 días productivo. Eso no lo logra cualquiera. 💎',
                '{activeDays}/7 días de consistencia. A este ritmo vas a ser leyenda. 🌟',
            ],
            brutal: [
                '{activeDays}/7 días. ¿Quién sos y qué hiciste con el inconsistente de antes? 🤖',
                'Consistencia: {activeDays}/7. Impresionante para alguien con tu historial de abandonos. 📊',
                '{activeDays} de 7 días activo. Mirá vos. Casi como una persona disciplinada de verdad. 🙃',
                'Wow, {activeDays}/7. No sé qué te motivó esta semana, pero seguí haciéndolo. O no. Me da igual. (mentira, seguí) 🤷',
                '{activeDays}/7 días productivos. Si esto es constante y no un accidente, felicidades genuinas. 👏',
                'Consistencia de {activeDays}/7. Quién te conoce, productivo. ¿Seguro que no te hackearon la cuenta? 🔐',
                '{activeDays} de 7 días. Tu racha de consistencia es más larga que la mayoría de tus relaciones con los hábitos. 💀',
                '{activeDays}/7. Empezamos a creer en vos. No lo arruines. 🫣',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // HOURLY NUDGE (it's your peak hour)
    // ──────────────────────────────────────────────────
    hourly_nudge: {
        title: '⏰ Hora Productiva',
        icon: '⏰',
        messages: {
            low: [
                'Son las {peakHour}hs, tu hora más productiva. ¡Aprovechá el momento!',
                'Históricamente rendís mejor a las {peakHour}hs. ¡Es tu hora!',
                'Tu hora pico de productividad es ahora ({peakHour}hs). ¡Dale!',
                'Dato: tus mejores sesiones son alrededor de las {peakHour}hs. ¡A producir!',
                '¡Tu hora estrella! Las {peakHour}hs es cuando más rendís. ¡No la desaproveches!',
                'Son las {peakHour}hs — estadísticamente tu mejor momento. ¡Usalo!',
                'Tu hora dorada: {peakHour}hs. Históricamente es cuando más puntos sumás. ⭐',
                'The golden hour: {peakHour}hs. Tus números dicen que ahora es cuando brillás. 🌟',
            ],
            medium: [
                'Son las {peakHour}hs, cuando normalmente destruís récords. ¿Hoy también? 🔥',
                'Tu hora pico es AHORA ({peakHour}hs). Dato curioso: hoy no registraste nada a esta hora. 😬',
                'Las {peakHour}hs: tu hora más productiva según los datos. ¿O los datos mienten? 📊',
                '¡ALERT! Son las {peakHour}hs, tu hora de máximo rendimiento. El reloj avanza. ⏳',
                'Tus estadísticas dicen que a las {peakHour}hs sos imparable. Demostralo. 💪',
                'Son las {peakHour}hs. Normalmente ya estarías sumando puntos. ¿Hoy qué onda? 🤔',
                'Históricamente, las {peakHour}hs es tu hora estrella. No la desperdicies con scroll en redes. 📱',
                'Las {peakHour}hs = tu hora power. Los datos no mienten. ¿Vos vas a desmentirlos? 🎯',
            ],
            brutal: [
                'Son las {peakHour}hs. Tu hora más productiva. Y estás leyendo esto en vez de producir. La ironía. 🤡',
                'Las {peakHour}hs: tu golden hour. Generalmente producís como loco. Hoy... solo consumís oxígeno. 😑',
                'BREAKING: son las {peakHour}hs y no hiciste nada. Tus datos dicen que a esta hora normalmente rendís. ¿Hoy te dio el día libre? 💀',
                '{peakHour}hs. Tu hora. Tu momento. Y lo estás desperdiciando. Classic. 🎪',
                'La ciencia de TUS datos dice: las {peakHour}hs es tu prime time. Dejá de ignorar la ciencia. 🧪',
                'Son las {peakHour}hs. Históricamente tu mejor hora. Actualmente tu hora de hacer nada. La coherencia te abandona. 🫠',
                '{peakHour}hs = tu hora de máximo potencial. Que evidentemente hoy elegiste desperdiciar. Bien ahí. 👎',
                'Tu peak hour es las {peakHour}hs. Estás desperdiciando tu superpoder estadístico. Patético. 🦸',
            ],
        },
    },

    // ──────────────────────────────────────────────────
    // BEST DAY REMINDER (today is your most productive day of the week)
    // ──────────────────────────────────────────────────
    best_day_reminder: {
        title: '📆 Tu Mejor Día',
        icon: '📆',
        messages: {
            low: [
                '¡Los {bestDay} son tu día más productivo! ¡Aprovechalo al máximo!',
                'Dato curioso: los {bestDay} es cuando mejor rendís. ¡Hoy es {bestDay}!',
                'Históricamente, los {bestDay} son tu día estrella. ¡A brillar!',
                '¡Tu mejor día de la semana! Los {bestDay} solés dar lo mejor. 💪',
                'Los {bestDay} son tu día fuerte. ¡Que hoy no sea la excepción!',
                '¡Hoy es {bestDay}! Tu día favorito para sumar puntos. ¡Dale!',
                'Estadística: los {bestDay} son tu día más activo. ¡Mantené la tradición!',
                'Tu día estrella es hoy ({bestDay}). ¡Hacelo contar! 🌟',
            ],
            medium: [
                'Hoy es {bestDay}, tu día más productivo. ¿Vas a estar a la altura de tu propia reputación? 😏',
                'Los {bestDay} son TU día. Tus datos lo dicen. ¿Hoy lo confirmás o desmentís? 📊',
                '¡Es {bestDay}! Históricamente, hoy rompes récords. No me decepciones. 🔥',
                'Tu promedio de los {bestDay} es alto. Hoy es {bestDay}. A honrar las estadísticas. 📈',
                '{bestDay} = tu día power. Los datos no mienten. ¿Vos tampoco? 🎯',
                'Es {bestDay}: el día que mejor rendís. Si hoy no producís... ¿cuándo? 🤷',
                'Los {bestDay} sacás tu mejor versión. Al menos eso dicen tus números. Hora de probarlo. 💎',
                'Hoy es {bestDay}, cuando solés ser imparable. ¡Activá el modo bestia! 🦁',
            ],
            brutal: [
                'Hoy es {bestDay}. Históricamente tu mejor día. Si hoy sos mediocre, ni tus datos te salvan. 💀',
                'Los {bestDay} son tu día TOP. Si NO producís hoy, ¿qué esperanza te queda el resto de la semana? 😐',
                'Es {bestDay}: tu peak day. Si hoy no rendís, oficialmente sos inconsistente los 7 días. 📊',
                'Tus datos dicen que los {bestDay} sos productivo. Tus datos también han mentido antes. Demostrá que no. 🤥',
                '{bestDay}: tu día fuerte. Si hoy fallás, vamos a tener que redefinir "fuerte". 🏋️',
                'Es {bestDay} y esperamos tu mejor versión. Si aparece la peor, bueno... al menos serás consistente en decepcionar. 🎭',
                'Los {bestDay} solés dar lo mejor de vos. El bar es alto. No lo bajes como todo lo demás. 📏',
                '{bestDay}: día de gloria o día de vergüenza. Vos elegís, pero tus datos ya votaron. 🗳️',
            ],
        },
    },
};

// ═══════════════════════════════════════════════════
// USER SEGMENTS
// ═══════════════════════════════════════════════════

export type UserSegment = 'productive' | 'idle' | 'inactive';

// ═══════════════════════════════════════════════════
// NOTIFICATION ENGINE
// ═══════════════════════════════════════════════════

export interface NotificationContext {
    leader?: string;
    hours?: number;
    points?: number;
    streak?: number;
    percent?: number;
    days?: number;
    username?: string;
    recordValue?: number;
    goalTitle?: string;
    goalPercent?: number;
    rival?: string;
    gap?: number;
    activeDays?: number;
    peakHour?: string;
    bestDay?: string;
    mission?: string;
    [key: string]: any;
}

export interface TriggerResult {
    type: NotificationType;
    title: string;
    message: string;
    context: NotificationContext;
}

export class NotificationEngine {
    /**
     * Generates a dynamic message based on type, context variables, and sarcasm level.
     * This is the core "template engine".
     */
    static getSmartMessage(
        type: NotificationType,
        context: NotificationContext,
        sarcasmLevel: SarcasmLevel = 'medium'
    ): { title: string; message: string } {
        const template = MESSAGE_POOL[type];
        if (!template) {
            return { title: 'Notificación', message: 'Tenés una nueva notificación.' };
        }

        const pool = template.messages[sarcasmLevel];
        const rawMessage = pool[Math.floor(Math.random() * pool.length)];

        // Replace template variables with actual context values
        const message = rawMessage.replace(/\{(\w+)\}/g, (_, key) => {
            const value = context[key];
            return value !== undefined ? String(value) : `{${key}}`;
        });

        return { title: template.title, message };
    }

    /**
     * Classifies user into a segment based on their weekly performance vs average.
     */
    static classifyUser(
        thisWeekPoints: number,
        avgWeeklyPoints: number
    ): UserSegment {
        if (avgWeeklyPoints <= 0) return 'inactive';
        const ratio = thisWeekPoints / avgWeeklyPoints;
        if (ratio >= 0.8) return 'productive';
        if (ratio >= 0.3) return 'idle';
        return 'inactive';
    }

    /**
     * Analyzes current stats and generates CORE notification triggers.
     * This is a pure function: takes data in, returns triggers out.
     * The caller is responsible for persisting and displaying them.
     */
    static analyzeAndTrigger(params: {
        username: string;
        todayRecordsCount: number;
        daysSinceLastActivity: number;
        currentStreak: number;
        streakMilestones?: number[];
        thisWeekPoints: number;
        lastWeekPoints: number;
        weeklyAvgPoints: number;
        leaderAbove?: { username: string; points: number; hours: number } | null;
        sarcasmLevel: SarcasmLevel;
    }): TriggerResult[] {
        const triggers: TriggerResult[] = [];
        const {
            username, todayRecordsCount, daysSinceLastActivity,
            currentStreak, streakMilestones = [7, 14, 30, 60, 100],
            thisWeekPoints, lastWeekPoints, weeklyAvgPoints,
            leaderAbove, sarcasmLevel
        } = params;

        // 1. COMEBACK — User returned after multiple days of inactivity
        if (daysSinceLastActivity >= 2 && todayRecordsCount > 0) {
            const ctx: NotificationContext = { days: daysSinceLastActivity, username };
            const msg = this.getSmartMessage('comeback', ctx, sarcasmLevel);
            triggers.push({ type: 'comeback', ...msg, context: ctx });
        }

        // 2. INACTIVITY — No records today
        if (todayRecordsCount === 0 && daysSinceLastActivity >= 0) {
            const ctx: NotificationContext = { username };
            const msg = this.getSmartMessage('inactivity', ctx, sarcasmLevel);
            triggers.push({ type: 'inactivity', ...msg, context: ctx });
        }

        // 3. STREAK DANGER — Has a streak but no activity today
        if (currentStreak >= 3 && todayRecordsCount === 0) {
            const ctx: NotificationContext = { streak: currentStreak, username };
            const msg = this.getSmartMessage('streak_danger', ctx, sarcasmLevel);
            triggers.push({ type: 'streak_danger', ...msg, context: ctx });
        }

        // 4. STREAK MILESTONE — Reached a milestone
        if (streakMilestones.includes(currentStreak) && todayRecordsCount > 0) {
            const ctx: NotificationContext = { streak: currentStreak, username };
            const msg = this.getSmartMessage('streak_milestone', ctx, sarcasmLevel);
            triggers.push({ type: 'streak_milestone', ...msg, context: ctx });
        }

        // 5. WEEKLY DECLINE — Performing significantly worse than last week
        if (lastWeekPoints > 0) {
            const percentDecline = Math.round(((lastWeekPoints - thisWeekPoints) / lastWeekPoints) * 100);
            if (percentDecline >= 30) {
                const ctx: NotificationContext = { percent: percentDecline, username };
                const msg = this.getSmartMessage('weekly_decline', ctx, sarcasmLevel);
                triggers.push({ type: 'weekly_decline', ...msg, context: ctx });
            }
        }

        // 6. RANKING DROP — Someone above you
        if (leaderAbove) {
            const ctx: NotificationContext = {
                leader: leaderAbove.username,
                points: Math.floor(leaderAbove.points),
                hours: Math.round(leaderAbove.hours * 10) / 10,
                username,
            };
            const msg = this.getSmartMessage('ranking_drop', ctx, sarcasmLevel);
            triggers.push({ type: 'ranking_drop', ...msg, context: ctx });
        }

        return triggers;
    }

    /**
     * Advanced triggers that use richer data: stats, leaderboard, personal records.
     * This is a separate method so the caller can provide optional advanced data.
     */
    static analyzeAdvancedTriggers(params: {
        username: string;
        sarcasmLevel: SarcasmLevel;
        todayRecordsCount: number;
        todayPoints: number;
        // Personal record — current best day points
        previousBestDayPoints?: number;
        // Goal milestones
        goals?: { title: string; currentValue: number; targetValue: number; isCompleted: boolean }[];
        // Competitive — closest rival above
        closestRivalAbove?: { username: string; gap: number } | null;
        // Consistency — active days this week
        activeDaysThisWeek?: number;
        // Hourly peak
        peakHour?: number;
        currentHour?: number;
        // Best day of week
        bestDayOfWeek?: string;
        todayDayName?: string;
    }): TriggerResult[] {
        const triggers: TriggerResult[] = [];
        const {
            username, sarcasmLevel, todayRecordsCount, todayPoints,
            previousBestDayPoints, goals, closestRivalAbove,
            activeDaysThisWeek, peakHour, currentHour,
            bestDayOfWeek, todayDayName,
        } = params;

        // 7. PERSONAL RECORD — Beat your best day
        if (previousBestDayPoints !== undefined && todayPoints > previousBestDayPoints && todayPoints > 0) {
            const ctx: NotificationContext = { recordValue: Math.floor(todayPoints), username };
            const msg = this.getSmartMessage('personal_record', ctx, sarcasmLevel);
            triggers.push({ type: 'personal_record', ...msg, context: ctx });
        }

        // 8. GOAL PROGRESS — At 50%, 75%, or 90% of a goal
        if (goals && goals.length > 0) {
            const milestones = [50, 75, 90];
            for (const goal of goals) {
                if (goal.isCompleted || goal.targetValue <= 0) continue;
                const percent = Math.round((goal.currentValue / goal.targetValue) * 100);
                const crossedMilestone = milestones.find(m => {
                    const prevPercent = goal.targetValue > 0
                        ? Math.round(((goal.currentValue - 1) / goal.targetValue) * 100)
                        : 0;
                    return percent >= m && prevPercent < m;
                });
                if (crossedMilestone) {
                    const ctx: NotificationContext = {
                        goalTitle: goal.title,
                        goalPercent: crossedMilestone,
                        username,
                    };
                    const msg = this.getSmartMessage('goal_progress', ctx, sarcasmLevel);
                    triggers.push({ type: 'goal_progress', ...msg, context: ctx });
                    break; // Only one goal notification at a time
                }
            }
        }

        // 9. COMPETITIVE TAUNT — Close to passing someone
        if (closestRivalAbove && closestRivalAbove.gap <= 500) {
            const ctx: NotificationContext = {
                rival: closestRivalAbove.username,
                gap: Math.floor(closestRivalAbove.gap),
                username,
            };
            const msg = this.getSmartMessage('competitive_taunt', ctx, sarcasmLevel);
            triggers.push({ type: 'competitive_taunt', ...msg, context: ctx });
        }

        // 10. CONSISTENCY PRAISE — 5+ active days this week
        if (activeDaysThisWeek !== undefined && activeDaysThisWeek >= 5) {
            const ctx: NotificationContext = { activeDays: activeDaysThisWeek, username };
            const msg = this.getSmartMessage('consistency_praise', ctx, sarcasmLevel);
            triggers.push({ type: 'consistency_praise', ...msg, context: ctx });
        }

        // 11. HOURLY NUDGE — It's your peak hour and you haven't registered
        if (
            peakHour !== undefined && currentHour !== undefined &&
            currentHour === peakHour && todayRecordsCount === 0
        ) {
            const ctx: NotificationContext = {
                peakHour: String(peakHour).padStart(2, '0'),
                username,
            };
            const msg = this.getSmartMessage('hourly_nudge', ctx, sarcasmLevel);
            triggers.push({ type: 'hourly_nudge', ...msg, context: ctx });
        }

        // 12. BEST DAY REMINDER — Today is your historically best day
        if (bestDayOfWeek && todayDayName && bestDayOfWeek === todayDayName) {
            const ctx: NotificationContext = { bestDay: bestDayOfWeek, username };
            const msg = this.getSmartMessage('best_day_reminder', ctx, sarcasmLevel);
            triggers.push({ type: 'best_day_reminder', ...msg, context: ctx });
        }

        return triggers;
    }

    /**
     * Returns the icon for a notification type
     */
    static getNotificationIcon(type: NotificationType): string {
        return MESSAGE_POOL[type]?.icon || '🔔';
    }

    /**
     * Anti-spam: filter triggers to avoid sending too many notifications.
     * Rules:
     * 1. Global Daily Limit: Max 4 notifications per day (increased for variety).
     * 2. Global Cooldown: Minimum 4 hours between ANY notification.
     * 3. Per-Type Cooldown: Minimum 12 hours between notifications of the SAME type.
     */
    static deduplicateTriggers(
        newTriggers: TriggerResult[],
        existingNotifications: { type: string; createdAt: string }[],
        config: {
            perTypeCooldownHours: number;
            globalCooldownHours: number;
            maxPerDay: number;
        } = {
                perTypeCooldownHours: 12,
                globalCooldownHours: 4,
                maxPerDay: 4
            }
    ): TriggerResult[] {
        const now = Date.now();
        const todayStr = new Date().toDateString();

        // 1. Check Daily Limit
        const todayNotifications = existingNotifications.filter(n =>
            new Date(n.createdAt).toDateString() === todayStr
        );

        if (todayNotifications.length >= config.maxPerDay) {
            console.log('NotificationEngine: Daily limit reached.');
            return [];
        }

        // 2. Check Global Cooldown (time since ANY last notification)
        if (existingNotifications.length > 0) {
            const latest = existingNotifications[0];
            const diffHours = (now - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60);

            if (diffHours < config.globalCooldownHours) {
                console.log(`NotificationEngine: Global cooldown active. Last notification was ${diffHours.toFixed(1)}h ago.`);
                return [];
            }
        }

        const typeCooldownMs = config.perTypeCooldownHours * 60 * 60 * 1000;
        const remaining = config.maxPerDay - todayNotifications.length;

        return newTriggers.filter(trigger => {
            const recent = existingNotifications.find(n =>
                n.type === trigger.type &&
                (now - new Date(n.createdAt).getTime()) < typeCooldownMs
            );
            return !recent;
        }).slice(0, remaining); // Respect remaining daily budget
    }
}
