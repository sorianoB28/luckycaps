export function sqlTextFromArgs(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "string") return first;
  if (Array.isArray(first)) return first.join(" ");
  return "";
}

export function sqlValuesFromArgs(args: unknown[]): unknown[] {
  const first = args[0];

  if (typeof first === "string") {
    return Array.isArray(args[1]) ? (args[1] as unknown[]) : [];
  }

  if (Array.isArray(first)) {
    return args.slice(1);
  }

  return [];
}
