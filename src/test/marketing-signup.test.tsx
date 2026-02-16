import React from "react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FooterClient from "@/components/layout/FooterClient";
import { renderWithI18n } from "@/test/utils/renderWithI18n";

const categories: Array<{ key: string; slug: string; count: number }> = [];

function mockJson(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Footer marketing signup state machine", () => {
  it("shows success state after valid submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJson({ ok: true }));

    renderWithI18n(<FooterClient categories={categories} />, { locale: "EN" });

    await userEvent.type(screen.getByTestId("marketing-email-input"), "test@example.com");
    await userEvent.click(screen.getByTestId("marketing-consent"));
    await userEvent.click(screen.getByTestId("marketing-submit"));

    const status = await screen.findByTestId("marketing-status");
    expect(status).toHaveAttribute("data-state", "success");
  });

  it("shows duplicate state when subscriber already exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockJson({ ok: true, alreadySubscribed: true })
    );

    renderWithI18n(<FooterClient categories={categories} />, { locale: "EN" });

    await userEvent.type(screen.getByTestId("marketing-email-input"), "test@example.com");
    await userEvent.click(screen.getByTestId("marketing-consent"));
    await userEvent.click(screen.getByTestId("marketing-submit"));

    const status = await screen.findByTestId("marketing-status");
    expect(status).toHaveAttribute("data-state", "duplicate");
  });

  it("shows validation error for invalid email before network submit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockJson({ ok: true }));

    renderWithI18n(<FooterClient categories={categories} />, { locale: "EN" });

    await userEvent.type(screen.getByTestId("marketing-email-input"), "invalid-email");
    await userEvent.click(screen.getByTestId("marketing-consent"));
    fireEvent.submit(screen.getByTestId("marketing-signup-form"));

    const status = await screen.findByTestId("marketing-status");
    expect(status).toHaveAttribute("data-state", "error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows server error then allows retry to success", async () => {
    let succeed = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      if (succeed) return mockJson({ ok: true });
      return mockJson({ ok: false, error: "failed" }, 500);
    });

    renderWithI18n(<FooterClient categories={categories} />, { locale: "EN" });

    await userEvent.type(screen.getByTestId("marketing-email-input"), "test@example.com");
    await userEvent.click(screen.getByTestId("marketing-consent"));
    await userEvent.click(screen.getByTestId("marketing-submit"));

    let status = await screen.findByTestId("marketing-status");
    expect(status).toHaveAttribute("data-state", "error");

    succeed = true;
    await userEvent.click(screen.getByTestId("marketing-submit"));

    await waitFor(() => {
      status = screen.getByTestId("marketing-status");
      expect(status).toHaveAttribute("data-state", "success");
    });
  });
});
