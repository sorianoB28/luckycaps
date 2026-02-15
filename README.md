# Lucky Caps Storefront

Premium streetwear storefront for Lucky Caps built with Next.js, Tailwind CSS, and shadcn/ui.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## E2E Tests (Playwright)

Playwright browsers are installed automatically after `npm install` via the `postinstall` script (`playwright install`).

Start the app (Netlify Dev):

```bash
npx netlify dev
```

Run E2E tests (in another terminal):

```bash
npm run test:e2e
```

Optional: set a deterministic run id for repeatable cleanup namespaces.

```bash
E2E_RUN_ID=myrun npm run test:e2e
```

PowerShell:

```powershell
$env:E2E_RUN_ID="myrun"; npm run test:e2e
```

Playwright global setup now calls dev-only endpoints `GET /api/dev/e2e/ping` and
`POST /api/dev/e2e/reset` before (and after) each run to isolate E2E data.

Optional guest-review test email:

```bash
E2E_GUEST_EMAIL=e2e-guest@example.com npm run test:e2e
```

For shipping-label E2E, enable Shippo stubbing:

```bash
E2E_MODE=true npm run test:e2e
```

## E2E in CI

GitHub Actions workflow: `.github/workflows/e2e.yml`.

It runs:
1. `npm ci`
2. `npx playwright install --with-deps`
3. Starts Next dev server on `http://127.0.0.1:3000`
4. Runs `npm run test:e2e`
5. Uploads artifacts: `playwright-report/` and `test-results/`

Required GitHub repository secrets:
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `NETLIFY_DATABASE_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`

Optional secrets:
- `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` (otherwise tests fall back to user creds)
- `NETLIFY_DATABASE_URL_UNPOOLED`
- `E2E_GUEST_EMAIL`

If browser binaries are missing on your machine, run:

```bash
npx playwright install
```

If Netlify Dev is slow, run Playwright in headed/debug mode:

```bash
PWDEBUG=1 npm run test:e2e
```

PowerShell:

```powershell
$env:PWDEBUG=1; npm run test:e2e
```

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn/ui primitives (Radix)
- Zustand for cart + UI state
- framer-motion animations
- lucide-react icons

## Notes

All product data and imagery are mock placeholders. No backend integrations are included yet.

## Manual checks

- Open `/admin/orders/[id]/view` and click "Get Rates".
- Confirm the template dropdown auto-suggests a box based on item count, and selecting a template fills dimensions.
- Enter large dimensions to see USPS DIM/length warnings.
- Click "Buy Label" and confirm the shipments row updates with label + tracking info.
- Click "Download Label" and confirm it downloads as `*.pdf`.
- Refresh the page and confirm the label still downloads (archived or via fallback).
- Simulate Cloudinary failure and confirm label still downloads via Shippo + retry archive succeeds.
- Verify the stored Cloudinary `label_asset_url` ends with `.pdf`.
- Open `/order/[id]` and confirm the tracking number/link appears once present.
- Create a paid order in test mode and confirm the order confirmation email sends once (refresh/retry should not resend).
- Buy a label or mark the order as shipped and confirm the shipping confirmation email sends once.
- Temporarily set `RESEND_API_KEY` invalid and confirm orders still finalize while `email_events` records `failed` and `orders.last_email_error` is set.
