import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import {
  CheckoutSummaryCard,
  type CheckoutSummaryFallbackItem,
  type CheckoutSummaryQuote,
} from "@/components/checkout/CheckoutSummaryCard";

type CheckoutSummaryStoryProps = {
  quote: CheckoutSummaryQuote | null;
  fallbackItems: CheckoutSummaryFallbackItem[];
  promo: string;
  promoApplying: boolean;
  appliedPromo: { promo_code_id: string; normalized_code: string } | null;
  promoError: string | null;
  quoteError: string | null;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  onRetryQuote: () => void;
};

const quoteBase: CheckoutSummaryQuote = {
  subtotal_cents: 7800,
  discount_cents: 0,
  tax_rate: 0.07,
  shipping_cents: 600,
  shipping_status: "selected",
  shipping_display: "$6.00",
  tax_cents: 546,
  total_cents: 8946,
  total_status: "ready",
  total_display: "$89.46",
  items: [
    {
      product_id: "story-product-1",
      product_slug: "story-cap",
      name: "Lucky Core Snapback",
      image_url: null,
      price_cents: 3900,
      quantity: 2,
      variant: "Snapback",
      size: "Adjustable",
    },
  ],
};

const fallbackItems: CheckoutSummaryFallbackItem[] = [
  {
    key: "story-cap:snapback:adjustable",
    name: "Lucky Core Snapback",
    imageUrl: null,
    variant: "Snapback",
    size: "Adjustable",
    quantity: 1,
  },
];

const meta: Meta<CheckoutSummaryStoryProps> = {
  title: "Checkout/CheckoutSummary",
  render: (args) => (
    <div className="mx-auto max-w-[360px]">
      <CheckoutSummaryCard
        quote={args.quote}
        fallbackItems={args.fallbackItems}
        promo={args.promo}
        onPromoChange={fn()}
        promoApplying={args.promoApplying}
        appliedPromo={args.appliedPromo}
        promoError={args.promoError}
        quoteError={args.quoteError}
        onApplyPromo={args.onApplyPromo}
        onRemovePromo={args.onRemovePromo}
        onRetryQuote={args.onRetryQuote}
      />
    </div>
  ),
  args: {
    quote: quoteBase,
    fallbackItems,
    promo: "",
    promoApplying: false,
    appliedPromo: null,
    promoError: null,
    quoteError: null,
    onApplyPromo: fn(),
    onRemovePromo: fn(),
    onRetryQuote: fn(),
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<CheckoutSummaryStoryProps>;

export const Loading: Story = {
  args: {
    quote: null,
    fallbackItems,
  },
};

export const QuoteSuccess: Story = {
  args: {
    quote: quoteBase,
  },
};

export const QuoteError: Story = {
  args: {
    quote: null,
    quoteError: "Unable to calculate totals right now.",
  },
};

export const PromoApplied: Story = {
  args: {
    quote: {
      ...quoteBase,
      discount_cents: 100,
      tax_cents: 539,
      total_cents: 8839,
      total_display: "$88.39",
    },
    appliedPromo: { promo_code_id: "story-promo", normalized_code: "LUCKY1" },
    promo: "LUCKY1",
  },
};

export const PromoInvalid: Story = {
  args: {
    quote: quoteBase,
    promo: "INVALID",
    promoError: "Promo code is invalid or inactive.",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("checkout-promo-apply"));
    await expect(args.onApplyPromo).toHaveBeenCalled();
  },
};
