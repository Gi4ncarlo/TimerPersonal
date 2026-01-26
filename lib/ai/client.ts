// OpenAI wrapper - abstracts AI provider details
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedActivity {
    actionName: string;
    durationMinutes: number;
    confidence: number;
}

export class AIClient {
    /**
     * Parse natural language input into structured activity data
     * E.g., "ran for 30 minutes" -> { actionName: "Running", durationMinutes: 30 }
     */
    static async parseActivityText(text: string, availableActions: string[]): Promise<ParsedActivity> {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that parses user activity entries. 
Available actions: ${availableActions.join(', ')}

Parse the user's text and extract:
1. Which action they performed (match to available actions)
2. Duration in minutes

Respond ONLY with valid JSON in this format:
{
  "actionName": "exact action name from the list",
  "durationMinutes": number,
  "confidence": number between 0-1
}`,
                    },
                    {
                        role: 'user',
                        content: text,
                    },
                ],
                temperature: 0.3,
            });

            const responseText = completion.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(responseText);

            return {
                actionName: parsed.actionName || '',
                durationMinutes: parsed.durationMinutes || 0,
                confidence: parsed.confidence || 0,
            };
        } catch (error) {
            console.error('AI parsing error:', error);
            throw new Error('Failed to parse activity text');
        }
    }

    /**
     * Generate insights from historical data
     */
    static async generateInsights(recordsSummary: string): Promise<string> {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an encouraging AI coach analyzing a user's time tracking data. 
Provide helpful insights about patterns, achievements, and gentle suggestions for improvement.
Be motivational, not judgmental. Focus on concrete observations.`,
                    },
                    {
                        role: 'user',
                        content: `Analyze this activity summary and provide insights:\n\n${recordsSummary}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 500,
            });

            return completion.choices[0]?.message?.content || 'No insights available.';
        } catch (error) {
            console.error('AI insight generation error:', error);
            return 'Unable to generate insights at this time.';
        }
    }

    /**
     * Generate recommendations based on current balance
     */
    static async generateRecommendations(
        currentBalance: number,
        recentActivities: string
    ): Promise<string> {
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are a motivational coach helping users balance their time.
Current balance: ${currentBalance} points (positive = time gained, negative = time lost).
Suggest specific actions to improve balance, but be encouraging.`,
                    },
                    {
                        role: 'user',
                        content: `Recent activities:\n${recentActivities}\n\nWhat should I focus on?`,
                    },
                ],
                temperature: 0.8,
                max_tokens: 300,
            });

            return completion.choices[0]?.message?.content || 'Keep up the good work!';
        } catch (error) {
            console.error('AI recommendation error:', error);
            return 'Focus on your positive activities!';
        }
    }
}
