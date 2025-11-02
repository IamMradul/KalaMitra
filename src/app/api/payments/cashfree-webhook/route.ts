
// This endpoint receives payment success notifications from Cashfree
export async function POST(request: Request) {
  try {
    const event = await request.json();
    // Check for payment success event
    if (event.event === 'PAYMENT_SUCCESS') {
      // Extract order_id, payment_id, amount, etc.
      const { order_id, payment_id, order_amount } = event.data || {};
      // 1. Fetch order from DB
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      // Find order by order_reference
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, buyer_id, total_amount')
        .eq('order_reference', order_id)
        .single();
      if (orderError || !order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 2. Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, seller_id, quantity, price')
        .eq('order_id', order.id);
      if (itemsError || !items) {
        return new Response(JSON.stringify({ error: 'Order items not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 3. Fetch seller UPI IDs
      const sellerIds = [...new Set(items.map((item: any) => item.seller_id))];
      const { data: sellers, error: sellersError } = await supabase
        .from('profiles')
        .select('id, upi_id, name')
        .in('id', sellerIds);
      if (sellersError || !sellers) {
        return new Response(JSON.stringify({ error: 'Sellers not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // 4. Calculate payouts
      const sellerMap: Record<string, { upi_id: string, name: string, amount: number }> = {};
      items.forEach((item: any) => {
        if (!sellerMap[item.seller_id]) {
          const seller = sellers.find((s: any) => s.id === item.seller_id);
          sellerMap[item.seller_id] = { upi_id: seller?.upi_id || '', name: seller?.name || '', amount: 0 };
        }
        sellerMap[item.seller_id].amount += Number(item.price) * Number(item.quantity);
      });
      // 5. Call payout API
      await fetch(process.env.PAYOUT_API_URL || 'https://yourdomain/api/payments/cashfree-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id,
          sellers: Object.keys(sellerMap).map(id => ({
            id,
            upi_id: sellerMap[id].upi_id,
            name: sellerMap[id].name,
            amount: sellerMap[id].amount,
          }))
        })
      });
      // Respond to Cashfree
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Ignore other events
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Webhook error', details: error?.message || error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
