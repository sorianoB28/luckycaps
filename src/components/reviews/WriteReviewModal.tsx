"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReviewsStore } from "@/store/reviewsStore";
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
      setError("Rating, title, and body are required.");
      return;
    }
    if (!guidelines) {
      setError("Please agree to the community guidelines.");
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
            <h3 className="font-display text-2xl">Write a review</h3>
            <p className="text-sm text-white/60">for {productName}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating value={rating} onChange={setRating} allowHalf={false} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Premium quality"
                className="bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Photo URL (optional)</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-white/5 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Review</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Share fit, feel, and build quality."
              className="bg-white/5 text-white"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Variant (optional)</Label>
              <Input
                list="review-variant"
                value={variant ?? ""}
                onChange={(e) => setVariant(e.target.value)}
                className="bg-white/5 text-white"
                placeholder="Snapback / Fitted / Trucker"
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
              <Label>Size (optional)</Label>
              <Input
                list="review-size"
                value={size ?? ""}
                onChange={(e) => setSize(e.target.value)}
                className="bg-white/5 text-white"
                placeholder="Adjustable / 7 1/4..."
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
            I agree to the community guidelines
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit}>Submit review</Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
