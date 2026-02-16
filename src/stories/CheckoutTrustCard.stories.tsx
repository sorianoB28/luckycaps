import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckoutTrustCard } from "@/components/checkout/CheckoutTrustCard";

const meta: Meta<typeof CheckoutTrustCard> = {
  title: "Checkout/CheckoutTrustCard",
  component: CheckoutTrustCard,
  args: {
    title: "Checkout with confidence",
    stripeLabel: "Secure checkout powered by Stripe",
    shippingLabel: "Tracked shipping on every order",
    supportLabel: "Support: support@luckycapsshop.com",
    returnsLabel: "30-day return policy",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof CheckoutTrustCard>;

export const Default: Story = {};
