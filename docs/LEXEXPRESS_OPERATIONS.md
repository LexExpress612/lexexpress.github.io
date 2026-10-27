# LexExpress inquiry-to-payment operation

The website accepts service inquiries, not confirmed bookings. Owner approval is required before a shipment, quote or payment commitment.

1. Review the primary inquiry queue and the existing operator portal. Check availability, route, vehicle capacity, timing and handling requirements. Do not store patient identifiers.
2. If a notification is delayed, check the primary queue directly. A notification failure must not erase the saved inquiry. This release does not add a durable background notification-retry service.
3. Prepare the quote after confirming scope/costs. Record the exact approved customer, price, expiry and payment terms. A draft is not customer acceptance.
4. Issue a live invoice only with the actual customer/amount/terms authorization. Verify payment in the provider record before prepaid fulfillment; explicitly approved credit terms remain a separate arrangement. Never infer payment from a success page.
5. Perform courier fulfillment only after owner acceptance and relevant operational requirements are met.

## Retry behavior
An unchanged inquiry reuses one request reference after an uncertain response or reload. Only a request UUID and a SHA256 fingerprint are cached; raw contact entries are not stored in browser storage. Confirmed success clears the cache. Changed content uses a new reference.

The primary database rejects conflicting reuse. The operator copy uses a stable generated subject for upsert, so retry can repair its copy without another record. Treat generated inquiry subjects as immutable references; owner response/approval fields remain separate.

The operator-copy request has a six-second deadline; the browser has a twelve-second deadline. A saved primary inquiry may succeed while its notification is pending. The receipt does not claim email delivery, booking acceptance or payment.

## Verified release
Public website https://lexexpressllc.com/ . PR4 merged as cf5db58ff3edf086f71d305276b61fb1c9d867d0; inquiry CI40520571575 and provider preview/production builds passed. Local Chromium/backend fault checks passed, and the released production browser workflow saved and copied a labeled test inquiry with a readable reference receipt.

Current limitations: the quote/payment journey and email inbox delivery remain unverified. No live invoice, charge, purchase or real booking was created. Keep the existing notification/manual-review fallback until separately verified automation replaces it.
