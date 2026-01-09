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
