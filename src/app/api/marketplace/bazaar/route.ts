import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const requestedPageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  // Keep this endpoint lightweight and bounded
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('products')
    .select('id, title, image_url, seller_id, seller:profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    image_url: p.image_url,
    seller_id: p.seller_id,
    sellerName: p?.seller?.name || p?.seller?.[0]?.name || 'Unknown',
  }));

  return NextResponse.json({
    products,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}

