import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test setup smoke", () => {
  it("renders a simple element", () => {
    render(<div data-testid="smoke">Lucky Caps test setup</div>);
    expect(screen.getByTestId("smoke")).toBeInTheDocument();
  });
});

