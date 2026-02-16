import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthNotice } from "@/components/auth/AuthNotice";

const meta: Meta<typeof AuthNotice> = {
  title: "Auth/AuthNotice",
  component: AuthNotice,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof AuthNotice>;

export const AuthRequired: Story = {
  args: {
    status: "info",
    title: "Sign in required",
    body: "Please sign in to access your account.",
  },
};

export const AdminRequired: Story = {
  args: {
    status: "error",
    title: "Admin access required",
    body: "You need admin access to continue.",
  },
};

export const SessionExpired: Story = {
  args: {
    status: "error",
    title: "Session expired",
    body: "Sign in again to continue.",
  },
};

export const Loading: Story = {
  args: {
    status: "loading",
    title: "Checking credentials",
    body: "Hold tight while we verify your session.",
  },
};
