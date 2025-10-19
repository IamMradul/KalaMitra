






// Use Xenova/transformers pipeline for text generation
export const runtime = 'nodejs';


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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), { status: 400 });
    }
    // Use Gemini API only
    try {
      const story = await generateWithGemini(prompt);
      return new Response(JSON.stringify({ response: story }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      let errorMsg = 'Gemini API error';
      if (err instanceof Error) errorMsg = err.message;
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    let errorMsg = 'Story generation failed';
    if (err instanceof Error) errorMsg = err.message;
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
