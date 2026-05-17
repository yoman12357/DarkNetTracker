import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("reactflow", () => ({
  default: ({ children }) => children,
  Background: () => null,
  Controls: () => null,
  MarkerType: { ArrowClosed: "ArrowClosed" },
  MiniMap: () => null,
}));

import { AuthScreen } from "../components/dashboard/ui";

describe("AuthScreen", () => {
  it("renders demo accounts and login controls", () => {
    render(
      <AuthScreen
        auth={{ username: "admin", password: "secret" }}
        setAuth={() => {}}
        authState={{
          demoAccounts: [{ username: "admin", password: "admin123", role: "admin" }],
        }}
        error=""
        loading={false}
        handleLogin={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/demo roles/i)).toBeInTheDocument();
    expect(screen.getByText(/username: admin/i)).toBeInTheDocument();
  });
});
