import type { Request, Response } from "express";

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getPrimaryIdentity(req: Request, res: Response): string | undefined {
  const jwtIdentity = res.locals.authAnonymousId as string | undefined;
  if (jwtIdentity) return jwtIdentity;

  const headerIdentity = getHeaderValue(req.headers["x-anonymous-id"]);
  if (!headerIdentity) return undefined;
  return headerIdentity;
}

export function getIdentitySet(req: Request, res: Response): string[] {
  const jwtIdentity = res.locals.authAnonymousId as string | undefined;
  if (jwtIdentity) return [jwtIdentity];

  const primary = getHeaderValue(req.headers["x-anonymous-id"]);
  const perm = getHeaderValue(req.headers["x-perm-id"]);
  const ids = [primary, perm].filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}
