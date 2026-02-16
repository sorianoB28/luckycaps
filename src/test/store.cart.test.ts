import { beforeEach, describe, expect, it } from "vitest";

import { buildKey, useCart, type CartItem } from "@/store/cart";

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p-1",
    productSlug: "test-cap",
    name: "Test Cap",
    imageUrl: null,
    priceCents: 3999,
    variant: "Standard",
    size: "One size",
    quantity: 1,
    ...overrides,
  };
}

function resetCartStore() {
  localStorage.removeItem("luckycaps-cart");
  useCart.setState({ items: {} });
}

describe("cart store logic", () => {
  beforeEach(() => {
    resetCartStore();
  });

  it("addItem creates a new line item", () => {
    const item = makeItem();
    useCart.getState().addItem(item);

    const items = useCart.getState().items;
    expect(Object.keys(items)).toHaveLength(1);
    expect(items[buildKey(item)]?.quantity).toBe(1);
  });

  it("adding same variant/size merges quantity on the same key", () => {
    const item = makeItem({ quantity: 2 });
    useCart.getState().addItem(item);
    useCart.getState().addItem({ ...item, quantity: 3 });

    const items = useCart.getState().items;
    expect(Object.keys(items)).toHaveLength(1);
    expect(items[buildKey(item)]?.quantity).toBe(5);
  });

  it("different variant creates a separate line key", () => {
    const first = makeItem({ variant: "Standard" });
    const second = makeItem({ variant: "Premium" });
    useCart.getState().addItem(first);
    useCart.getState().addItem(second);

    const items = useCart.getState().items;
    expect(Object.keys(items)).toHaveLength(2);
    expect(items[buildKey(first)]).toBeDefined();
    expect(items[buildKey(second)]).toBeDefined();
  });

  it("setQuantity keeps quantity >= 1 by ignoring invalid updates", () => {
    const item = makeItem({ quantity: 2 });
    const key = buildKey(item);
    useCart.getState().addItem(item);

    useCart.getState().setQuantity(key, 0);
    expect(useCart.getState().items[key]?.quantity).toBe(2);
  });

  it("removeItem and clear remove cart entries", () => {
    const item = makeItem();
    const key = buildKey(item);
    useCart.getState().addItem(item);

    useCart.getState().removeItem(key);
    expect(useCart.getState().items[key]).toBeUndefined();

    useCart.getState().addItem(item);
    useCart.getState().clear();
    expect(Object.keys(useCart.getState().items)).toHaveLength(0);
  });

  it("persists stable cart state shape to localStorage", () => {
    const item = makeItem();
    useCart.getState().addItem(item);

    const raw = localStorage.getItem("luckycaps-cart");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw!);
    expect(parsed).toMatchObject({
      state: {
        items: {
          [buildKey(item)]: {
            productSlug: "test-cap",
            quantity: 1,
          },
        },
      },
    });
  });
});

