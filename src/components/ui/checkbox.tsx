"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => (
    <button
      ref={ref}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green/70",
        checked && "bg-lucky-green text-lucky-darker",
        className
      )}
      {...props}
    >
      {checked ? <span className="text-xs font-bold">✓</span> : null}
    </button>
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
