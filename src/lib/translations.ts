import { Language, useUIStore } from "@/store/uiStore";

type TranslationSet = {
  nav: { home: string; shop: string; story: string; account: string; admin: string };
  langToggle: { en: string; es: string };
  actions: {
    view: string;
    explore: string;
    shopCollection: string;
    customLab: string;
    reservePack: string;
    addToCart: string;
    addProduct: string;
    filters: string;
    sort: string;
    goToAdmin: string;
  };
  messages: {
    productNotFound: string;
  };
  badges: { newDrop: string; newDropShout: string; sale: string };
  shop: {
    title: string;
    heading: string;
    categories: string;
    priceRange: string;
    upTo: string;
    newDrop: string;
    sale: string;
    productsSuffix: string;
    newest: string;
    featured: string;
    priceLow: string;
    priceHigh: string;
  };
  product: {
    variant: string;
    size: string;
    features: string;
    fastShipping: string;
    returns: string;
    secureCheckout: string;
  };
    home: {
      heroHeadline: string;
      heroSub: string;
      heroCtaPrimary: string;
      heroCtaSecondary: string;
    heroBadge: string;
    heroStatsOne: string;
    heroStatsTwo: string;
    newDrops: string;
    freshHeading: string;
    featuredCategories: string;
    builtForEveryDrop: string;
    featuredCopy: string;
    entrepreneurTitle: string;
    entrepreneurHeading: string;
    entrepreneurCopy: string;
    reservePack: string;
    midBandOne: string;
    midBandTwo: string;
    midBandThree: string;
    luckySocial: string;
    seenOn: string;
  };
  account: {
    title: string;
    profile: string;
    orders: string;
    saved: string;
    adminAccess: string;
    wishlistEmpty: string;
    wishlistCopy: string;
    noOrders: string;
    noOrdersCopy: string;
    adminRelaxed: string;
  };
};

export const translations: Record<Language, TranslationSet> = {
  EN: {
    nav: { home: "Home", shop: "Shop", story: "Story", account: "Account", admin: "Admin" },
    langToggle: { en: "EN", es: "ES" },
    actions: {
      view: "View",
      explore: "Explore",
      shopCollection: "Shop Collection",
      customLab: "Custom",
      reservePack: "Reserve a pack",
      addToCart: "Add to Cart",
      addProduct: "Add Product",
      filters: "Filters",
      sort: "Sort",
      goToAdmin: "Go to Admin Portal",
    },
    messages: {
      productNotFound: "Product not found.",
    },
    badges: { newDrop: "New Drop", newDropShout: "NEW DROP", sale: "Sale" },
    shop: {
      title: "Shop",
      heading: "Lucky Collection",
      categories: "Categories",
      priceRange: "Price Range",
      upTo: "Up to",
      newDrop: "New Drop",
      sale: "Sale",
      productsSuffix: "products",
      newest: "Newest",
      featured: "Featured",
      priceLow: "Price Low to High",
      priceHigh: "Price High to Low",
    },
    product: {
      variant: "Variant",
      size: "Size",
      features: "Features",
      fastShipping: "Fast Shipping",
      returns: "30 Day Returns",
      secureCheckout: "Secure Checkout",
    },
    home: {
      heroHeadline: "WEAR YOUR LUCK.",
      heroSub: "Premium caps, custom embroidery, and entrepreneur packs built for late-night founders.",
      heroCtaPrimary: "Shop Collection",
      heroCtaSecondary: "Custom",
      heroBadge: "NEW DROP",
      heroStatsOne: "4.9 / 5 from 2,000+ drops",
      heroStatsTwo: "Limited batch releases weekly",
      newDrops: "New Drops",
      freshHeading: "Fresh off the press",
      featuredCategories: "Featured Categories",
      builtForEveryDrop: "Built for every drop",
      featuredCopy: "Limited runs, premium materials.",
      entrepreneurTitle: "Entrepreneur Packs",
      entrepreneurHeading: "Build your founder kit",
      entrepreneurCopy:
        "Curated packs for late-night launchers. Two caps, custom tokens, and access to the Lucky Custom Lab.",
      reservePack: "Reserve a pack",
      midBandOne: "Fast global shipping",
      midBandTwo: "Limited editions weekly",
      midBandThree: "Custom embroidery studio",
      luckySocial: "Lucky Social",
      seenOn: "Seen on the founders",
    },
    account: {
      title: "Your Lucky Hub",
      profile: "Profile",
      orders: "Orders",
      saved: "Saved items",
      adminAccess: "Admin Access",
      wishlistEmpty: "Wishlist is empty.",
      wishlistCopy: "Tap the heart on products to stash them here for later.",
      noOrders: "No orders yet.",
      noOrdersCopy: "When you check out, tracking and history will appear here.",
      adminRelaxed:
        "Manage products, inventory, and uploads from the admin dashboard. Auth is relaxed in dev mode.",
    },
  },
  ES: {
    nav: { home: "Inicio", shop: "Tienda", story: "Historia", account: "Cuenta", admin: "Admin" },
    langToggle: { en: "EN", es: "ES" },
    actions: {
      view: "Ver",
      explore: "Explorar",
      shopCollection: "Comprar Colección",
      customLab: "Custom",
      reservePack: "Reservar pack",
      addToCart: "Añadir al carrito",
      addProduct: "Añadir producto",
      filters: "Filtros",
      sort: "Ordenar",
      goToAdmin: "Ir al portal Admin",
    },
    messages: {
      productNotFound: "Producto no encontrado.",
    },
    badges: { newDrop: "Nuevo lanzamiento", newDropShout: "NUEVO LANZAMIENTO", sale: "Oferta" },
    shop: {
      title: "Tienda",
      heading: "Colección Lucky",
      categories: "Categorías",
      priceRange: "Rango de precio",
      upTo: "Hasta",
      newDrop: "Nuevo lanzamiento",
      sale: "Oferta",
      productsSuffix: "productos",
      newest: "Más nuevo",
      featured: "Destacado",
      priceLow: "Precio menor",
      priceHigh: "Precio mayor",
    },
    product: {
      variant: "Variante",
      size: "Talla",
      features: "Características",
      fastShipping: "Envío rápido",
      returns: "Devoluciones 30 días",
      secureCheckout: "Pago seguro",
    },
    home: {
      heroHeadline: "LUCE TU SUERTE.",
      heroSub: "Gorras premium, bordado personalizado y packs para emprendedores nocturnos.",
      heroCtaPrimary: "Comprar Colección",
      heroCtaSecondary: "Custom",
      heroBadge: "NUEVO LANZAMIENTO",
      heroStatsOne: "4.9 / 5 de 2,000+ drops",
      heroStatsTwo: "Lanzamientos limitados cada semana",
      newDrops: "Nuevos lanzamientos",
      freshHeading: "Recién salido",
      featuredCategories: "Categorías destacadas",
      builtForEveryDrop: "Hecho para cada drop",
      featuredCopy: "Series limitadas, materiales premium.",
      entrepreneurTitle: "Packs para emprendedores",
      entrepreneurHeading: "Arma tu kit fundador",
      entrepreneurCopy:
        "Packs seleccionados para noctámbulos. Dos gorras, tokens personalizados y acceso al Lucky Custom Lab.",
      reservePack: "Reservar pack",
      midBandOne: "Envío global rápido",
      midBandTwo: "Ediciones limitadas semanales",
      midBandThree: "Estudio de bordado personalizado",
      luckySocial: "Lucky Social",
      seenOn: "Visto en fundadores",
    },
    account: {
      title: "Tu hub Lucky",
      profile: "Perfil",
      orders: "Pedidos",
      saved: "Guardados",
      adminAccess: "Acceso Admin",
      wishlistEmpty: "Lista de deseos vacía.",
      wishlistCopy: "Toca el corazón en productos para guardarlos aquí.",
      noOrders: "Sin pedidos",
      noOrdersCopy: "Cuando compres, el seguimiento y el historial aparecerán aquí.",
      adminRelaxed:
        "Administra productos e inventario desde el panel. La autenticación está relajada en modo dev.",
    },
  },
};

export const getTranslation = (language: Language) =>
  translations[language] ?? translations.EN;

export function useTranslations() {
  const language = useUIStore((state) => state.language);
  return getTranslation(language);
}
