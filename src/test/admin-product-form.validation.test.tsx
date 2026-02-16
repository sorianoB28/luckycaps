import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/app/admin/components/ProductForm";
import { renderWithI18n } from "@/test/utils/renderWithI18n";

describe("Admin ProductForm validation", () => {
  it("keeps required fields invalid and prevents submit when empty", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { t } = renderWithI18n(
      <ProductForm onSubmit={onSubmit} submitLabel="Save product" />,
      { locale: "EN" }
    );

    const nameInput = screen.getByLabelText(t("adminProductForm.name")) as HTMLInputElement;
    const slugInput = screen.getByLabelText(t("adminProductForm.slug")) as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: "Save product" });

    expect(nameInput).toBeInvalid();
    expect(slugInput).toBeInvalid();

    await user.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nameInput.validationMessage.length).toBeGreaterThan(0);
  });
});
