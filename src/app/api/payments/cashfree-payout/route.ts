
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_PAYOUT_URL = 'https://payout-api.cashfree.com/payout/v1/requestTransfer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sellers, payment_id } = body;
    const results = [];
    for (const seller of sellers) {
      // 1. Register beneficiary (if not already registered)
      const beneId = `seller_${seller.id}`;
      const registerRes = await fetch('https://payout-api.cashfree.com/payout/v1/addBeneficiary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': CASHFREE_CLIENT_ID || '',
          'X-Client-Secret': CASHFREE_CLIENT_SECRET || '',
        },
        body: JSON.stringify({
          beneId,
          name: seller.name || 'KalaMitra Seller',
          email: `${beneId}@kalamitra.com`,
          phone: '9999999999', // Placeholder, update if available
          upi: seller.upi_id,
          address1: 'KalaMitra',
        }),
      });
      const registerData = await registerRes.json();
      // 2. Transfer payout
      const payoutRes = await fetch(CASHFREE_PAYOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': CASHFREE_CLIENT_ID || '',
          'X-Client-Secret': CASHFREE_CLIENT_SECRET || '',
        },
        body: JSON.stringify({
          beneId,
          amount: seller.amount,
          transferId: `${payment_id}_${seller.id}_${Date.now()}`,
          transferMode: 'upi',
          remarks: 'KalaMitra Seller Payout',
          upi: seller.upi_id,
        }),
      });
      const payoutData = await payoutRes.json();
      results.push({ seller_id: seller.id, upi_id: seller.upi_id, amount: seller.amount, beneId, registerStatus: registerData.status, payoutStatus: payoutData.status, registerData, payoutData });
    }
    return new Response(JSON.stringify({ success: true, payouts: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to process payouts', details: error?.message || error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
