import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { currentBalance, recentActivities } = await request.json();

        if (currentBalance === undefined) {
            return NextResponse.json(
                { error: 'Se requiere el balance actual' },
                { status: 400 }
            );
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `Eres un coach personal que ayuda a las personas a maximizar su tiempo.
Balance actual: ${currentBalance} sendas (positivo = tiempo ganado, negativo = tiempo en deuda).
Proporciona recomendaciones específicas y motivacionales en español.`,
                },
                {
                    role: 'user',
                    content: `Actividades recientes:\n${recentActivities}\n\n¿Qué me recomiendas para mejorar mi balance?`,
                },
            ],
            temperature: 0.8,
            max_tokens: 400,
        });

        const recommendations = completion.choices[0]?.message?.content || 'Sigue con tu buen trabajo.';

        return NextResponse.json({ recommendations });
    } catch (error: any) {
        console.error('Error en recomendaciones IA:', error);
        return NextResponse.json(
            { error: error?.message || 'Error al generar recomendaciones' },
            { status: 500 }
        );
    }
}
