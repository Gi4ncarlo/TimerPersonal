import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { recordsSummary } = await request.json();

        if (!recordsSummary) {
            return NextResponse.json(
                { error: 'Se requiere un resumen de actividades' },
                { status: 400 }
            );
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `Eres un coach motivacional que analiza datos de seguimiento de actividades. 
Proporciona insights útiles sobre patrones, logros, y áreas de mejora.
Sé alentador pero honesto. Responde en español de manera concisa y organizada.`,
                },
                {
                    role: 'user',
                    content: `Analiza este resumen semanal de actividades y proporciona insights:\n\n${recordsSummary}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 600,
        });

        const analysis = completion.choices[0]?.message?.content || 'No se pudo generar el análisis.';

        return NextResponse.json({ analysis });
    } catch (error: any) {
        console.error('Error en análisis IA:', error);
        return NextResponse.json(
            { error: error?.message || 'Error al generar análisis' },
            { status: 500 }
        );
    }
}
