import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthNotice } from "@/components/auth/AuthNotice";

describe("AuthNotice", () => {
  it("renders an error banner with title and body", () => {
    render(
      <AuthNotice
        status="error"
        title="Invalid credentials"
        body="Please check your email and password."
      />
    );

    const notice = screen.getByRole("alert");
    expect(notice).toBeInTheDocument();
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    expect(screen.getByText("Please check your email and password.")).toBeInTheDocument();
  });
});
