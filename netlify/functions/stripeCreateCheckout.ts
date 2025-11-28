import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const handler = async (event: any) => {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Error: Missing server env configuration' }) };
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = event.body ? JSON.parse(event.body) : {};
    const userId = body.userId;
    const mode: 'subscription' | 'payment' = body.block ? 'payment' : 'subscription';
    const tier = body.tier;

    // Map server-known price IDs
    const PRICE_SILVER = process.env.STRIPE_PRICE_SILVER as string;
    const PRICE_GOLD = process.env.STRIPE_PRICE_GOLD as string;
    const PRICE_BLOCK = process.env.STRIPE_PRICE_BLOCK as string;
    if (mode === 'subscription' && !(tier === 'SILVER' || tier === 'GOLD')) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Error: Invalid tier' }) };
    }

    // Resolve customer
    const { data: prof } = await supabase.from('profiles').select('id, settings').eq('id', userId).single();
    let stripeCustomerId = prof?.settings?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { userId }
      });
      stripeCustomerId = customer.id;
      const existing = prof?.settings || {};
      await supabase.from('profiles').update({ settings: { ...existing, stripeCustomerId } }).eq('id', userId);
    }

    const priceId = mode === 'payment' ? PRICE_BLOCK : (tier === 'SILVER' ? PRICE_SILVER : PRICE_GOLD);
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${event.headers.origin || 'https://flowerix.netlify.app'}/?purchase=success`,
      cancel_url: `${event.headers.origin || 'https://flowerix.netlify.app'}/pricing`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: `Error: ${e?.message || 'stripe-create-checkout failed'}` }) };
  }
};
