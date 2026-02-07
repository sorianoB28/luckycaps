export type Product = {
  id: string;
  slug: string;
  name: string;
  name_en?: string | null;
  name_es?: string | null;
  price: number;
  salePrice?: number;
  originalPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  description: string;
  description_en?: string | null;
  description_es?: string | null;
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
  size?: string;
  quantity: number;
};
