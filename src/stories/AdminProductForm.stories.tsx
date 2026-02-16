import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ProductForm, type ProductFormStoryState } from "@/app/admin/components/ProductForm";
import type { Product } from "@/types";

type ProductFormStoryProps = {
  initialProduct?: Product;
  submitLabel: string;
  storyState?: ProductFormStoryState;
  onSubmit: (values: unknown) => void;
};

const sampleProduct: Product = {
  id: "story-product-1",
  slug: "story-cap",
  name: "Story Cap",
  price: 39.99,
  salePrice: 32.99,
  originalPrice: 49.99,
  images: [],
  category: "snapbacks",
  tags: [],
  description: "A sample product used for Storybook state previews.",
  features: [],
  isNewDrop: true,
  isSale: true,
  variants: [],
  sizes: ["S/M", "M/L"],
  stock: 12,
};

const meta: Meta<ProductFormStoryProps> = {
  title: "Admin/AdminProductForm",
  args: {
    submitLabel: "Save Product",
    onSubmit: fn(),
  },
  render: (args) => (
    <div className="mx-auto max-w-5xl">
      <ProductForm
        initialProduct={args.initialProduct}
        onSubmit={args.onSubmit}
        submitLabel={args.submitLabel}
        storyState={args.storyState}
      />
    </div>
  ),
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<ProductFormStoryProps>;

export const Empty: Story = {
  args: {
    initialProduct: undefined,
    storyState: undefined,
    onSubmit: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const submitButton = canvas.getByRole("button", { name: /save product/i });
    const nameInput = canvas.getByLabelText(/name/i) as HTMLInputElement;
    const slugInput = canvas.getByLabelText(/slug/i) as HTMLInputElement;

    await userEvent.click(submitButton);
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(nameInput.validity.valueMissing).toBe(true);
    await expect(slugInput.validity.valueMissing).toBe(true);
  },
};

export const Error: Story = {
  args: {
    initialProduct: sampleProduct,
    onSubmit: fn(),
    storyState: {
      uploadErrors: ["Cloudinary upload failed. Check CLOUDINARY_* variables."],
      uploadStatuses: [
        {
          name: "drop-preview.png",
          status: "failed",
          message: "Upload failed (status 500)",
        },
      ],
    },
  },
};

export const Loading: Story = {
  args: {
    initialProduct: sampleProduct,
    onSubmit: fn(),
    storyState: {
      uploading: true,
      uploadStatuses: [
        {
          name: "drop-preview.png",
          status: "uploading",
        },
      ],
    },
  },
};
