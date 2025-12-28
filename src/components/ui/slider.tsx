import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = {
  value: [number, number];
  min: number;
  max: number;
  step?: number;
  minStepsBetweenThumbs?: number;
  onValueChange: (value: [number, number]) => void;
  className?: string;
  "aria-label"?: string;
};

export function Slider({
  value,
  min,
  max,
  step = 1,
  minStepsBetweenThumbs = 0,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = React.useState<"min" | "max" | null>(null);
  const [pointerId, setPointerId] = React.useState<number | null>(null);

  const range = Math.max(max - min, step);
  const minGap = step * minStepsBetweenThumbs;
  const [minValue, maxValue] = value;

  const percentFor = (val: number) => ((val - min) / range) * 100;
  const minPercent = percentFor(minValue);
  const maxPercent = percentFor(maxValue);

  const snap = (val: number) =>
    Math.round((val - min) / step) * step + min;

  const clampValues = (nextMin: number, nextMax: number): [number, number] => {
    const clampedMin = Math.min(Math.max(nextMin, min), nextMax - minGap);
    const clampedMax = Math.max(Math.min(nextMax, max), clampedMin + minGap);
    return [clampedMin, clampedMax];
  };

  const updateFromPosition = (clientX: number, thumb: "min" | "max") => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    const raw = min + ratio * (max - min);
    const snapped = snap(raw);
    if (thumb === "min") {
      onValueChange(clampValues(snapped, maxValue));
    } else {
      onValueChange(clampValues(minValue, snapped));
    }
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>,
    thumb: "min" | "max"
  ) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    setPointerId(event.pointerId);
    setActiveThumb(thumb);
    updateFromPosition(event.clientX, thumb);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>
  ) => {
    if (activeThumb && pointerId === event.pointerId) {
      event.preventDefault();
      updateFromPosition(event.clientX, activeThumb);
    }
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement> | React.PointerEvent<HTMLButtonElement>
  ) => {
    if (pointerId === event.pointerId) {
      setActiveThumb(null);
      setPointerId(null);
      (event.currentTarget as HTMLElement)?.releasePointerCapture(event.pointerId);
    }
  };

  const thumbBaseClasses =
    "absolute top-1/2 h-4 w-4 -translate-y-1/2 translate-x-[-50%] rounded-full border border-white/60 bg-white shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green";

  return (
    <div className={cn("relative w-full py-2", className)}>
      <div
        ref={trackRef}
        className="relative h-1.5 w-full rounded-full bg-white/10"
        onPointerDown={(e) => {
          // Decide which thumb is closer to the pointer.
          const rect = trackRef.current?.getBoundingClientRect();
          if (!rect) return;
          const ratio = (e.clientX - rect.left) / rect.width;
          const raw = min + ratio * (max - min);
          const distMin = Math.abs(raw - minValue);
          const distMax = Math.abs(raw - maxValue);
          const thumb = distMin <= distMax ? "min" : "max";
          handlePointerDown(e as any, thumb);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute h-full rounded-full bg-lucky-green"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(maxPercent - minPercent, 0)}%`,
          }}
        />
        <button
          type="button"
          className={thumbBaseClasses}
          style={{ left: `${minPercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, "min")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          className={thumbBaseClasses}
          style={{ left: `${maxPercent}%` }}
          onPointerDown={(e) => handlePointerDown(e, "max")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
}
