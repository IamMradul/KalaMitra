
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Create a new custom request
export async function POST(req: NextRequest) {
	const body = await req.json();
	const { buyer_id, seller_id, product_id, description, ai_draft_url } = body;
	const { data, error } = await supabase
		.from('custom_requests')
		.insert([
			{
				buyer_id,
				seller_id,
				product_id,
				description,
				ai_draft_url,
				status: 'Requested',
			},
		])
		.select();
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

  
	// Log notification for seller about new custom request
	const customRequest = Array.isArray(data) ? data[0] : data;
	await supabase
		.from('notifications')
		.insert({
			user_id: seller_id,
			title: 'New Custom Request!',
			body: `You have received a new custom craft request from a buyer.`,
			read: false,
			metadata: {
				type: 'custom_request',
				custom_request_id: customRequest?.id,
				product_id,
				buyer_id
			}
		});

	return NextResponse.json({ data }, { status: 201 });
}

// Update custom request status
export async function PATCH(req: NextRequest) {
	const body = await req.json();
	const { id, status } = body;
	if (!id || !status) {
		return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
	}
	const { data, error } = await supabase
		.from('custom_requests')
		.update({ status })
		.eq('id', id)
		.select();
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
	return NextResponse.json({ data }, { status: 200 });
}
// Fetch custom requests for a seller
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const seller_id = searchParams.get('seller_id');
	if (!seller_id) {
		return NextResponse.json({ error: 'Missing seller_id' }, { status: 400 });
	}
	const { data, error } = await supabase
		.from('custom_requests')
		.select('*')
		.eq('seller_id', seller_id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
	return NextResponse.json({ data }, { status: 200 });
}
