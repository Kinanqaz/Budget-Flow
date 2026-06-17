import crypto from "crypto";

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  HOST: process.env.HOST || "0.0.0.0",
  DATA_DIR: process.env.DATA_DIR || "./data",
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    const secret = crypto.randomBytes(32).toString("hex");
    console.warn("JWT_SECRET not set. Generated random secret.");
    console.warn("Set JWT_SECRET env var for production use.");
    return secret;
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  AUTH_ENABLED: process.env.AUTH_ENABLED === "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};