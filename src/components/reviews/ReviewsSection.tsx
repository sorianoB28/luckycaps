"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Review, useReviewsStore } from "@/store/reviewsStore";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";
import { WriteReviewModal } from "./WriteReviewModal";
import { ThumbsUp, ChevronDown, Filter } from "lucide-react";

type SortKey = "recent" | "high" | "low" | "helpful";

interface ReviewsSectionProps {
  productId: string;
  productSlug: string;
  productName: string;
  variants?: string[];
  sizes?: string[];
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function ReviewsSection({
  productId,
  productSlug,
  productName,
  variants,
  sizes,
}: ReviewsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const { reviews, markHelpful, unmarkHelpful, reportReview, hasUserVoted, setHelpfulVote } =
    useReviewsStore();
  const productReviews = reviews[productSlug] ?? [];
  const [sort, setSort] = useState<SortKey>("recent");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (searchParams?.get("review") === "open" && isAuthed) {
      setIsModalOpen(true);
    }
  }, [isAuthed, searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSortOpen(false);
        setFilterOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!selectedStars.length) return productReviews;
    return productReviews.filter((r) => selectedStars.includes(Math.round(r.rating)));
  }, [productReviews, selectedStars]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "high":
        return copy.sort((a, b) => b.rating - a.rating);
      case "low":
        return copy.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return copy.sort((a, b) => b.helpfulCount - a.helpfulCount);
      default:
        return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [filtered, sort]);

  const average = filtered.length
    ? filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = filtered.filter((r) => Math.round(r.rating) === star).length;
    return { star, count, pct: filtered.length ? (count / filtered.length) * 100 : 0 };
  });

  const handleWrite = () => {
    if (!isAuthed) {
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(`${pathname}?review=open`)}`);
      return;
    }
    setIsModalOpen(true);
  };

  const userKey = session?.user?.email ?? "";

  return (
    <section className="mt-12 space-y-6">
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Customer Reviews</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
              <StarRating value={average} readOnly allowHalf />
              <span className="font-semibold">{average ? average.toFixed(1) : "0.0"}</span>
              <span>
                ({filtered.length} / {productReviews.length} reviews)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((p) => !p)}
                className="flex h-10 items-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white transition hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-lucky-green"
              >
                Sort:{" "}
                <span className="font-semibold capitalize">
                  {sort === "recent"
                    ? "Most recent"
                    : sort === "high"
                    ? "Highest rating"
                    : sort === "low"
                    ? "Lowest rating"
                    : "Most helpful"}
                </span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>
              {sortOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-lucky-dark text-sm text-white shadow-2xl">
                  {[
                    ["recent", "Most recent"],
                    ["high", "Highest rating"],
                    ["low", "Lowest rating"],
                    ["helpful", "Most helpful"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSort(key as SortKey);
                        setSortOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left transition hover:bg-white/10"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((p) => !p)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition",
                  selectedStars.length
                    ? "border-lucky-green bg-lucky-green/10 text-lucky-green"
                    : "border-white/20 bg-white/5 text-white hover:border-white/40"
                )}
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {selectedStars.length ? (
                  <span className="ml-1 rounded-full bg-lucky-green px-2 text-[11px] font-semibold text-lucky-darker">
                    {selectedStars.length}
                  </span>
                ) : null}
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 space-y-3 rounded-lg border border-white/10 bg-lucky-dark p-3 text-sm text-white shadow-2xl">
                  <div className="flex items-center justify-between">
                    <p className="text-white/80">Filter by rating</p>
                    <button
                      type="button"
                      className="text-xs text-white/60 hover:text-white"
                      onClick={() => setSelectedStars([])}
                    >
                      Clear
                    </button>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const checked = selectedStars.includes(star);
                      const count = productReviews.filter((r) => Math.round(r.rating) === star).length;
                      return (
                        <label
                          key={star}
                          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 transition hover:bg-white/5"
                        >
                          <span className="flex items-center gap-2">
                            <StarRating value={star} readOnly />
                            <span className="text-white/80">{star} stars</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60">({count})</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedStars((prev) =>
                                  checked ? prev.filter((s) => s !== star) : [...prev, star]
                                )
                              }
                              className="h-4 w-4 accent-lucky-green"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <Button onClick={handleWrite}>Write a review</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/60">Rating breakdown</p>
              {distribution.map((item) => (
                <div key={item.star} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-white/70">{item.star}★</span>
                  <div className="h-2 flex-1 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-lucky-green"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-white/50">{item.count}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {productReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-6 text-center text-white/70">
                  <p className="font-semibold text-white">No reviews yet</p>
                  <p className="text-sm text-white/60">Be the first to review.</p>
                </div>
              ) : sorted.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-6 text-center text-white/70">
                  <p className="font-semibold text-white">No reviews match your filters</p>
                  <p className="text-sm text-white/60">
                    Try adjusting your rating filters or clear filters to see all reviews.
                  </p>
                  <div className="mt-3 flex justify-center gap-3">
                    <Button
                      variant="secondary"
                      className="bg-white/10"
                      onClick={() => setSelectedStars([])}
                    >
                      Clear filters
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/20 text-white"
                      onClick={() => setSelectedStars([])}
                    >
                      Show all reviews
                    </Button>
                  </div>
                </div>
              ) : (
                sorted.map((review) => (
                  <article
                    key={review.id}
                    className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <StarRating value={review.rating} readOnly />
                        <p className="text-sm text-white/60">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <span>{review.authorName || review.authorEmail.split("@")[0]}</span>
                        {review.verifiedPurchase ? (
                          <span className="rounded-full bg-lucky-green/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-lucky-green">
                            Verified Purchase
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold text-white">{review.title}</h4>
                    <p className="text-sm text-white/80 whitespace-pre-line">{review.body}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                      {review.variant ? <span>Variant: {review.variant}</span> : null}
                      {review.size ? <span>Size: {review.size}</span> : null}
                      {review.images && review.images.length ? (
                        <span>{review.images.length} photo{review.images.length > 1 ? "s" : ""}</span>
                      ) : null}
                      {review.reported ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-300">
                          Reported
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/70">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthed) {
                            router.push(
                              `/auth/sign-in?redirect=${encodeURIComponent(`${pathname}?review=open`)}`
                            );
                            return;
                          }
                          const already = hasUserVoted(review.id, userKey);
                          if (already) {
                            unmarkHelpful(review.productSlug, review.id);
                          } else {
                            markHelpful(review.productSlug, review.id);
                          }
                          setHelpfulVote(review.id, userKey, !already);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                          hasUserVoted(review.id, userKey)
                            ? "border-lucky-green bg-lucky-green/10 text-lucky-green"
                            : "border-white/20 bg-white/5 text-white hover:border-white/40"
                        )}
                      >
                        <ThumbsUp
                          className={cn(
                            "h-4 w-4",
                            hasUserVoted(review.id, userKey) ? "fill-lucky-green" : ""
                          )}
                        />
                        <span>{review.helpfulCount}</span>
                      </button>
                      {!review.reported ? (
                        <button
                          type="button"
                          className="text-xs text-white/50 hover:text-white"
                          onClick={() => reportReview(review.productSlug, review.id)}
                        >
                          Report
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <WriteReviewModal
        productId={productId}
        productSlug={productSlug}
        productName={productName}
        variants={variants}
        sizes={sizes}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
