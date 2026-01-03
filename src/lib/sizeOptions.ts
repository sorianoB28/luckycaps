export const sizeOptions = ["S/M", "M/L", "L/XL"] as const;

export type SizeOption = (typeof sizeOptions)[number];

export const sizeOrderRank: Record<string, number> = sizeOptions.reduce(
  (acc, size, idx) => {
    acc[size.toLowerCase()] = idx;
    return acc;
  },
  {} as Record<string, number>
);

export const normalizeSize = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const match = sizeOptions.find((option) => option.toLowerCase() === lower);
  return match ?? null;
};

export const sortSizes = (sizes: string[]) =>
  [...sizes].sort((a, b) => {
    const rankA = sizeOrderRank[a.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
    const rankB = sizeOrderRank[b.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
