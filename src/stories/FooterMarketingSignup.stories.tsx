import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import FooterClient from "@/components/layout/FooterClient";
import type { DynamicCategory } from "@/lib/categories";

const categories: DynamicCategory[] = [
  { key: "snapbacks", slug: "snapbacks", count: 5 },
  { key: "fitted", slug: "fitted", count: 3 },
  { key: "trucker", slug: "trucker", count: 2 },
];

const meta: Meta<typeof FooterClient> = {
  title: "Layout/Footer",
  component: FooterClient,
  args: {
    categories,
  },
  render: (args) => (
    <div className="mx-auto max-w-7xl">
      <FooterClient {...args} />
    </div>
  ),
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FooterClient>;

async function submitSignup(canvasElement: HTMLElement, email: string) {
  const canvas = within(canvasElement);
  await userEvent.clear(canvas.getByTestId("marketing-email-input"));
  await userEvent.type(canvas.getByTestId("marketing-email-input"), email);
  await userEvent.click(canvas.getByTestId("marketing-consent"));
  await userEvent.click(canvas.getByTestId("marketing-submit"));
}

export const Success: Story = {
  parameters: {
    fetchMock: {
      handlers: [
        {
          method: "POST",
          url: "/api/marketing/subscribe",
          json: { ok: true, alreadySubscribed: false },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await submitSignup(canvasElement, "story-success@example.com");
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("marketing-status")).toHaveAttribute(
      "data-state",
      "success"
    );
  },
};

export const CategoriesPresent: Story = {
  args: {
    categories,
  },
};

export const NoDynamicCategories: Story = {
  args: {
    categories: [],
  },
};

export const Duplicate: Story = {
  parameters: {
    fetchMock: {
      handlers: [
        {
          method: "POST",
          url: "/api/marketing/subscribe",
          json: { ok: true, alreadySubscribed: true },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await submitSignup(canvasElement, "story-duplicate@example.com");
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("marketing-status")).toHaveAttribute(
      "data-state",
      "duplicate"
    );
  },
};

export const Error: Story = {
  parameters: {
    fetchMock: {
      handlers: [
        {
          method: "POST",
          url: "/api/marketing/subscribe",
          status: 500,
          json: { ok: false, error: "Unable to subscribe" },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await submitSignup(canvasElement, "story-error@example.com");
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("marketing-status")).toHaveAttribute(
      "data-state",
      "error"
    );
  },
};

export const LoadingThenSuccess: Story = {
  parameters: {
    fetchMock: {
      handlers: [
        {
          method: "POST",
          url: "/api/marketing/subscribe",
          delayMs: 900,
          json: { ok: true, alreadySubscribed: false },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await submitSignup(canvasElement, "story-loading@example.com");
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("marketing-submit")).toBeDisabled();
    const status = await canvas.findByTestId("marketing-status");
    await expect(status).toHaveAttribute(
      "data-state",
      "success"
    );
  },
};
