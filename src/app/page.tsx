import HomePageClient from "@/components/home/HomePageClient";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import { getProducts, type Product as ApiProduct } from "@/lib/api";
import { getCategoriesFromProducts, type CategoryInfo } from "@/lib/categories";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { Product } from "@/types";

const NEW_DROPS_LIMIT = 6;

const mapApiProductToUiProduct = (item: ApiProduct): Product => {
  const image = item.image_url ? buildCloudinaryCardUrl(item.image_url) : "";
  
  const sizes = sortSizes(
    (item.sizes ?? [])
      .filter((s): s is string => s != null)
      .map((s) => normalizeSize(s))
      .filter((s): s is string => Boolean(s))
  );

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    price:
      item.is_sale && item.sale_price_cents != null
        ? item.sale_price_cents / 100
        : item.price_cents / 100,
    salePrice: item.sale_price_cents != null ? item.sale_price_cents / 100 : undefined,
    originalPrice: item.original_price_cents != null ? item.original_price_cents / 100 : undefined,
    images: image ? [image] : [],
    category: item.category,
    tags: item.tags ?? [],
    description: item.description ?? "",
    features: item.features ?? [],
    isNewDrop: item.is_new_drop,
    isSale: item.is_sale,
    variants: [],
    sizes,
    stock: item.stock,
  };
};

const sortByCreatedDesc = (a: ApiProduct, b: ApiProduct) =>
  new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

export default async function HomePage() {
  let newDrops: Product[] = [];
  let categories: CategoryInfo[] = [];

  try {
    const products = await getProducts();
    categories = getCategoriesFromProducts(products);
    newDrops = products
      .filter((product) => product.is_new_drop)
      .sort(sortByCreatedDesc)
      .slice(0, NEW_DROPS_LIMIT)
      .map(mapApiProductToUiProduct);
  } catch (err) {
    // Leave newDrops empty on error to avoid breaking the home page.
    console.error("Failed to load new drops", err);
  }

  return <HomePageClient newDrops={newDrops} categories={categories} />;
}
