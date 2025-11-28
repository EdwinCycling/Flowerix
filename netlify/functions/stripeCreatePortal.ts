import Stripe from 'stripe';

export const handler = async (event: any) => {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const customerId = (event.queryStringParameters && event.queryStringParameters.customer_id) || undefined;
    if (!STRIPE_SECRET_KEY || !customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Error: Missing Stripe key or customer_id' }) };
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${event.headers.origin || 'https://flowerix.netlify.app'}/pricing`
    });
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: `Error: ${e?.message || 'stripe-create-portal failed'}` }) };
  }
};
