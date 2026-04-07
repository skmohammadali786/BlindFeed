import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalLimiter } from "./middleware/rateLimits";
import { attachIdentityFromSupabaseToken } from "./middleware/authIdentity";

const app: Express = express();
const corsAllowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
);

app.set("trust proxy", 1);

function parseForwardedHeader(headerValue: string | string[] | undefined): string | undefined {
  if (!headerValue) return undefined;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return raw.split(",")[0]?.trim();
}

function isSameOrigin(origin: string, req: Parameters<import("express").RequestHandler>[0]): boolean {
  const forwardedProto = parseForwardedHeader(req.headers["x-forwarded-proto"]);
  const forwardedHost = parseForwardedHeader(req.headers["x-forwarded-host"]);
  const host = forwardedHost ?? req.headers.host;
  if (!host) return false;

  const protocol = forwardedProto ?? req.protocol;
  return origin === `${protocol}://${host}`;
}

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));
app.use(globalLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = !!origin && corsAllowedOrigins.has(origin);
  const allowedOrigin = isAllowedOrigin ? origin : undefined;
  const isSameOriginRequest = !!origin && isSameOrigin(origin, req);

  if (origin && !allowedOrigin && !isSameOriginRequest) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-anonymous-id, x-perm-id, x-admin-key");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(attachIdentityFromSupabaseToken);

app.use("/api", router);

export default app;
