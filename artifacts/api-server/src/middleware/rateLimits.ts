import rateLimit from "express-rate-limit";
import type { Request } from "express";

function clientKey(req: Request): string {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const anonId = req.headers["x-anonymous-id"] as string | undefined;
  return anonId ? `${ip}:${anonId}` : ip;
}

function ipKey(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.method === "OPTIONS",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please wait before trying again." },
});

export const postCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many posts. Please wait before posting again." },
});

export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many comments. Please slow down." },
});

export const reactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reactions. Please slow down." },
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reports submitted. Please try again later." },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: clientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please slow down." },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many searches. Please slow down." },
});
