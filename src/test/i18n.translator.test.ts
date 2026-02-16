import { afterEach, describe, expect, it, vi } from "vitest";

import { createTranslator, dictionaries } from "@/lib/i18n";

type DictNode = Record<string, string | DictNode>;

function getLeafKeys(node: DictNode, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(path);
    } else {
      keys.push(...getLeafKeys(value as DictNode, path));
    }
  }
  return keys;
}

function getNode(root: DictNode, path: string): DictNode | string | undefined {
  return path.split(".").reduce<DictNode | string | undefined>((acc, segment) => {
    if (!acc || typeof acc === "string") return undefined;
    return acc[segment] as DictNode | string | undefined;
  }, root);
}

function withRemovedEsKey<T>(key: string, run: () => T): T {
  const parts = key.split(".");
  const last = parts.pop()!;
  const parentPath = parts.join(".");
  const parent = getNode(dictionaries.ES as DictNode, parentPath) as DictNode;
  const original = parent[last];
  delete parent[last];
  try {
    return run();
  } finally {
    parent[last] = original;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("i18n translator behavior", () => {
  it("interpolates variables in translation strings", () => {
    const t = createTranslator("EN");
    expect(t("footer.copyright", { year: 2026 })).toBe(
      "Ac 2026 Lucky Caps. All rights reserved."
    );
  });

  it("falls back to EN when ES key is missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const key = "cart.title";
    const enValue = createTranslator("EN")(key);

    const result = withRemovedEsKey(key, () => createTranslator("ES")(key));

    expect(result).toBe(enValue);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns missing-key marker when key does not exist in any locale", () => {
    const t = createTranslator("EN");
    expect(t("missing.namespace.key")).toBe("MISSING_TRANSLATION:missing.namespace.key");
  });

  it("keeps EN/ES key parity for critical namespaces", () => {
    const namespaces = ["checkout", "cart", "auth", "admin"] as const;

    for (const namespace of namespaces) {
      const enNode = getNode(dictionaries.EN as DictNode, namespace) as DictNode;
      const esNode = getNode(dictionaries.ES as DictNode, namespace) as DictNode;

      const enKeys = getLeafKeys(enNode).sort();
      const esKeys = getLeafKeys(esNode).sort();

      expect(esKeys, `Missing ES keys under "${namespace}"`).toEqual(enKeys);
    }
  });
});

