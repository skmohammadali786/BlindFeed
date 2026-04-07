import { randomUUID } from "crypto";
import { supabaseAdminClient } from "./supabase";

const supabaseUrl = process.env.SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL must be set");
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function createSignedUploadEndpoint(bucket: string, objectName: string, token: string): string {
  return `${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${encodeURIComponent(objectName)}?token=${encodeURIComponent(token)}`;
}

export class ObjectStorageService {
  getPublicBuckets(): string[] {
    return (process.env.SUPABASE_STORAGE_PUBLIC_BUCKETS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  getPrivateBucket(): string {
    const bucket = process.env.SUPABASE_STORAGE_PRIVATE_BUCKET ?? "";
    if (!bucket) throw new Error("SUPABASE_STORAGE_PRIVATE_BUCKET must be set");
    return bucket;
  }

  /**
   * Returns:
   * - uploadURL: signed PUT URL the client uploads bytes to
   * - objectPath: normalized path persisted in app records for later reads
   */
  async getObjectUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const privateBucket = this.getPrivateBucket();
    const objectName = `uploads/${randomUUID()}`;
    const { data, error } = await supabaseAdminClient.storage
      .from(privateBucket)
      .createSignedUploadUrl(objectName);

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to generate upload URL");
    }

    const signedUrl =
      "signedUrl" in data && typeof data.signedUrl === "string"
        ? data.signedUrl
        : undefined;
    // Some SDK responses only provide token/path pieces; build endpoint from token when signedUrl is absent.
    const uploadURL = signedUrl ?? createSignedUploadEndpoint(privateBucket, objectName, data.token);
    return {
      uploadURL,
      objectPath: `/objects/${objectName}`,
    };
  }

  async getObjectEntitySignedReadURL(objectPath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const privateBucket = this.getPrivateBucket();
    const objectName = objectPath.replace(/^\/objects\//, "");
    if (!objectName) {
      throw new ObjectNotFoundError();
    }

    const { data, error } = await supabaseAdminClient.storage
      .from(privateBucket)
      .createSignedUrl(objectName, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new ObjectNotFoundError();
    }
    return data.signedUrl;
  }

  getPublicObjectURL(filePath: string): string {
    const buckets = this.getPublicBuckets();
    if (buckets.length === 0) {
      throw new Error("SUPABASE_STORAGE_PUBLIC_BUCKETS must be set to serve public assets");
    }
    const normalizedPath = filePath.replace(/^\/+/, "");
    const firstBucket = buckets[0];
    return `${supabaseUrl}/storage/v1/object/public/${firstBucket}/${encodeURI(normalizedPath)}`;
  }
}
