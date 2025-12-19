
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const apiKey = process.env.CREATOMATE_API_KEY;
const url = 'https://api.creatomate.com/v2/renders';

async function pollStatus(renderId: string) {
  const statusUrl = `https://api.creatomate.com/v2/renders/${renderId}`;
  while (true) {
    const res = await fetch(statusUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await res.json();
    if (data.status === 'succeeded' && data.url) {
      return {
        videoUrl: data.url,
        snapshotUrl: data.snapshot_url,
        status: 'succeeded',
      };
    } else if (data.status === 'failed') {
      return {
        error: data.error || 'Unknown error',
        status: 'failed',
      };
    } else {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uploadedImageUrl,
      productName,
      normalPrice,
      discountedPrice,
      ctaText,
      website
    } = body;

    if (!uploadedImageUrl || !productName || !normalPrice || !discountedPrice || !ctaText || !website) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const templates = [
      {
        template_id: '13ab74a1-21b4-48ba-9d55-93be6ce1a75e',
        modifications: {
          'Background-Image.source': uploadedImageUrl,
          'Discount.text': '-30%',
          'Title.text': productName,
          'Caption.text': '3 days left'
        }
      },
      {
        template_id: 'a05f170d-5571-4e9f-afe1-cefc235e1b27',
        modifications: {
          'Product-Image.source': uploadedImageUrl,
          'Product-Name.text': productName,
          'Product-Description.text': 'Experience quality and innovation in every detail.',
          'Normal-Price.text': normalPrice,
          'Discounted-Price.text': discountedPrice,
          'CTA.text': ctaText,
          'Website.text': website
        }
      },
      {
        template_id: 'ada7c0ef-3af0-4632-b2a2-c0c5f20a1d1c',
        modifications: {
          'Product Image.source': uploadedImageUrl,
          'Caption.text':productName,
          'Call To Action.text': ctaText
        }
      }
    ];

    // Pick a random template
    const selected = templates[Math.floor(Math.random() * templates.length)];
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(selected)
    });
    const data = await response.json();
    if (data.id) {
      const pollResult = await pollStatus(data.id);
      if (pollResult.status === 'succeeded') {
        // Download the video from Creatomate
        const videoRes = await fetch(pollResult.videoUrl);
        if (!videoRes.ok) {
          return NextResponse.json({ error: 'Failed to download video from Creatomate' }, { status: 500 });
        }
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        // Generate a unique filename
        const fileName = `reel-${Date.now()}-${Math.floor(Math.random() * 10000)}.mp4`;
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoBuffer, {
            contentType: 'video/mp4',
            upsert: false,
          });
        if (uploadError) {
          return NextResponse.json({ error: 'Failed to upload video to Supabase', details: uploadError.message }, { status: 500 });
        }
        // Get public URL
        const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(fileName);
        const supabaseVideoUrl = publicUrlData?.publicUrl;
        if (!supabaseVideoUrl) {
          return NextResponse.json({ error: 'Failed to get public URL from Supabase' }, { status: 500 });
        }
        // Only return the Supabase video URL and snapshot to the frontend
        return NextResponse.json({ videoUrl: supabaseVideoUrl, snapshotUrl: pollResult.snapshotUrl });
      } else {
        return NextResponse.json({ error: pollResult.error }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Error submitting render', details: data }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}