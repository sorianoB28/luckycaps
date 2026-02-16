import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DropdownStoryProps = {
  initialOpen: boolean;
  longList: boolean;
  interactive: boolean;
};

function DemoDropdown({ initialOpen, longList, interactive }: DropdownStoryProps) {
  const [open, setOpen] = useState(initialOpen);
  const items = longList
    ? Array.from({ length: 20 }, (_, idx) => `Category ${idx + 1}`)
    : ["Featured", "Newest", "Price: Low to High", "Price: High to Low"];

  return (
    <DropdownMenu
      modal={false}
      open={interactive ? open : initialOpen}
      onOpenChange={interactive ? setOpen : undefined}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Sort</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={longList ? "max-h-64 overflow-y-auto" : ""}>
        {items.map((label, idx) => (
          <div key={label}>
            <DropdownMenuItem>{label}</DropdownMenuItem>
            {idx === 1 ? <DropdownMenuSeparator /> : null}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const meta: Meta<DropdownStoryProps> = {
  title: "UI/Dropdown",
  render: (args) => <DemoDropdown {...args} />,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<DropdownStoryProps>;

export const Closed: Story = {
  args: {
    initialOpen: false,
    longList: false,
    interactive: false,
  },
};

export const Open: Story = {
  args: {
    initialOpen: true,
    longList: false,
    interactive: false,
  },
};

export const LongList: Story = {
  args: {
    initialOpen: true,
    longList: true,
    interactive: false,
  },
};

export const OpenAndCloseInteraction: Story = {
  args: {
    initialOpen: false,
    longList: false,
    interactive: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const trigger = canvas.getByRole("button", { name: /sort/i });
    await expect(trigger).toBeVisible();
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveStyle({ pointerEvents: "auto" });
    await expect(body.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    await expect(body.getByRole("menu")).toBeVisible();
    await expect(body.getByRole("menuitem", { name: "Featured" })).toBeVisible();

    await userEvent.click(trigger);
    await expect(body.queryByRole("menu")).not.toBeInTheDocument();
  },
};
