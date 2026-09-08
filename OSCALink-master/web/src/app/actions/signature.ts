'use server';

import { createServerClient as createClient } from '@/lib/supabase-server';
import { v2 as cloudinary } from 'cloudinary';

const cloudUrl = process.env.CLOUDINARY_URL;
if (cloudUrl) {
  const parsed = new URL(cloudUrl);
  cloudinary.config({
    cloud_name: parsed.hostname,
    api_key: parsed.username,
    api_secret: parsed.password,
    secure: true,
  });
}

export async function updateHeadName(name: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('role', 'osca_head');

    if (error) return { error: 'Failed to update name' };
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function updateOfficeInfo(data: {
  office_address?: string;
  office_map_url?: string;
  office_contact?: string;
}) {
  try {
    const supabase = await createClient();
    const updates: Record<string, string> = {};
    if (data.office_address !== undefined) updates.office_address = data.office_address;
    if (data.office_map_url !== undefined) updates.office_map_url = data.office_map_url;
    if (data.office_contact !== undefined) updates.office_contact = data.office_contact;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('role', 'osca_head');

    if (error) return { error: 'Failed to update office info' };
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function uploadHeadSignature(formData: FormData) {
  const file = formData.get('signature') as File;
  if (!file) return { error: 'No signature provided' };

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: 'oscalink/signatures',
      resource_type: 'image',
      overwrite: true,
      public_id: 'osca_head_signature',
    });

    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ signature_url: result.secure_url })
      .eq('role', 'osca_head');

    if (error) return { error: 'Failed to save signature' };

    return { success: true, url: result.secure_url };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
