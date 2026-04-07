/**
 * Development proxy for BlindFeed mobile (Expo web).
 *
 * Runs on $PORT.
 * - /api/*        → API server on localhost:8080
 * - everything else → Expo Metro bundler on METRO_PORT (default 19001)
 *
 * This lets the Expo web app call /api/... without a CORS header
 * because both the app and API are served from the same origin.
 */

const http = require("http");

const PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = parseInt(process.env.METRO_PORT || "19001", 10);
const API_PORT = 8080;

function proxy(req, res, targetHost, targetPort, rewritePath, stripCorsHeaders) {
  const path = rewritePath(req.url || "/");

  const headers = { ...req.headers, host: `${targetHost}:${targetPort}` };
  if (stripCorsHeaders) {
    delete headers["origin"];
    delete headers["referer"];
  }

  const options = {
    hostname: targetHost,
    port: targetPort,
    path,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("[dev-proxy] Error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway");
    }
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api")) {
    proxy(req, res, "localhost", API_PORT, (u) => u, false);
  } else {
    proxy(req, res, "localhost", METRO_PORT, (u) => u, true);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dev-proxy] Listening on port ${PORT}`);
  console.log(`[dev-proxy] /api/* → localhost:${API_PORT}`);
  console.log(`[dev-proxy] /* → localhost:${METRO_PORT} (Metro)`);
});
