import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectStorageService, ObjectNotFoundError, InvalidObjectPathError } from "../lib/objectStorage";
import { uploadLimiter } from "../middleware/rateLimits";
import { getAuthenticatedIdentity } from "../lib/requestIdentity";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", uploadLimiter, async (req: Request, res: Response) => {
  const authenticatedUserId = getAuthenticatedIdentity(res);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, size, contentType } = req.body ?? {};
  if (!name || !contentType) {
    res.status(400).json({ error: "Missing required fields: name, contentType" });
    return;
  }

  try {
    const { uploadURL, objectPath } = await objectStorageService.getObjectUploadURL();

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const publicObjectURL = objectStorageService.getPublicObjectURL(filePath);
    res.redirect(302, publicObjectURL);
  } catch (error) {
    if (error instanceof InvalidObjectPathError) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const signedURL = await objectStorageService.getObjectEntitySignedReadURL(objectPath);
    res.redirect(302, signedURL);
  } catch (error) {
    if (error instanceof InvalidObjectPathError) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
