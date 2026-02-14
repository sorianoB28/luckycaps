import FooterClient from "@/components/layout/FooterClient";
import { getActiveProductCategories } from "@/lib/categories.server";

export default async function Footer() {
  const categories = await getActiveProductCategories();
  return <FooterClient categories={categories} />;
}
