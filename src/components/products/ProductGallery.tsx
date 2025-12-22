"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        <Image
          src={images[active]}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex gap-3">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition",
              active === index && "border-lucky-green shadow-glow"
            )}
            aria-label={`View ${name} image ${index + 1}`}
          >
            <Image src={image} alt={name} fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
