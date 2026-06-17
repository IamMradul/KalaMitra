
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (replace with your env variables or config)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const responseCache = new Map<string, { data: any; ts: number }>();
const RESPONSE_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 60;

function parsePositiveInt(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

function sanitizeSearch(raw: string | null): string {
  if (!raw) return '';
  // Allow common human search chars; strip operators/symbols that can break filter syntax.
  const cleaned = raw
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[^\p{L}\p{N}\s\-_,.&'/:]/gu, '')
    .replace(/\s+/g, ' ');
  return cleaned;
}

function sanitizeCategory(raw: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .slice(0, MAX_CATEGORY_LENGTH)
    .replace(/[^\p{L}\p{N}\s\-&/]/gu, '');
}

function sanitizeLang(raw: string | null): string {
  if (!raw) return 'en';
  const lang = raw.trim().slice(0, 20);
  // allow language keys like "en", "hi", "mni-Mtei"
  if (!/^[a-zA-Z-]+$/.test(lang)) return 'en';
  return lang;
}

// GET /api/marketplace/products?page=1&pageSize=20&search=painting&category=art&collaborativeOnly=true&virtualOnly=true

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, parsePositiveInt(searchParams.get('pageSize'), 20));
  const search = sanitizeSearch(searchParams.get('search'));
  const category = sanitizeCategory(searchParams.get('category'));
  const collaborativeOnly = searchParams.get('collaborativeOnly') === 'true';
  const virtualOnly = searchParams.get('virtualOnly') === 'true';
  const lang = sanitizeLang(searchParams.get('lang'));
  const includeCategories = searchParams.get('includeCategories') === 'true';
  const bypassCache = searchParams.get('bypassCache') === 'true';

  const cacheKey = JSON.stringify({
    page,
    pageSize,
    search,
    category,
    collaborativeOnly,
    virtualOnly,
    lang,
    includeCategories,
  });

  const cached = responseCache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.ts < RESPONSE_CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 1. Fetch collaborative product IDs
  let collabIds: string[] = [];
  if (collaborativeOnly) {
    const { data: collabData } = await supabase
      .from('collaborative_products')
      .select('product_id')
    collabIds = (collabData || []).map((c: any) => c.product_id);
  }

  // 2. Build main product query
  let query = supabase
    .from('products')
    .select('*, seller:profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    // PostgREST filter values containing spaces/special chars must be quoted.
    // Also escape any quotes inside the search term.
    const pattern = `%${search.replace(/"/g, '\\"')}%`
    const quoted = `"${pattern}"`
    query = query.or(`title.ilike.${quoted},description.ilike.${quoted},category.ilike.${quoted}`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (collaborativeOnly && collabIds.length > 0) {
    query = query.in('id', collabIds);
  }
  if (virtualOnly) {
    query = query.eq('is_virtual', true);
  }

  // Optional: return full category list (used by marketplace dropdown).
  // We keep it separate from the paginated query so the dropdown isn't limited to page 1.
  let categories: string[] | undefined = undefined;
  if (includeCategories) {
    const { data: catRows, error: catError } = await supabase
      .from('products')
      .select('category');
    if (!catError && catRows) {
      categories = [...new Set(catRows.map((r: any) => r.category).filter(Boolean))] as string[];
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    // Return structured error to help debugging in dev (avoid losing details)
    // eslint-disable-next-line no-console
    console.error('[marketplace/products] supabase error', error);
    return NextResponse.json(
      { error: error.message, code: (error as any).code, details: (error as any).details, hint: (error as any).hint },
      { status: 500 }
    );
  }

  // 3. Enrich with collaboration info
  let collabMap: Record<string, { id: string; name: string }[]> = {};
  if (data && data.length > 0) {
    const ids = data.map((p: any) => p.id);
    const { data: collabData } = await supabase
      .from('collaborative_products')
      .select(`product_id,collaboration:collaborations(id,initiator_id,partner_id,status,initiator:profiles!collaborations_initiator_id_fkey(id,name),partner:profiles!collaborations_partner_id_fkey(id,name))`)
      .in('product_id', ids)
      .eq('collaboration.status', 'accepted');
    collabMap = {};
    const getProfileName = (p: any): string => {
      // Supabase relationship joins can be returned as an object or as a single-element array
      if (!p) return 'Unknown';
      if (Array.isArray(p)) return p?.[0]?.name || 'Unknown';
      return p?.name || 'Unknown';
    };
    (collabData || []).forEach((cp: any) => {
      const collObj = Array.isArray(cp.collaboration) ? cp.collaboration[0] : cp.collaboration;
      if (!collObj) return;
      collabMap[cp.product_id] = [
        { id: collObj.initiator_id, name: getProfileName(collObj.initiator) },
        { id: collObj.partner_id, name: getProfileName(collObj.partner) }
      ];
    });
  }


  let enriched = (data || []).map((p: any) => ({
    ...p,
    isCollaborative: !!collabMap[p.id],
    collaborators: collabMap[p.id] || [],
  }));

  // Step: Translate product title, category, and seller name if not English
  if (lang && lang !== 'en' && enriched.length > 0) {
    try {
      // Gather all titles, categories, and seller names.
      // Important: make only ONE translate call per request (pagination can trigger many requests).
      const titles = enriched.map((p: any) => p.title || '')
      const categories = enriched.map((p: any) => p.category || '')
      const sellerNames = enriched.map((p: any) => (p.seller?.name || ''))

      const combined = [...titles, ...categories, ...sellerNames]
      const hasAnythingToTranslate = combined.some((s) => typeof s === 'string' && s.trim().length > 0)
      if (!hasAnythingToTranslate) {
        const payload = {
          products: enriched,
          total: count,
          categories,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
        responseCache.set(cacheKey, { data: payload, ts: Date.now() });
        return NextResponse.json(payload)
      }

      const baseUrl = new URL(req.url).origin
      const trCombined = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: combined, target: lang }),
      }).then((res) => (res.ok ? res.json() : { translations: combined }))

      const translations: string[] = Array.isArray(trCombined?.translations) ? trCombined.translations : combined
      const n = enriched.length
      const trTitles = translations.slice(0, n)
      const trCategories = translations.slice(n, n * 2)
      const trSellerNames = translations.slice(n * 2, n * 3)

      // Replace fields with translated values
      enriched = enriched.map((p: any, idx: number) => ({
        ...p,
        title: trTitles[idx] || p.title,
        category: trCategories[idx] || p.category,
        seller: {
          ...p.seller,
          name: trSellerNames[idx] || (p.seller?.name || ''),
        },
      }));
    } catch (err) {
      // If translation fails, fallback to original
      // eslint-disable-next-line no-console
      console.error('Translation error in products API:', err);
    }
  }

  const payload = {
    products: enriched,
    total: count,
    categories,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
  responseCache.set(cacheKey, { data: payload, ts: Date.now() });
  return NextResponse.json(payload);
}

// Bypassing RLS for Google/Microsoft OAuth users who lack a Supabase auth session
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Image Upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('images')
        .getPublicUrl(data.path);

      return NextResponse.json({ url: publicUrlData.publicUrl });
    }

    // Add Product
    if (contentType.includes('application/json')) {
      const productData = await req.json();

      if (!productData || !productData.seller_id || !productData.title) {
        return NextResponse.json({ error: 'Missing required product data' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('products')
        .insert([productData])
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      responseCache.clear();
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { productId, updateData } = await req.json();

    if (!productId || !updateData) {
      return NextResponse.json({ error: 'Missing required product data or ID' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    responseCache.clear();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      // Empty body -> clear cache
      responseCache.clear();
      return NextResponse.json({ success: true, message: 'Cache cleared' });
    }

    const { productId } = JSON.parse(bodyText);

    if (!productId) {
      return NextResponse.json({ error: 'Missing required product ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    responseCache.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
