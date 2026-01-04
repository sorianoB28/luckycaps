"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReviewsStore } from "@/store/reviewsStore";
import { useT } from "@/components/providers/LanguageProvider";
import { StarRating } from "./StarRating";

interface WriteReviewModalProps {
  productId: string;
  productSlug: string;
  productName: string;
  variants?: string[];
  sizes?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function WriteReviewModal({
  productId,
  productSlug,
  productName,
  variants = [],
  sizes = [],
  isOpen,
  onClose,
}: WriteReviewModalProps) {
  const t = useT();
  const { data: session, status } = useSession();
  const addReview = useReviewsStore((s) => s.addReview);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variant, setVariant] = useState<string | undefined>(variants[0]);
  const [size, setSize] = useState<string | undefined>(sizes[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [guidelines, setGuidelines] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRating(0);
      setTitle("");
      setBody("");
      setGuidelines(false);
      setImageUrl("");
      setVariant(variants[0]);
      setSize(sizes[0]);
      setError(null);
    }
  }, [isOpen, variants, sizes]);

  useEffect(() => {
    const shouldOpen = searchParams?.get("review") === "open";
    if (shouldOpen && status === "authenticated") {
      // keep open
    } else if (shouldOpen && status === "unauthenticated") {
      router.replace(`${pathname}`);
    }
  }, [pathname, router, searchParams, status]);

  const authorEmail = session?.user?.email ?? "guest@luckycaps.com";
  const authorName = useMemo(() => {
    if (!session?.user?.name) return authorEmail.split("@")[0] ?? "";
    return session.user.name;
  }, [authorEmail, session?.user?.name]);

  const handleSubmit = () => {
    if (status !== "authenticated") {
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(`${pathname}?review=open`)}`);
      return;
    }
    if (!rating || !title.trim() || !body.trim()) {
      setError(t("reviews.errors.required"));
      return;
    }
    if (!guidelines) {
      setError(t("reviews.errors.guidelines"));
      return;
    }
    setError(null);
    const images = imageUrl.trim() ? [imageUrl.trim()] : [];
    addReview({
      productId,
      productSlug,
      rating,
      title: title.trim(),
      body: body.trim(),
      authorEmail: authorEmail || "guest@luckycaps.com",
      authorName: authorName || "Guest",
      variant,
      size,
      images,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-lucky-dark/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl">{t("reviews.modalTitle")}</h3>
            <p className="text-sm text-white/60">{t("reviews.forProduct", { product: productName })}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("reviews.ratingLabel")}</Label>
            <StarRating value={rating} onChange={setRating} allowHalf={false} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("reviews.titleLabel")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("reviews.titlePlaceholder")}
                className="bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("reviews.photoUrlLabel")}</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t("reviews.photoUrlPlaceholder")}
                className="bg-white/5 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("reviews.reviewLabel")}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("reviews.reviewPlaceholder")}
              className="bg-white/5 text-white"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("reviews.variantLabel")}</Label>
              <Input
                list="review-variant"
                value={variant ?? ""}
                onChange={(e) => setVariant(e.target.value)}
                className="bg-white/5 text-white"
                placeholder={t("reviews.variantPlaceholder")}
              />
              {variants.length ? (
                <datalist id="review-variant">
                  {variants.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("reviews.sizeLabel")}</Label>
              <Input
                list="review-size"
                value={size ?? ""}
                onChange={(e) => setSize(e.target.value)}
                className="bg-white/5 text-white"
                placeholder={t("reviews.sizePlaceholder")}
              />
              {sizes.length ? (
                <datalist id="review-size">
                  {sizes.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              ) : null}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={guidelines}
              onChange={(e) => setGuidelines(e.target.checked)}
              className="accent-lucky-green"
            />
            {t("reviews.guidelinesAgree")}
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit}>{t("reviews.submit")}</Button>
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
