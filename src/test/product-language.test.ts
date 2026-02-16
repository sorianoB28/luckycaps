import { describe, expect, it } from "vitest";

import { getLocalizedProduct, selectLocalizedText } from "@/lib/productLanguage";

describe("product localization helpers", () => {
  it("selects ES localized text when locale is ES", () => {
    const value = selectLocalizedText(
      {
        primary: "Base Name",
        en: "English Name",
        es: "Nombre Espanol",
      },
      "ES"
    );

    expect(value).toBe("Nombre Espanol");
  });

  it("falls back to base text when locale-specific text is missing", () => {
    const value = selectLocalizedText(
      {
        primary: "Base Description",
        en: null,
        es: "",
      },
      "ES"
    );

    expect(value).toBe("Base Description");
  });

  it("falls back across locales when primary is missing", () => {
    const value = selectLocalizedText(
      {
        primary: "",
        en: "Fallback EN",
        es: null,
      },
      "ES"
    );

    expect(value).toBe("Fallback EN");
  });

  it("getLocalizedProduct returns non-empty title/description when usable fallback exists", () => {
    const product = {
      name: "Base Product",
      name_en: null,
      name_es: "Producto",
      description: "",
      description_en: "English Description",
      description_es: null,
    };

    const localized = getLocalizedProduct(product, "EN");
    expect(localized.title).toBe("Base Product");
    expect(localized.description).toBe("English Description");
  });
});

