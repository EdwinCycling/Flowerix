## Current State Assessment
- Tiers are defined in `pricingConfig.ts` (`FREE`, `SILVER`, `GOLD`, `DIAMOND`) with limits and feature flags.
- UI exists in `components/views/PricingView.tsx` to select tiers and buy a one‑time “Flowerix Block”.
- Tier persistence: `setTier` writes to `profiles.settings.tier` (server) and localStorage; validation periodically syncs local → server.
- Extra tokens: `addExtraTokens` only writes to localStorage; not persisted server‑side.
- Subscription UI data is mocked via `getSubscriptionDetails()`; no real Stripe integration yet.
- Security: client-side hash in `usageService` deters tampering but is not authoritative. There’s a server‑truth sync for tier, but usage/tokens are not enforced on server.

## Database Changes (Supabase)
1. Create tables (RLS-enabled):
- `user_subscriptions`: id, user_id (FK profiles.id), stripe_customer_id, stripe_subscription_id, product_id, price_id, tier, status, current_period_end, cancel_at_period_end, updated_at.
- `payments`: id, user_id, stripe_payment_intent_id, amount, currency, type (‘subscription’ | ‘block’), status, created_at.
- `token_blocks`: id, user_id, tokens_added, source_payment_intent_id, created_at.
- `usage_counters`: id, user_id, daily_score, last_usage_date, total_score, input_tokens, output_tokens, images_scanned, extra_tokens (server‑authoritative).
2. Add `stripe_customer_id` to `profiles` (if not present) and keep `settings.tier` for fast reads.
3. RLS Policies:
- Each table row visible and writable only to `auth.uid()` equals `user_id`. Use service role for webhook writes.
- Deny updates to `profiles.settings.tier` by clients; only allow through RPC or service role.

## Stripe Setup
1. Products/Prices:
- Create Products: Flowerix Silver (monthly), Flowerix Gold (monthly), Flowerix Block (one‑time).
- Map Price IDs to tiers in server config.
2. Secrets (Netlify site env):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (for secure server writes in functions).

## Serverless Functions (Netlify)
1. `POST /.netlify/functions/stripe/create-checkout`
- Body: `{ tier: 'SILVER'|'GOLD' }` or `{ block: true }`.
- Create/attach Stripe Customer (persist `stripe_customer_id` in `profiles`).
- For recurring: create Checkout Session with price ID, mode=subscription, success/cancel URLs.
- For block: mode=payment.
- Return `url` for redirect.
2. `POST /.netlify/functions/stripe/create-portal`
- Return Stripe Customer Portal URL for managing upgrades/downgrades/cancellations.
3. `POST /.netlify/functions/stripe/webhook`
- Verify signature with `STRIPE_WEBHOOK_SECRET`.
- Handle events:
  - `checkout.session.completed`: create `payments` record; if block, add `token_blocks` and increment `usage_counters.extra_tokens`.
  - `customer.subscription.created/updated`: set `user_subscriptions` row, update `profiles.settings.tier`, `current_period_end`, `cancel_at_period_end`, status.
  - `customer.subscription.deleted`: set tier to `FREE`, mark status.
  - `invoice.payment_succeeded` / `invoice.payment_failed`: sync status.
- Idempotency: use event idempotency keys; check existing records before inserts.

## Client Changes (UI & Logic)
1. PricingView:
- Replace direct `setTier` with call to `create-checkout` and redirect to `url`.
- Replace direct `addExtraTokens` with block checkout; tokens added only via webhook.
- Add “Manage Subscription” button → `create-portal`.
- Reflect real subscription state by reading `user_subscriptions` via Supabase.
2. Usage Enforcement:
- Stop consuming from local `extraTokens` alone; on AI actions (Gemini functions), read server `usage_counters` and enforce limits on the server function before calling Gemini.
- Update server `usage_counters` with every successful AI call.
3. Tier Sync:
- Keep `profiles.settings.tier` as read‑model; never write from client.
- Continue periodic `validateSubscription` but reading server tables (`user_subscriptions`) for canonical status if desired.

## Upgrade/Downgrade Flows
- Upgrade Silver→Gold: user uses Checkout or Customer Portal; webhook updates tier immediately (proration handled by Stripe) and `profiles.settings.tier`.
- Downgrade Gold→Silver: set `cancel_at_period_end` in Stripe; webhook updates DB; UI displays active until date, switches tier at period end.
- Downgrade to Free: cancel subscription in portal; webhook sets tier to `FREE` and removes premium features.

## One‑Time “Flowerix Block”
- Checkout Session in payment mode with Block price.
- On webhook `checkout.session.completed` and payment intent success, insert `payments`, `token_blocks`, and increment `usage_counters.extra_tokens` by `FLOWERIX_BLOCK.tokens`.
- UI shows updated `extra_tokens` from server.

## Security Hardening
- Server‑side enforcement: All tier changes and token awards only via Stripe webhooks using service role. Client cannot set tier or tokens.
- Validate `user_id` association by `stripe_customer_id` → `profiles.id` in webhook.
- Lock client writes to `profiles.settings.tier` via RLS or restricted update policy; expose a secure RPC if needed.
- Use Stripe price IDs from server config; never trust client‑provided product/price.
- Idempotent webhook processing; log all events.
- Rate limit purchase attempts server‑side; audit log to `payments`.
- Continue client rate limits for UX; primary protection is server checks.

## Testing
- Unit test functions (mock Stripe) for event handling and DB writes.
- E2E test: create checkout, complete test payment, verify tier/tokens update.
- Downgrade/upgrade scenarios through Customer Portal (Stripe test mode).
- Tamper test: try changing localStorage and dev tools; confirm server denies AI calls over limits and resets client view from server truths.

## Rollout Steps
1. Create Stripe products/prices; gather IDs.
2. Add Netlify env variables (Stripe + Supabase service key).
3. Deploy functions; add Supabase schema migrations and RLS policies.
4. Update PricingView and Gemini server functions to use server enforcement.
5. Test in Stripe test mode; then enable in production.

## Preparedness Check (Now)
- Recurring: UI in place but no backend; `profiles.settings.tier` used client/server — ready once webhook writes are added.
- One‑time: UI in place; tokens increase is client‑only — needs server persistence (`usage_counters.extra_tokens`).
- Upgrades/Downgrades: Rank logic exists in UI; Stripe will handle billing and webhook updates will drive tier changes.
- Safety: Must move all tier/token mutations to server; add server checks in Gemini function; add RLS on new tables.

Please confirm this plan; after confirmation, I will implement the database tables, Netlify Stripe functions, secure server enforcement, and connect the UI.