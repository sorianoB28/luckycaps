import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { expect, fn, userEvent, within } from "storybook/test";

import { WriteReviewModal } from "@/components/reviews/WriteReviewModal";

type ReviewsStoryProps = {
  isAuthenticated: boolean;
  onClose: () => void;
};

const customerSession: Session = {
  expires: "2999-12-31T23:59:59.999Z",
  user: {
    id: "review-user-1",
    name: "Review User",
    email: "review-user@example.com",
    role: "customer",
  },
};

const meta: Meta<ReviewsStoryProps> = {
  title: "Reviews/Eligibility",
  args: {
    isAuthenticated: false,
    onClose: fn(),
  },
  render: (args) => (
    <SessionProvider session={args.isAuthenticated ? customerSession : null}>
      <WriteReviewModal
        productId="story-product-1"
        productSlug="story-product"
        productName="Lucky Story Product"
        variants={["Snapback / Trucker"]}
        sizes={["Adjustable / 7 1/4+"]}
        isOpen
        onClose={args.onClose}
      />
    </SessionProvider>
  ),
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<ReviewsStoryProps>;

export const BlockedUnauthenticated: Story = {
  args: {
    isAuthenticated: false,
    onClose: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("review-modal-submit"));
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const AllowedAuthenticated: Story = {
  args: {
    isAuthenticated: true,
    onClose: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByLabelText(/5/));
    await userEvent.type(canvas.getByTestId("review-modal-title"), "Great fit");
    await userEvent.type(
      canvas.getByTestId("review-modal-body"),
      "Solid quality and clean stitching."
    );
    await userEvent.click(canvas.getByTestId("review-modal-guidelines"));
    await userEvent.click(canvas.getByTestId("review-modal-submit"));

    await expect(args.onClose).toHaveBeenCalled();
  },
};
