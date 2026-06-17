import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { getDB } from "../db/schema";
import { authMiddleware } from "../middleware/auth";

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, email, password } = request.body as RegisterBody;

    if (!email || !password || !username) {
      return reply.status(400).send({ error: "Missing required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: "Invalid email format" });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: "Password must be at least 8 characters" });
    }
    if (username.length < 2 || username.length > 30) {
      return reply.status(400).send({ error: "Username must be 2-30 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const db = getDB();
    try {
      const row = db.prepare(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id"
      ).get(username, email, passwordHash) as { id: string };

      const token = app.jwt.sign({ userId: row.id, username, email });

      return reply.send({
        token,
        user: { id: row.id, username, email },
      });
    } catch (err: any) {
      if (err.message?.includes("UNIQUE constraint")) {
        return reply.status(409).send({ error: "Email or username already taken" });
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as LoginBody;

    if (!email || !password) {
      return reply.status(400).send({ error: "Missing email or password" });
    }

    const db = getDB();
    const row = db.prepare(
      "SELECT id, username, email, password_hash FROM users WHERE email = ?"
    ).get(email) as { id: string; username: string; email: string; password_hash: string } | undefined;

    if (!row) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({ userId: row.id, username: row.username, email: row.email });

    return reply.send({
      token,
      user: { id: row.id, username: row.username, email: row.email },
    });
  });

  app.get("/api/auth/me", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(request.user as { id: string; username: string; email: string });
  });

  app.delete("/api/auth/account", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getDB();
    const user = request.user as { id: string; username: string; email: string };
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    if (result.changes === 0) {
      return reply.status(404).send({ error: "User not found" });
    }
    return reply.send({ success: true });
  });

  app.get("/api/auth/setup-status", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!config.AUTH_ENABLED) {
      return reply.send({ needsSetup: false, authEnabled: false });
    }

    const db = getDB();
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return reply.send({
      needsSetup: row.count === 0,
      authEnabled: true,
    });
  });
}
