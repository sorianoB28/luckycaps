"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "children"
> & {
  options: SelectFieldOption[];
  onValueChange: (value: string) => void;
  containerClassName?: string;
};

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      options,
      onValueChange,
      className,
      containerClassName,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <select
          {...props}
          ref={ref}
          onChange={(event) => onValueChange(event.target.value)}
          style={{ colorScheme: "dark", ...(style ?? {}) }}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-white/15 bg-black/45 px-3 pr-10 text-sm text-white shadow-sm transition",
            "focus:outline-none focus:ring-2 focus:ring-lucky-green focus:border-lucky-green",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-lucky-dark text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
        />
      </div>
    );
  }
);

SelectField.displayName = "SelectField";
