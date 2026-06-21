import { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!config.AUTH_ENABLED) {
    (request as any).user = { id: "default", username: "admin" };
    return;
  }

  try {
    await request.jwtVerify();
    const payload = request.user as { userId: string; username: string };
    (request as any).user = {
      id: payload.userId,
      username: payload.username,
    };
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}