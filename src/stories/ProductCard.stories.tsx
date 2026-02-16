import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

type ProductCardStoryProps = {
  product: Product;
  listMode?: boolean;
};

const baseProduct: Product = {
  id: "story-product-1",
  slug: "story-cap",
  name: "Lucky Core Cap",
  name_en: "Lucky Core Cap",
  name_es: "Gorra Lucky Core",
  price: 39.0,
  salePrice: undefined,
  originalPrice: undefined,
  images: [],
  category: "snapbacks",
  tags: [],
  description: "Structured badge-style cap built for daily wear.",
  description_en: "Structured badge-style cap built for daily wear.",
  description_es: "Gorra estructurada estilo badge para uso diario.",
  features: [],
  isNewDrop: false,
  isSale: false,
  variants: ["Snapback"],
  sizes: ["Adjustable"],
  stock: 20,
};

const meta: Meta<ProductCardStoryProps> = {
  title: "Products/ProductCard",
  render: (args) =>
    args.listMode ? (
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        <ProductCard product={args.product} />
        <ProductCard
          product={{ ...args.product, id: `${args.product.id}-2`, slug: `${args.product.slug}-2` }}
        />
        <ProductCard
          product={{ ...args.product, id: `${args.product.id}-3`, slug: `${args.product.slug}-3` }}
        />
      </div>
    ) : (
      <div className="mx-auto max-w-sm">
        <ProductCard product={args.product} />
      </div>
    ),
  args: {
    product: baseProduct,
    listMode: false,
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<ProductCardStoryProps>;

export const Normal: Story = {};

export const Sale: Story = {
  args: {
    product: {
      ...baseProduct,
      price: 29.0,
      originalPrice: 45.0,
      isSale: true,
      salePrice: 29.0,
    },
  },
};

export const NewDrop: Story = {
  args: {
    product: {
      ...baseProduct,
      isNewDrop: true,
    },
  },
};

export const OutOfStock: Story = {
  args: {
    product: {
      ...baseProduct,
      stock: 0,
    },
  },
};

export const LongContentTruncation: Story = {
  args: {
    product: {
      ...baseProduct,
      name: "Lucky Signature Neon Structured Snapback with Extended Streetwear Identity Capsule Title",
      description:
        "Handcrafted emblem cap with a long narrative description designed to test truncation behavior in card layouts across desktop and mobile without breaking grid rhythm.",
      description_en:
        "Handcrafted emblem cap with a long narrative description designed to test truncation behavior in card layouts across desktop and mobile without breaking grid rhythm.",
    },
  },
};

export const ProductList: Story = {
  args: {
    product: baseProduct,
    listMode: true,
  },
};
