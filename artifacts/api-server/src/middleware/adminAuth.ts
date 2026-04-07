export function isAuthorizedAdmin(req: Parameters<import("express").RequestHandler>[0]): boolean {
  const configured = process.env.ADMIN_KEY;
  if (!configured) return false;
  return req.headers["x-admin-key"] === configured;
}
