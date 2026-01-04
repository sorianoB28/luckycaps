"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { getPlaceholderImages } from "@/lib/placeholderImages";
import { useT } from "@/components/providers/LanguageProvider";

interface ProductGalleryProps {
  images: string[];
  name: string;
  category?: string;
  slug?: string;
}

export default function ProductGallery({ images, name, category, slug }: ProductGalleryProps) {
  const t = useT();
  const [active, setActive] = useState(0);
  const fallbacks = getPlaceholderImages(category ?? "General", slug ?? name, 4);
  const galleryImages =
    images && images.length > 0 ? images : fallbacks;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <Image
          src={galleryImages[active]}
          alt={name}
          fill
          className="object-cover"
          onError={(event) => {
            const next = galleryImages[(active + 1) % galleryImages.length];
            event.currentTarget.src = next;
          }}
        />
      </div>
      <div className="flex gap-3">
        {galleryImages.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition",
              active === index && "border-lucky-green shadow-glow"
            )}
            aria-label={t("product.galleryImageAria", { name, index: index + 1 })}
          >
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              onError={(event) => {
                const next =
                  galleryImages[(index + 1) % galleryImages.length];
                event.currentTarget.src = next;
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
