import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all API keys with usage_count < 50, sorted by usage_count descending
    const { data: keyData, error: keyError } = await supabase
      .from('removebg_keys')
      .select('*')
      .lt('usage_count', 50)
      .order('usage_count', { ascending: false });

    if (keyError || !keyData || keyData.length === 0) {
      return NextResponse.json({ error: 'No available remove.bg API key.' }, { status: 500 });
    }

    let lastError = null;
    for (const apiKeyRow of keyData) {
      const apiKey = apiKeyRow.api_key;
      // Call remove.bg API
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: (() => {
          const form = new FormData();
          form.append('image_file', new Blob([buffer]), 'product.png');
          form.append('size', 'auto');
          return form;
        })(),
      });

      if (response.ok) {
        // Increment usage_count
        await supabase
          .from('removebg_keys')
          .update({ usage_count: apiKeyRow.usage_count + 1 })
          .eq('id', apiKeyRow.id);

        // Delete key if usage_count reaches 50
        if (apiKeyRow.usage_count + 1 >= 50) {
          await supabase
            .from('removebg_keys')
            .delete()
            .eq('id', apiKeyRow.id);
        }

        const resultBuffer = Buffer.from(await response.arrayBuffer());
        return new NextResponse(resultBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': 'inline; filename="removed.png"',
          },
        });
      } else {
        lastError = await response.text();
        // Try next key
      }
    }
    // If all keys failed
    return NextResponse.json({ error: lastError || 'All remove.bg API keys failed.' }, { status: 500 });
  } catch (err: unknown) {
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
