import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect } from "react";
import { expect, userEvent, within } from "storybook/test";

import Header from "@/components/layout/Header";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/uiStore";

type HeaderStoryProps = {
  sessionState: "guest" | "customer" | "admin";
  cartCount: number;
};

const customerSession: Session = {
  expires: "2999-12-31T23:59:59.999Z",
  user: {
    id: "story-user-1",
    name: "Story User",
    email: "story-user@example.com",
    role: "customer",
  },
};

const adminSession: Session = {
  expires: "2999-12-31T23:59:59.999Z",
  user: {
    id: "story-admin-1",
    name: "Story Admin",
    email: "story-admin@example.com",
    role: "admin",
  },
};

function HeaderStoryShell({ sessionState, cartCount }: HeaderStoryProps) {
  useEffect(() => {
    useUIStore.setState({ cartOpen: false });
    useCart.setState({
      items:
        cartCount > 0
          ? {
              "story-cap:snapback:adjustable": {
                productId: "story-cap-1",
                productSlug: "story-cap",
                name: "Lucky Story Cap",
                imageUrl: null,
                priceCents: 3900,
                variant: "Snapback",
                size: "Adjustable",
                quantity: cartCount,
              },
            }
          : {},
    });

    return () => {
      useUIStore.setState({ cartOpen: false });
      useCart.setState({ items: {} });
    };
  }, [cartCount]);

  const session =
    sessionState === "admin"
      ? adminSession
      : sessionState === "customer"
      ? customerSession
      : null;

  return (
    <SessionProvider session={session}>
      <Header />
    </SessionProvider>
  );
}

const meta: Meta<HeaderStoryProps> = {
  title: "Layout/Header",
  render: (args) => <HeaderStoryShell {...args} />,
  args: {
    sessionState: "guest",
    cartCount: 0,
  },
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<HeaderStoryProps>;

export const Default: Story = {};

export const CartWithItems: Story = {
  args: {
    cartCount: 3,
  },
};

export const MobileView: Story = {
  args: {
    sessionState: "customer",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const LanguageToggle: Story = {
  args: {
    sessionState: "customer",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId("header-language-es"));
    await expect(canvas.getByRole("link", { name: /tienda/i })).toBeVisible();

    await userEvent.click(canvas.getByTestId("header-language-en"));
    await expect(canvas.getByRole("link", { name: /shop/i })).toBeVisible();
  },
};
