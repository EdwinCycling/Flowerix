import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const handler = async (event: any) => {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY as string;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error: Missing server env configuration' }) };
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const constructed = stripe.webhooks.constructEvent(body, sig as string, STRIPE_WEBHOOK_SECRET);
    const evt = constructed as Stripe.Event;

    switch (evt.type) {
      case 'checkout.session.completed': {
        const session = evt.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const paymentIntentId = session.payment_intent as string;
        const mode = session.mode; // 'payment' or 'subscription'
        const { data: prof } = await supabase.from('profiles').select('id, settings').eq('settings->>stripeCustomerId', customerId).maybeSingle();
        const userId = prof?.id;
        if (!userId) break;
        await supabase.from('payments').insert({ user_id: userId, stripe_payment_intent_id: paymentIntentId, amount: session.amount_total, currency: session.currency, type: mode === 'payment' ? 'block' : 'subscription', status: 'succeeded' });
        if (mode === 'payment') {
          // Award block tokens
          const TOKENS = Number(process.env.FLOWERIX_BLOCK_TOKENS || '250000');
          await supabase.from('token_blocks').insert({ user_id: userId, tokens_added: TOKENS, source_payment_intent_id: paymentIntentId });
          const { data: counter } = await supabase.from('usage_counters').select('extra_tokens').eq('user_id', userId).maybeSingle();
          const extra = (counter?.extra_tokens || 0) + TOKENS;
          await supabase.from('usage_counters').upsert({ user_id: userId, extra_tokens: extra }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = evt.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const productId = sub.items.data[0]?.price?.product as string;
        const priceId = sub.items.data[0]?.price?.id as string;
        const status = sub.status;
        const periodEnd = (sub as any).current_period_end ? ((sub as any).current_period_end * 1000) : Date.now();
        const cancelAtPeriodEnd = sub.cancel_at_period_end;
        const { data: prof } = await supabase.from('profiles').select('id, settings').eq('settings->>stripeCustomerId', customerId).maybeSingle();
        const userId = prof?.id;
        if (!userId) break;
        // Map price → tier
        const priceSilver = process.env.STRIPE_PRICE_SILVER;
        const priceGold = process.env.STRIPE_PRICE_GOLD;
        const tier = priceId === priceGold ? 'GOLD' : 'SILVER';
        await supabase.from('user_subscriptions').upsert({ user_id: userId, stripe_customer_id: customerId, stripe_subscription_id: sub.id, product_id: productId, price_id: priceId, tier, status, current_period_end: new Date(periodEnd).toISOString(), cancel_at_period_end: cancelAtPeriodEnd }, { onConflict: 'user_id' });
        const existing = prof?.settings || {};
        await supabase.from('profiles').update({ settings: { ...existing, tier } }).eq('id', userId);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evt.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { data: prof } = await supabase.from('profiles').select('id, settings').eq('settings->>stripeCustomerId', customerId).maybeSingle();
        const userId = prof?.id;
        if (!userId) break;
        await supabase.from('user_subscriptions').update({ status: 'canceled' }).eq('user_id', userId);
        const existing = prof?.settings || {};
        await supabase.from('profiles').update({ settings: { ...existing, tier: 'FREE' } }).eq('id', userId);
        break;
      }
      default:
        break;
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (e: any) {
    return { statusCode: 400, body: JSON.stringify({ error: `Error: ${e?.message || 'stripe-webhook failed'}` }) };
  }
};
