"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";

import { getPlaceholderImages } from "@/lib/placeholderImages";

type ProductImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  category: string;
  slug: string;
  className?: string;
  onSrcChange?: (src: string | null) => void;
  fallbacks?: string[];
};

export function ProductImageWithFallback({
  src,
  alt,
  category,
  slug,
  className,
  onSrcChange,
  fallbacks,
}: ProductImageWithFallbackProps) {
  const fallbackPool = useMemo(
    () => fallbacks ?? getPlaceholderImages(category, slug, 3),
    [fallbacks, category, slug]
  );

  const [currentSrc, setCurrentSrc] = useState<string | null>(
    src ?? fallbackPool[0] ?? null
  );
  const fallbackIndex = useRef(src ? 0 : 1);

  useEffect(() => {
    setCurrentSrc(src ?? fallbackPool[0] ?? null);
    fallbackIndex.current = src ? 0 : 1;
  }, [src, fallbackPool]);

  useEffect(() => {
    onSrcChange?.(currentSrc);
  }, [currentSrc, onSrcChange]);

  const handleError = (
    event: SyntheticEvent<HTMLImageElement, Event>
  ) => {
    if (fallbackIndex.current >= fallbackPool.length) return;
    const nextSrc = fallbackPool[fallbackIndex.current];
    fallbackIndex.current += 1;
    setCurrentSrc(nextSrc);
    event.currentTarget.src = nextSrc;
  };

  if (!currentSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
        No image
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}
