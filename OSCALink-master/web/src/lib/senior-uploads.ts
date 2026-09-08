import type { SupabaseClient } from '@supabase/supabase-js';

// Central upload path for senior registration documents (Photos, Birth
// Certificates, Proof of Residency, Digital Signature, Thumbmark).
//
// Primary target is Supabase Storage ("senior-documents" bucket, deployed via
// migration 20260905000002). If that fails (e.g. the bucket migration has not
// been applied yet), we fall back to the legacy Cloudinary upload so nothing
// silently breaks.

export const SENIOR_DOCUMENTS_BUCKET = 'senior-documents';

export function extFromMime(mime: string, name?: string): string {
  const nm = (name || '').toLowerCase();
  if (nm.endsWith('.pdf')) return '.pdf';
  if (nm.endsWith('.png')) return '.png';
  if (nm.endsWith('.bmp')) return '.bmp';
  if (nm.endsWith('.webp')) return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/bmp') return '.bmp';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

export function isImageType(mime: string): boolean {
  return mime.startsWith('image/');
}

function fileNameFor(fieldName: string, ext: string): string {
  return `${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

async function uploadToCloudinary(fieldName: string, blob: Blob, ext: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'oscalink_scans';
  if (!cloudName) throw new Error('CLOUDINARY_CLOUD_NAME is not configured');
  const isPdf = ext === '.pdf';
  const endpoint = isPdf ? 'raw/upload' : 'image/upload';
  const fd = new FormData();
  fd.append('file', blob, `${fieldName}${ext}`);
  fd.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (data.secure_url) return data.secure_url as string;
  throw new Error(data.error?.message || 'Cloudinary upload failed');
}

// Uploads a captured/selected blob for a senior field and returns its public
// URL. Tries Supabase Storage first, then Cloudinary as a fallback. Throws
// only if both fail.
export async function uploadSeniorBlob(
  supabase: SupabaseClient,
  fieldName: string,
  blob: Blob,
): Promise<string> {
  const ext = extFromMime(blob.type, (blob as File | undefined)?.name);
  const path = `seniors/${fieldName}/${fileNameFor(fieldName, ext)}`;

  const supRes = await supabase.storage
    .from(SENIOR_DOCUMENTS_BUCKET)
    .upload(path, blob, { contentType: blob.type || undefined, upsert: true });

  if (!supRes.error) {
    const { data } = supabase.storage.from(SENIOR_DOCUMENTS_BUCKET).getPublicUrl(path);
    if (data.publicUrl) return data.publicUrl;
  }

  return uploadToCloudinary(fieldName, blob, ext);
}