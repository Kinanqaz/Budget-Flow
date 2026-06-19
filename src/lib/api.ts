import type { ApiUser, ApiAuthResponse, ApiBudgetData, ApiSetupStatus } from "@/types/api";
import type { FinanceData } from "@/types/finance";

const TOKEN_KEY = "budgetflow-token";
export { TOKEN_KEY };

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(path, { ...options, headers });
        if (res.status === 401) {
          this.clearToken();
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          const body = await res.text();
          let message = body || `HTTP ${res.status}`;
          try {
            const json = JSON.parse(body) as { error?: string; message?: string };
            message = json.error || json.message || message;
          } catch {
            // plain-text error body
          }
          throw new Error(message);
        }
        return res.json();
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
    throw new Error("Unreachable");
  }

  auth = {
    register: (username: string, email: string, password: string) =>
      this.request<ApiAuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
    login: (email: string, password: string) =>
      this.request<ApiAuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () =>
      this.request<ApiUser>("/api/auth/me"),
    deleteAccount: () =>
      this.request<{ success: boolean }>("/api/auth/account", { method: "DELETE" }),
    setupStatus: () =>
      this.request<ApiSetupStatus>("/api/auth/setup-status"),
  };

  budget = {
    get: () =>
      this.request<ApiBudgetData>("/api/budget"),
    save: (data: FinanceData, darkMode: boolean, currency: string) =>
      this.request<{ success: boolean }>("/api/budget", {
        method: "PUT",
        body: JSON.stringify({ finance_data: data, dark_mode: darkMode, currency }),
      }),
  };
}

export const api = new ApiClient();
