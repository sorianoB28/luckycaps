import { describe, expect, it } from "vitest";

import { dictionaries } from "@/lib/i18n";

type DictNode = Record<string, string | DictNode>;

const CRITICAL_NAMESPACES = ["checkout", "cart", "auth", "admin", "footer"] as const;

function isDictNode(value: unknown): value is DictNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenKeys(node: DictNode, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(next);
      continue;
    }
    if (isDictNode(value)) {
      keys.push(...flattenKeys(value, next));
    }
  }
  return keys;
}

describe("i18n key parity for critical namespaces", () => {
  it("keeps EN and ES keys in sync for checkout/cart/auth/admin/footer", () => {
    const failures: string[] = [];

    for (const namespace of CRITICAL_NAMESPACES) {
      const enNode = dictionaries.EN[namespace];
      const esNode = dictionaries.ES[namespace];

      if (!isDictNode(enNode) || !isDictNode(esNode)) {
        failures.push(
          `[${namespace}] missing namespace object in ${!isDictNode(enNode) ? "EN" : ""}${
            !isDictNode(enNode) && !isDictNode(esNode) ? " and " : ""
          }${!isDictNode(esNode) ? "ES" : ""}`.trim()
        );
        continue;
      }

      const enKeys = flattenKeys(enNode).sort();
      const esKeys = flattenKeys(esNode).sort();
      const enSet = new Set(enKeys);
      const esSet = new Set(esKeys);

      const missingInEs = enKeys.filter((key) => !esSet.has(key));
      const missingInEn = esKeys.filter((key) => !enSet.has(key));

      if (missingInEs.length || missingInEn.length) {
        failures.push(
          [
            `[${namespace}] key parity mismatch`,
            missingInEs.length
              ? `  Missing in ES (${missingInEs.length}): ${missingInEs.join(", ")}`
              : null,
            missingInEn.length
              ? `  Missing in EN (${missingInEn.length}): ${missingInEn.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
    }

    expect(
      failures,
      failures.length
        ? `Translation parity failures:\n${failures.join("\n\n")}`
        : "Translation parity check passed"
    ).toEqual([]);
  });
});
