
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_ORDER_URL = 'https://sandbox.cashfree.com/pg/orders'; // Use production URL for live

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency = 'INR', customer_id, customer_email, customer_phone, order_id, order_note } = body;
    const cfRes = await fetch(CASHFREE_ORDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CASHFREE_CLIENT_ID || '',
        'x-client-secret': CASHFREE_CLIENT_SECRET || '',
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id,
          customer_email,
          customer_phone,
        },
        order_id,
        order_note,
      }),
    });
    const data = await cfRes.json();
    return new Response(JSON.stringify(data), {
      status: cfRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to create Cashfree order', details: error?.message || error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
