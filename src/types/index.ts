export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  tags: string[];
  description: string;
  features: string[];
  isNewDrop: boolean;
  isSale: boolean;
  variants: string[];
  sizes: string[];
  stock: number;
};

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  variant: string;
  size: string;
  quantity: number;
};
