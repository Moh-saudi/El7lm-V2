// Storage wrapper - يستخدم Cloudflare R2 عبر storageManager الموحد
import { storageManager } from '@/lib/storage';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
) {
  const result = await storageManager.upload(bucket, path, file, {
    upsert: options?.upsert,
    cacheControl: options?.cacheControl,
    contentType: file.type,
  });
  return { path: result.path };
}

export async function getPublicUrl(bucket: string, path: string) {
  const publicUrl = await storageManager.getPublicUrl(bucket, path);
  return { publicUrl };
}

export async function deleteFile(bucket: string, path: string) {
  await storageManager.delete(bucket, path);
}

export async function listFiles(bucket: string, path: string) {
  return storageManager.list(bucket, path);
}
