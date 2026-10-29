import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface FileStorage {
  /** Stores an image and returns its public URL. */
  saveImage(data: Buffer, mimeType: string): Promise<string>;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const ALLOWED_IMAGE_TYPES = Object.keys(EXT);

/** Saves uploads to a local folder served at PUBLIC_UPLOAD_BASE. Replace with S3/R2 in production. */
export function createLocalStorage(dir: string, publicBase: string): FileStorage {
  return {
    async saveImage(data, mimeType) {
      const ext = EXT[mimeType];
      if (!ext) throw new Error(`Unsupported image type ${mimeType}`);
      await mkdir(dir, { recursive: true });
      const name = `${randomUUID()}.${ext}`;
      await writeFile(path.join(dir, name), data);
      return `${publicBase}/${name}`;
    },
  };
}
