"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Loader2,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ThumbsUp,
  Truck,
} from "lucide-react";

import {
  createReview,
  getProductBySlug,
  getReviews,
  type ProductDetailResponse,
  type Review,
  type ReviewsSummary,
  voteHelpful,
} from "@/lib/api";
import { useCart } from "@/store/cart";
import { ProductImageWithFallback } from "@/components/products/ProductImageWithFallback";
import { getPlaceholderImages } from "@/lib/placeholderImages";
import { StarRating } from "@/components/reviews/StarRating";
import { formatCategory } from "@/lib/formatCategory";
import { useT } from "@/components/providers/LanguageProvider";

type ProductPageProps = {
  params: { slug: string };
};

type SortKey = "recent" | "high" | "low" | "helpful";

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatReviewDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const makeVoterKey = () =>
  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `voter_${Math.random().toString(36).slice(2)}`);

export default function ProductPage({ params }: ProductPageProps) {
  const t = useT();
  const router = useRouter();
  const addToCart = useCart((s) => s.addItem);
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  
  // FIXED: Changed HTMLSectionElement to HTMLElement
  const reviewsAnchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProductBySlug(params.slug)
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setVariant(res.variants[0]?.name ?? null);
        setSize(res.sizes[0]?.name ?? null);
        setSelectedImage(res.images[0]?.url ?? res.product.image_url ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        if ((err as Error).message.includes("404")) {
          setError(t("product.productNotFound"));
        } else {
          setError(t("product.unableToLoadProduct"));
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [params.slug]);

  const placeholderImages = useMemo(
    () =>
      data
        ? getPlaceholderImages(data.product.category, data.product.slug, 4)
        : [],
    [data?.product.category, data?.product.slug]
  );

  const galleryImages = useMemo(
    () => data?.images.map((img) => img.url).filter(Boolean) ?? [],
    [data?.images]
  );

  const requiresSizeSelection = useMemo(
    () => (data?.sizes?.length ?? 0) > 0,
    [data?.sizes?.length ?? 0]
  );

  const priceInfo = useMemo(() => {
    if (!data) {
      return { current: 0, original: null as number | null, onSale: false };
    }
    const onSale =
      data.product.is_sale && data.product.sale_price_cents != null;
    const current = onSale
      ? data.product.sale_price_cents!
      : data.product.price_cents;
    const original = onSale
      ? data.product.original_price_cents ?? data.product.price_cents
      : null;
    return { current, original, onSale };
  }, [data]);

  const primaryImage =
    selectedImage ??
    displayImage ??
    galleryImages[0] ??
    data?.product.image_url ??
    placeholderImages[0] ??
    null;

  const handleAddToCart = () => {
    if (!data) return;
    if (requiresSizeSelection && !size) return;
    addToCart({
      productId: data.product.id,
      productSlug: data.product.slug,
      name: data.product.name,
      imageUrl: primaryImage,
      priceCents: priceInfo.current,
      variant,
      size,
      quantity,
    });
  };

  const scrollToReviews = () => {
    reviewsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-white/70">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading product...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-xl font-semibold text-white">{error ?? t("product.productNotFound")}</p>
        <p className="mt-2 text-white/70">{t("product.tryOtherProducts")}</p>
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-lucky-green hover:text-lucky-green"
            onClick={() => router.push("/shop")}
          >
            Back to shop
          </button>
        </div>
      </div>
    );
  }

  const thumbs = galleryImages.length
    ? galleryImages
    : placeholderImages.filter(Boolean);
  const addToCartDisabled =
    (data?.product.stock ?? 0) === 0 || (requiresSizeSelection && !size);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <ProductImageWithFallback
              src={primaryImage}
              alt={data.product.name}
              category={data.product.category}
              slug={data.product.slug}
              className="h-full w-full object-cover"
              fallbacks={placeholderImages}
              onSrcChange={setDisplayImage}
            />
          </div>
          {thumbs.length ? (
            <div className="grid grid-cols-4 gap-3">
              {thumbs.map((thumb) => (
                <button
                  key={thumb}
                  type="button"
                  onClick={() => setSelectedImage(thumb)}
                  className={`overflow-hidden rounded-xl border ${
                    primaryImage === thumb
                      ? "border-lucky-green shadow-[0_0_0_2px_rgba(104,240,160,0.3)]"
                      : "border-white/10"
                  }`}
                >
                  <ProductImageWithFallback
                    src={thumb}
                    alt={`${data.product.name} thumbnail`}
                    category={data.product.category}
                    slug={data.product.slug}
                    className="h-20 w-full object-cover"
                    fallbacks={placeholderImages}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.15em] text-white/70">
                {formatCategory(data.product.category)}
              </span>
              {data.product.is_new_drop ? (
                <span className="rounded-full bg-lucky-green px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lucky-darker">
                  New Drop
                </span>
              ) : null}
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl leading-tight">{data.product.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <StarRating value={data.reviewSummary.avgRating ?? 0} readOnly allowHalf />
                <span className="font-semibold">
                  {(data.reviewSummary.avgRating ?? 0).toFixed(1)}
                </span>
                <span>({data.reviewSummary.count} reviews)</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-3xl font-semibold text-white">
                  {formatPrice(priceInfo.current)}
                </p>
                {priceInfo.onSale && priceInfo.original ? (
                  <p className="text-sm text-white/50 line-through">
                    {formatPrice(priceInfo.original)}
                  </p>
                ) : null}
                {priceInfo.onSale ? (
                  <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    Sale
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-white/75">{data.product.description}</p>
            </div>

            {data.variants.length ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white/80">{t("product.variant")}</p>
                <div className="flex flex-wrap gap-2">
                  {data.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v.name)}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        variant === v.name
                          ? "border border-lucky-green bg-lucky-green/15 text-lucky-green"
                          : "border border-white/15 bg-white/5 text-white hover:border-white/40"
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {data.sizes.length ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white/80">{t("product.size")}</p>
                <div className="flex flex-wrap gap-2">
                  {data.sizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.name)}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        size === s.name
                          ? "border border-lucky-green bg-lucky-green/15 text-lucky-green"
                          : "border border-white/15 bg-white/5 text-white hover:border-white/40"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center rounded-full border border-white/15 bg-black/30 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="rounded-full p-1 text-white transition hover:bg-white/10"
                    aria-label={t("product.decreaseQuantityAria")}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[40px] text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        data.product.stock ? Math.min(data.product.stock, q + 1) : q + 1
                      )
                    }
                    className="rounded-full p-1 text-white transition hover:bg-white/10"
                    aria-label={t("product.increaseQuantityAria")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-lucky-green px-4 py-3 font-semibold text-lucky-darker transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={addToCartDisabled}
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  aria-label={t("product.addToWishlistAria")}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-white/40 hover:bg-white/5"
                >
                  <Heart className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={scrollToReviews}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-lucky-green hover:text-lucky-green"
              >
                Reviews
              </button>
              {data.product.features?.length ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white/80">{t("shop.highlights")}</p>
                  <ul className="mt-3 space-y-2 text-sm text-white/70">
                    {data.product.features.map((feature, idx) => (
                      <li key={`${feature}-${idx}`} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-lucky-green" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <Truck className="h-5 w-5 text-lucky-green" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{t("product.fastShipping")}</p>
                  <p className="text-xs text-white/60">{t("product.fastShippingCopy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <ShieldCheck className="h-5 w-5 text-lucky-green" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{t("product.easyReturns")}</p>
                  <p className="text-xs text-white/60">{t("product.easyReturnsCopy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <Package className="h-5 w-5 text-lucky-green" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{t("product.secureCheckout")}</p>
                  <p className="text-xs text-white/60">{t("product.secureCheckoutCopy")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductReviews
        anchorRef={reviewsAnchorRef as RefObject<HTMLElement>}
        productId={data.product.id}
        productSlug={data.product.slug}
        initialReviews={data.reviews}
        initialSummary={data.reviewSummary}
        selectedVariant={variant}
        selectedSize={size}
      />
    </div>
  );
}

type ProductReviewsProps = {
  productId: string;
  productSlug: string;
  initialReviews: Review[];
  initialSummary: { count: number; avgRating: number | null };
  selectedVariant: string | null;
  selectedSize: string | null;
  anchorRef: RefObject<HTMLElement>;
};

function ProductReviews({
  productId,
  productSlug,
  initialReviews,
  initialSummary,
  selectedVariant,
  selectedSize,
  anchorRef,
}: ProductReviewsProps) {
  const t = useT();
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [summary, setSummary] = useState<ReviewsSummary>({
    avg_rating: initialSummary?.avgRating ?? null,
    review_count: initialSummary?.count ?? 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formAuthorName, setFormAuthorName] = useState("");
  const [formAuthorEmail, setFormAuthorEmail] = useState("");
  const [formVariant, setFormVariant] = useState(selectedVariant ?? "");
  const [formSize, setFormSize] = useState(selectedSize ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voterKey, setVoterKey] = useState<string | null>(null);
  const [helpfulPending, setHelpfulPending] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<SortKey>("recent");
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    setReviews(initialReviews ?? []);
    setSummary({
      avg_rating: initialSummary?.avgRating ?? null,
      review_count: initialSummary?.count ?? 0,
    });
  }, [initialReviews, initialSummary]);

  useEffect(() => {
    if (!formVariant && selectedVariant) {
      setFormVariant(selectedVariant);
    }
  }, [selectedVariant, formVariant]);

  useEffect(() => {
    if (!formSize && selectedSize) {
      setFormSize(selectedSize);
    }
  }, [selectedSize, formSize]);

  useEffect(() => {
    if (!showReviewModal) {
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  }, [showReviewModal]);

  useEffect(() => {
    if (showReviewModal) {
      setFormVariant(selectedVariant ?? "");
      setFormSize(selectedSize ?? "");
    }
  }, [showReviewModal, selectedVariant, selectedSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("lc_voter_key");
    if (stored) {
      setVoterKey(stored);
    } else {
      const key = makeVoterKey();
      localStorage.setItem("lc_voter_key", key);
      setVoterKey(key);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await getReviews(productSlug);
        if (cancelled) return;
        setReviews(res.reviews);
        setSummary(res.summary);
      } catch {
        if (cancelled) return;
        setReviewsError(t("reviews.unableToLoadReviews"));
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  const sortedReviews = useMemo(() => {
    const copy = [...reviews];
    switch (sort) {
      case "high":
        return copy.sort((a, b) => b.rating - a.rating);
      case "low":
        return copy.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return copy.sort((a, b) => b.helpful_count - a.helpful_count);
      default:
        return copy.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }
  }, [reviews, sort]);

  const distribution = useMemo(() => {
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => Math.round(r.rating) === star).length;
      return { star, count, pct: (count / total) * 100 };
    });
  }, [reviews]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (
      !formRating ||
      !formTitle.trim() ||
      !formBody.trim() ||
      !formAuthorEmail.trim()
    ) {
      setSubmitError(t("reviews.errors.requiredWithEmail"));
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        product_id: productId,
        product_slug: productSlug,
        rating: formRating,
        title: formTitle.trim(),
        body: formBody.trim(),
        author_email: formAuthorEmail.trim(),
        author_name: formAuthorName.trim() || undefined,
        variant: formVariant.trim() || undefined,
        size: formSize.trim() || undefined,
        images: [],
      });
      setSubmitSuccess(t("reviews.thanks"));
      setFormRating(0);
      setFormTitle("");
      setFormBody("");
      setFormAuthorName("");
      setFormAuthorEmail("");
      setFormVariant(selectedVariant ?? "");
      setFormSize(selectedSize ?? "");
      const refreshed = await getReviews(productSlug);
      setReviews(refreshed.reviews);
      setSummary(refreshed.summary);
      setShowReviewModal(false);
    } catch (err) {
      setSubmitError((err as Error).message || t("reviews.unableToSubmitReview"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    const key =
      voterKey ??
      (() => {
        const generated = makeVoterKey();
        if (typeof window !== "undefined") {
          localStorage.setItem("lc_voter_key", generated);
        }
        setVoterKey(generated);
        return generated;
      })();

    setHelpfulPending((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await voteHelpful(reviewId, key);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, helpful_count: res.helpful_count } : r
        )
      );
    } catch {
      // ignore errors, keep UI unchanged
    } finally {
      setHelpfulPending((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  return (
    <section
      ref={anchorRef}
      className="mt-12 space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-3xl text-white">{t("reviews.title")}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <StarRating value={summary.avg_rating ?? 0} readOnly allowHalf />
            <span className="font-semibold">
              {(summary.avg_rating ?? 0).toFixed(1)}
            </span>
            <span>{t("reviews.totalCount", { count: summary.review_count })}</span>
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
              <span className="text-white/60">{t("shop.sort")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                <option value="recent">{t("reviews.sortOptions.recent")}</option>
                <option value="high">{t("reviews.sortOptions.high")}</option>
                <option value="low">{t("reviews.sortOptions.low")}</option>
                <option value="helpful">{t("reviews.sortOptions.helpful")}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-lucky-green px-4 py-2 text-sm font-semibold text-lucky-darker transition hover:brightness-110"
            >
              {t("reviews.writeReview")}
            </button>
          </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-white/70">{t("reviews.ratingBreakdown")}</p>
          {distribution.map((item) => (
            <div key={item.star} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-white/70">{item.star}</span>
              <div className="h-2 flex-1 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-lucky-green"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-white/50">{item.count}</span>
            </div>
          ))}
          {reviewsError ? (
            <p className="text-sm text-red-400">{reviewsError}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("reviews.loadingReviews")}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-6 text-center text-white/70">
              <p className="font-semibold text-white">{t("reviews.noneYetTitle")}</p>
              <p className="text-sm text-white/60">{t("reviews.noneYetCopy")}</p>
            </div>
          ) : (
            sortedReviews.map((review) => (
              <article
                key={review.id}
                className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StarRating value={review.rating} readOnly />
                    <p className="text-sm text-white/60">
                      {formatReviewDate(review.created_at)}
                    </p>
                  </div>
                  <span className="text-xs text-white/60">
                    {review.author_name || t("reviews.anonymous")}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-white">{review.title}</h4>
                <p className="text-sm text-white/80 whitespace-pre-line">
                  {review.body}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                  {review.variant ? (
                    <span>{t("reviews.variantValue", { value: review.variant })}</span>
                  ) : null}
                  {review.size ? <span>{t("reviews.sizeValue", { value: review.size })}</span> : null}
                  {review.verified_purchase ? (
                    <span className="rounded-full bg-lucky-green/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-lucky-green">
                      {t("reviews.verifiedPurchase")}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <button
                    type="button"
                    onClick={() => handleHelpful(review.id)}
                    disabled={helpfulPending[review.id]}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>{t("reviews.helpful")}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">
                      {review.helpful_count}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-white/50 transition hover:text-white"
                    aria-label={t("product.reportReviewAria")}
                  >
                    {t("reviews.report")}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {showReviewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-lucky-dark/90 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl text-white">{t("reviews.modalTitle")}</h3>
                <p className="text-sm text-white/60">{t("reviews.shareExperience")}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-sm text-white hover:border-white/40"
                onClick={() => setShowReviewModal(false)}
              >
                {t("common.close")}
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm text-white/80">{t("reviews.ratingLabel")}</label>
                <StarRating value={formRating} onChange={setFormRating} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/80">{t("reviews.titleLabel")}</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                  placeholder={t("reviews.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/80">{t("reviews.reviewLabel")}</label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                  rows={4}
                  placeholder={t("reviews.reviewPlaceholder")}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-white/80">{t("reviews.yourNameLabel")}</label>
                  <input
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                    placeholder={t("reviews.namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">{t("auth.emailLabel")}</label>
                  <input
                    type="email"
                    value={formAuthorEmail}
                    onChange={(e) => setFormAuthorEmail(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                    placeholder={t("auth.emailPlaceholder")}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-white/80">{t("reviews.variantLabel")}</label>
                  <input
                    value={formVariant}
                    onChange={(e) => setFormVariant(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                    placeholder={t("reviews.variantPlaceholderShort")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/80">{t("reviews.sizeLabel")}</label>
                  <input
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
                    placeholder={t("reviews.sizePlaceholder")}
                  />
                </div>
              </div>
              {submitError ? (
                <p className="text-sm text-red-400">{submitError}</p>
              ) : null}
              {submitSuccess ? (
                <p className="text-sm text-lucky-green">{submitSuccess}</p>
              ) : null}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-lucky-green px-4 py-2.5 font-semibold text-lucky-darker transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? t("common.submitting") : t("reviews.submit")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
