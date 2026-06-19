import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { config } from "../config";

vi.mock("better-sqlite3", () => {
  const mockData: { user_id?: string; finance_data?: string; dark_mode?: number; currency?: string } = {};
  const mockDb = {
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => {
      if (sql.includes("SELECT") && !sql.includes("COUNT")) {
        return {
          get: vi.fn((...args: any[]) => {
            if (args[0] === "test-user-id") {
              return mockData.user_id
                ? {
                    user_id: mockData.user_id,
                    finance_data: mockData.finance_data || "{}",
                    dark_mode: mockData.dark_mode || 0,
                    currency: mockData.currency || "€",
                    updated_at: "2024-01-01",
                  }
                : undefined;
            }
            return undefined;
          }),
          run: vi.fn(),
        };
      }
      if (sql.includes("INSERT") || sql.includes("ON CONFLICT")) {
        return {
          run: vi.fn((...args: any[]) => {
            mockData.user_id = args[0] as string;
            mockData.finance_data = args[1] as string;
            mockData.dark_mode = args[2] as number;
            mockData.currency = args[3] as string;
            return { changes: 1 };
          }),
          get: vi.fn(),
        };
      }
      return { get: vi.fn(), run: vi.fn(() => ({ changes: 1 })) };
    }),
    close: vi.fn(),
  };
  return { default: vi.fn(() => mockDb) };
});

async function buildApp() {
  (config as any).AUTH_ENABLED = false;

  const { initDB } = await import("../db/schema");
  initDB();

  const app = Fastify();
  await app.register(jwt, { secret: "test-secret" });

  const { budgetRoutes } = await import("../routes/budget");
  await app.register(budgetRoutes);

  return app;
}

describe("Budget Routes", () => {
  it("GET /api/budget returns null finance_data when no row exists", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/budget",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.finance_data).toBeNull();
    expect(body.dark_mode).toBe(false);
    expect(body.currency).toBe("€");
  });

  it("PUT /api/budget saves data successfully", async () => {
    const app = await buildApp();
    const payload = {
      finance_data: {
        income: [{ id: "i1", name: "Salary", value: 5000 }],
        categories: [],
      },
      dark_mode: true,
      currency: "$",
    };
    const res = await app.inject({
      method: "PUT",
      url: "/api/budget",
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true });
  });

  it("PUT /api/budget returns 400 for invalid finance_data", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PUT",
      url: "/api/budget",
      payload: { finance_data: null, dark_mode: false, currency: "€" },
    });
    expect(res.statusCode).toBe(400);
  });
});