# Lucky Caps Live Launch Checklist

Use this checklist before and during the first real production order.

## 1. Netlify Production Env Verification

- [ ] `STRIPE_SECRET_KEY` is set in Netlify Production and starts with `sk_live_`.
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in Netlify Production and starts with `pk_live_`.
- [ ] `STRIPE_WEBHOOK_SECRET` is set in Netlify Production for the live webhook endpoint.
- [ ] `STRIPE_LIVE_API_TOKEN`, if present, matches `STRIPE_SECRET_KEY` exactly.
- [ ] `SHIPPO_API_TOKEN` is set in Netlify Production and is the live Shippo token.
- [ ] `RESEND_API_KEY` is set in Netlify Production.
- [ ] `EMAIL_FROM` is set to the real sending address/domain.
- [ ] `EMAIL_REPLY_TO` is set to a monitored inbox.
- [ ] `SITE_URL` is set to the production HTTPS site origin.
- [ ] `NETLIFY_DATABASE_URL` is set.
- [ ] `NETLIFY_DATABASE_URL_UNPOOLED` is set.
- [ ] Production env does not depend on `SHIPPO_TEST_TOKEN`.
- [ ] Production env does not use localhost or preview URLs for any customer-facing origin.

## 2. Stripe Live Mode Verification

- [ ] In Stripe Dashboard, confirm you are viewing the live account, not test mode.
- [ ] In Netlify Production env, confirm `STRIPE_SECRET_KEY` is live and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is live.
- [ ] Open the production site and go through a normal buyer path:
  - [ ] product page
  - [ ] cart
  - [ ] checkout
- [ ] Start checkout and confirm the redirect goes to a live Stripe Checkout page.
- [ ] On Stripe Checkout, confirm the charge is clearly not marked as a test payment.
- [ ] Confirm the displayed subtotal, shipping, tax, discount, and total match the checkout UI before redirect.

## 3. Stripe Live Webhook Verification

- [ ] In Stripe Dashboard, verify the live webhook endpoint points to:
  - [ ] `https://<your-production-domain>/api/webhooks/stripe`
- [ ] Confirm the webhook subscribes to `checkout.session.completed`.
- [ ] Place the first real order, then verify the event is delivered successfully in Stripe.
- [ ] Confirm there are no webhook signature errors for the live endpoint.
- [ ] If Stripe retries the same event, verify only one order exists for that checkout session.

## 4. Shippo Live Token Verification

- [ ] In Netlify Production env, confirm `SHIPPO_API_TOKEN` is present.
- [ ] Confirm the production app is not relying on `SHIPPO_TEST_TOKEN`.
- [ ] In Shippo Dashboard, confirm you are in the real account used for live labels.
- [ ] Before buying a label, verify the shipping origin, parcel setup, and service selection are valid for a real shipment.

## 5. First Live Order Test

- [ ] Choose one low-cost in-stock product.
- [ ] Open the production storefront and add the product to cart.
- [ ] Go to `/cart` and verify quantity, price, and subtotal.
- [ ] Go to `/checkout` and enter a real customer email and real deliverable shipping address.
- [ ] Verify shipping charge, tax, discount, and total before submitting payment.
- [ ] Submit payment through live Stripe Checkout using a real payment method.
- [ ] Wait for redirect back to the production success page.
- [ ] Confirm the success page resolves to a real order and does not stay stuck waiting for finalization.

## 6. Post-Purchase Verification

- [ ] Open `/admin/orders`.
- [ ] Confirm the new paid order appears in the list.
- [ ] Open `/admin/orders/<order-id>`.
- [ ] Confirm the order shows:
  - [ ] paid status
  - [ ] customer email
  - [ ] customer name
  - [ ] shipping address
  - [ ] subtotal
  - [ ] discount
  - [ ] shipping
  - [ ] tax
  - [ ] total
  - [ ] currency
- [ ] Confirm the customer-facing order page at `/order/<order-id>` loads correctly.
- [ ] Confirm the order page shows the correct payment/order state before shipping.

## 7. Database and Record Checks

- [ ] In `checkout_sessions`, confirm the new row has:
  - [ ] `stripe_checkout_session_id`
  - [ ] `subtotal_cents`
  - [ ] `discount_cents`
  - [ ] `shipping_cents`
  - [ ] `tax_cents`
  - [ ] `total_cents`
  - [ ] `currency`
- [ ] In `orders`, confirm the new row has:
  - [ ] `stripe_checkout_session_id`
  - [ ] `payment_status = paid`
  - [ ] `status` set to the expected pre-shipment state
  - [ ] customer contact fields
  - [ ] shipping address fields
  - [ ] `subtotal_cents`
  - [ ] `discount_cents`
  - [ ] `shipping_cents`
  - [ ] `tax_cents`
  - [ ] `total_cents`
  - [ ] `currency`
- [ ] In `order_items`, confirm the purchased item rows were created.
- [ ] In `shipments`, confirm a shipment row exists for the order before label purchase.
- [ ] In `email_events`, confirm order confirmation email status is recorded once.

## 8. Order Confirmation Email Verification

- [ ] Confirm the buyer receives the order confirmation email.
- [ ] Verify the email uses the production domain in links.
- [ ] Verify the email totals match the persisted order totals exactly.
- [ ] Verify the email is not using preview, localhost, or test/dev wording.
- [ ] In the order record, confirm `order_confirmation_sent_at` is populated.
- [ ] If email fails, check `last_email_error` and the matching `email_events` row.

## 9. Live Shipping Label Purchase

- [ ] From `/admin/orders/<order-id>`, open the shipping controls for the paid order.
- [ ] Retrieve rates for the real shipping address.
- [ ] Confirm the returned rates look like real carrier/service options.
- [ ] Buy one real label from admin.
- [ ] Confirm label purchase succeeds without test-mode messaging or Shippo auth errors.

## 10. Shipment Persistence Verification

- [ ] In the admin order view, confirm shipment details are now present.
- [ ] Confirm the shipment record stores:
  - [ ] `provider_rate_id`
  - [ ] `label_url`
  - [ ] `tracking_number`
  - [ ] `tracking_url`
  - [ ] `postage_amount`
  - [ ] `postage_currency`
  - [ ] `shippo_transaction_id`
  - [ ] `label_purchased_at`
- [ ] Confirm label download works from admin.
- [ ] Confirm tracking link opens a real carrier/Shippo tracking destination.

## 11. Shipping Confirmation Verification

- [ ] Do not treat label purchase alone as shipment confirmation.
- [ ] Mark the order as shipped through the normal admin order update flow.
- [ ] Confirm the buyer receives the shipping confirmation email only after shipment status changes to shipped.
- [ ] Confirm the email includes the correct tracking number and tracking URL.
- [ ] In the order record, confirm `shipping_confirmation_sent_at` is populated.
- [ ] In `email_events`, confirm the shipping email exists once and is not duplicated.

## 12. Production Safety Checks

- [ ] Confirm production `/api/dev/*` routes are not accessible.
- [ ] Confirm no test Stripe keys are present in the active production checkout flow.
- [ ] Confirm no test Shippo token is used in the production label path.
- [ ] Confirm no customer emails contain localhost, preview, or insecure HTTP links.

## 13. Rollback / Disable Steps

If payment flow is wrong:

- [ ] Remove or replace the bad `STRIPE_SECRET_KEY` in Netlify Production and redeploy to stop live checkout creation.
- [ ] Disable or correct the live Stripe webhook endpoint before retrying more orders.
- [ ] Do not place additional live orders until the first one is reconciled.

If order finalization fails:

- [ ] Check Stripe webhook delivery for `checkout.session.completed`.
- [ ] Compare the live webhook signing secret in Stripe against `STRIPE_WEBHOOK_SECRET`.
- [ ] Verify the paid session exists in Stripe before retrying fulfillment manually.

If label purchase fails:

- [ ] Do not mark the order as shipped.
- [ ] Verify `SHIPPO_API_TOKEN`, ship-from address, parcel settings, and selected rate.
- [ ] If Shippo created a chargeable transaction unexpectedly, void or correct it in Shippo before retrying.

If email delivery fails:

- [ ] Check `RESEND_API_KEY`, sender domain configuration, and `email_events`.
- [ ] Use the persisted order and shipment records as the source of truth while email is repaired.

## 14. Launch Exit Criteria

- [ ] One real order is paid successfully in live Stripe.
- [ ] One order is finalized exactly once in the database.
- [ ] One order appears correctly in admin with complete totals and address data.
- [ ] One real Shippo label is purchased and stored correctly.
- [ ] One customer order confirmation email is delivered.
- [ ] One shipping confirmation email is delivered after the order is actually marked shipped.
- [ ] Tracking and label links work from admin and the customer order flow.
