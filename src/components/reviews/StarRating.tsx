"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  allowHalf?: boolean;
  size?: number;
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  allowHalf = false,
  size = 18,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (starValue: number) => {
    if (readOnly || !onChange) return;
    onChange(starValue);
  };

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => {
        const isHalf = allowHalf && value >= star - 0.5 && value < star;
        const isFull = value >= star;
        const fill = isFull ? "text-lucky-green" : isHalf ? "text-lucky-green/70" : "text-white/30";
        return (
          <button
            key={star}
            type="button"
            className={cn(
              "transition",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-105"
            )}
            onClick={() => handleClick(star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            disabled={readOnly}
          >
            <Star
              className={fill}
              width={size}
              height={size}
              fill={isFull || isHalf ? "currentColor" : "transparent"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
      {!readOnly ? (
        <button
          type="button"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
