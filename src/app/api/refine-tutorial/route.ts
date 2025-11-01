import { NextRequest, NextResponse } from 'next/server';
// Use Gemini API for story generation (temporary)
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function generateWithGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    if (!res.ok) throw new Error('Gemini API error');
    const data = await res.json();
    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        data?.candidates?.[0]?.content?.text?.trim() ||
        ''
    );
}

function stripCodeFence(text: string) {
    // Remove ```json\n...\n``` or ```...\n```
    const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (fenced) return fenced[1].trim();
    return text.trim();
}

function tryExtractJson(text: string): Record<string, unknown> | null {
    // Try to find the first balanced {...} JSON blob
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
        return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function parseStepsFromPlainText(text: string): string[] {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    const steps: string[] = [];
    let current = '';

    for (const line of lines) {
        // numbered "1. Step", bullet "* Step" or "- Step"
        const m = line.match(/^(?:\d+\.)\s*(.+)$/) || line.match(/^(?:-|\*)\s*(.+)$/);
        if (m) {
            if (current) {
                steps.push(current.trim());
            }
            current = m[1].trim();
        } else if (line === '') {
            if (current) {
                steps.push(current.trim());
                current = '';
            }
        } else {
            // continuation of previous step or a standalone line
            if (current) {
                current += ' ' + line;
            } else {
                // treat as a single-step line if nothing else
                steps.push(line);
            }
        }
    }
    if (current) steps.push(current.trim());
    return steps;
}

function parseGeminiResponse(raw: string, fallbackTitle: string, fallbackSteps: string[]) {
    const cleaned = stripCodeFence(raw);

    // 1) Try direct JSON parse
    try {
        const parsed = JSON.parse(cleaned) as { title?: string; steps?: string[] };
        if (parsed && typeof parsed === 'object') {
            const title = typeof parsed.title === 'string' ? parsed.title : fallbackTitle;
            const steps =
                Array.isArray(parsed.steps) && parsed.steps.every((s: unknown) => typeof s === 'string')
                    ? parsed.steps
                    : fallbackSteps;
            return { title, steps };
        }
    } catch {
        // ignore
    }

    // 2) Try extracting JSON blob from within text
    const extracted = tryExtractJson(raw) || tryExtractJson(cleaned);
    if (extracted && typeof extracted === 'object') {
        const title = typeof (extracted as { title?: string }).title === 'string' ? (extracted as { title?: string }).title : fallbackTitle;
        const steps =
            Array.isArray((extracted as { steps?: unknown[] }).steps) && ((extracted as { steps?: unknown[] }).steps as unknown[]).every((s: unknown) => typeof s === 'string')
                ? (extracted as { steps?: string[] }).steps
                : fallbackSteps;
        return { title, steps };
    }

    // 3) Try parsing a plain text response like:
    // Title: ...
    // Steps:
    // 1. ...
    const titleMatch = cleaned.match(/Title:\s*(.+)/i);
    const stepsIndex = cleaned.search(/Steps:\s*/i);
    if (stepsIndex !== -1) {
        const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;
        const stepsText = cleaned.slice(stepsIndex).replace(/Steps:\s*/i, '');
        const steps = parseStepsFromPlainText(stepsText);
        if (steps.length) return { title, steps };
    }

    // 4) As a last resort, if the response is short use it as title and keep original steps
    if (cleaned && cleaned.length < 200) {
        return { title: cleaned, steps: fallbackSteps };
    }

    // Final fallback
    return { title: fallbackTitle, steps: fallbackSteps };
}

export async function POST(req: NextRequest) {
    const { title = 'Refined Tutorial', steps = [] }: { title?: string; steps?: string[] } = await req.json();
    // Compose prompt for Gemini
    const prompt = `Refine the following tutorial. Improve clarity, grammar, and structure. Return JSON with 'title' and 'steps' (array of strings).\nTitle: ${title}\nSteps:\n${steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    try {
        const geminiResponse = await generateWithGemini(prompt);
        const result = parseGeminiResponse(geminiResponse, title, steps);
        return NextResponse.json(result);
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Gemini API error';
        return NextResponse.json(
            { title, steps, error: errorMsg },
            { status: 500 }
        );
    }
}
