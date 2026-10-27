# LexExpress inquiry-to-payment release

This website accepts service inquiries; it does not confirm shipment acceptance, availability, quotes, bookings or payment. Keep owner approval before any commitment. Existing deployment and customer data are preserved.

## Daily operation
1. Check Customer Inquiry Portal → Inquiries in Airtable. Review every request for service, timing, route, handling requirements, vehicle capacity and availability. For urgent work use direct phone contact.
2. Check Supabase customer_inquiries as the primary source, especially if notifications appear delayed. Airtable/email is a copy; notification failure must not erase a saved inquiry. Look for sanitized Edge Function synchronization errors. Do not copy patient identifiers into either system.
3. Prepare a quote only after confirming the shipment's requirements and actual costs. State scope, total price, expiry and the applicable payment terms (immediate, after delivery, or owner-approved net 7–14). A draft is not acceptance.
4. After the actual customer and price are approved, create/review the correct Stripe invoice. Do not charge automatically, finalize/send test invoices, or mark anything paid without actual provider evidence. Live invoices/payment links were absent during this audit; merchant charging readiness and a complete payment path remain unverified.
5. Confirm payment from Stripe's invoice/payment status for prepaid work, or record the explicitly agreed credit terms. A customer success page or email alone is not proof of payment. Manually performing courier fulfillment does not require automatic paid-order fulfillment code; any later automation must consume verified payment events.

## Submission and retries
The updated browser uses one UUID per unchanged inquiry and caches only that UUID plus a SHA256 fingerprint in session storage. Raw contact details are not saved in browser storage. An uncertain response preserves the form; retyping the same inquiry after reload reuses the request ID. Changing the inquiry generates a new ID. Confirmed success clears the retry cache.

The backend uses that UUID as the primary record ID and rejects reuse for different content. Old clients without a request ID remain compatible. Airtable copies use a stable `Inquiry Subject` (`Website inquiry <UUID>`) with performUpsert; retries repair the copy without creating another record. Treat this generated subject as an immutable reference. Operator response/approval fields remain separate and are not overwritten.

Backend Airtable calls have a six-second deadline; the browser has a twelve-second deadline. A saved primary inquiry can succeed while the operator copy is pending. This does not claim notification/email delivery. Automatic durable retry after a confirmed primary save is not implemented; daily primary-queue review is the current operational fallback. There is no new distributed anti-spam/rate-limiting service; existing honeypot, origin checks and strict validation remain. These are operational limits, not a claim of enterprise abuse resistance.

## Verified 2026-10-27
- Existing production site live; all customer records retained.
- Live UI QA inquiry e9583225-c709-44de-ab5b-d7dc2f6c5d9b saved and copied to Airtable recuVELRGu2ZPTyH5. Browser visibly confirmed success.
- New backend v7 ACTIVE, public intake's existing verify_jwt=false preserved; SHA256 c73f0e7d4be00fd06359314864f60effd5796446c64bf8b3e7e5999742f55614.
- Two identical real API requests using QA UUID a4a021a7-8a5c-4a56-89b9-08f7c4b7f101 both returned201/operator_copy=saved. Exactly one Supabase row and one Airtable record (recNLT767TirIcZxC) verified. No genuine shipment/booking, quote, invoice or transaction was created.
- Browser tests at390/768/1440px passed with mocked API: lost response + reload retry, private contact-data handling, success receipt, field preservation, timeout recovery and readable feedback.
- Backend mocks passed validation, origin, honeypot, replay/conflict, operator upsert, database failure, bounded provider failure and old-client compatibility.
- RLS remains enabled and anon cannot read/insert primary records directly. Security advisor only reports intentional deny-all/no-policy intake table.

## Deployment and recovery
Work branch: release/inquiry-reliability in LexExpress612/lexexpress.github.io, based on275dea14ec05d7259877d728a03cbc9c54aa47a3. Website changes await verified Cloudflare preview/release; no website production branch merge has occurred. Existing backend v6 source is archived under supabase/history for rollback. Re-deploy that exact source only if a verified backend regression requires it; keep current credentials and public-function configuration.

Cloudflare assets exclude tests, server source, node_modules, workflow files and internal docs via .assetsignore. Do not deploy the whole development directory without these exclusions. Preview before release. No new spending, payment activation or new service account was authorized.
