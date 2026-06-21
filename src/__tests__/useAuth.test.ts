// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApi = vi.hoisted(() => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    deleteAccount: vi.fn(),
    setupStatus: vi.fn(),
  },
  budget: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  api: mockApi,
  TOKEN_KEY: "budgetflow-token",
}));

import { useAuth } from "@/hooks/useAuth";
import { renderHook, act, waitFor } from "@testing-library/react";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sets synthetic user when auth is disabled", async () => {
    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: false,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual({
      id: "default",
      username: "admin",
    });
    expect(result.current.authEnabled).toBe(false);
  });

  it("loads user from token when already authenticated", async () => {
    localStorage.setItem("budgetflow-token", "valid-token");

    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: true,
    });
    mockApi.auth.me.mockResolvedValue({
      id: "user1",
      username: "alice",
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user?.username).toBe("alice");
  });

  it("clears token when me() fails", async () => {
    localStorage.setItem("budgetflow-token", "expired-token");

    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: true,
    });
    mockApi.auth.me.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(mockApi.clearToken).toHaveBeenCalled();
  });

  it("signIn stores token and sets user", async () => {
    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: true,
    });
    mockApi.auth.login.mockResolvedValue({
      token: "new-token",
      user: { id: "u1", username: "bob" },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const { error } = await result.current.signIn("bob", "Test1234");
      expect(error).toBeNull();
    });

    expect(mockApi.setToken).toHaveBeenCalledWith("new-token");
    expect(result.current.user?.username).toBe("bob");
  });

  it("signUp registers, stores token, and sets user", async () => {
    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: true,
      authEnabled: true,
    });
    mockApi.auth.register.mockResolvedValue({
      token: "reg-token",
      user: { id: "u2", username: "charlie" },
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const { error } = await result.current.signUp("charlie", "Test1234");
      expect(error).toBeNull();
    });

    expect(mockApi.setToken).toHaveBeenCalledWith("reg-token");
    expect(result.current.user?.username).toBe("charlie");
  });

  it("signOut clears user and token", async () => {
    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: true,
    });
    mockApi.auth.me.mockResolvedValue({
      id: "u1", username: "alice",
    });
    localStorage.setItem("budgetflow-token", "token");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(mockApi.clearToken).toHaveBeenCalled();
  });

  it("deleteAccount calls api and clears state", async () => {
    mockApi.auth.setupStatus.mockResolvedValue({
      needsSetup: false,
      authEnabled: true,
    });
    mockApi.auth.me.mockResolvedValue({
      id: "u1", username: "alice",
    });
    localStorage.setItem("budgetflow-token", "token");

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockApi.auth.deleteAccount).toHaveBeenCalled();
    expect(mockApi.clearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });
});