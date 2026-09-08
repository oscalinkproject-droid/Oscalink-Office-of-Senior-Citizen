'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function deleteCloudinaryFile(url: string) {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
    // or with folders: https://res.cloudinary.com/{cloud}/image/upload/v{version}/folder/public_id.{ext}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
    if (!match) return { error: 'Could not parse Cloudinary URL' };

    const publicId = match[1];
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });

    if (result.result === 'ok') {
      return { success: true };
    }
    return { error: result.result || 'Deletion failed' };
  } catch (e) {
    console.error('[CLOUDINARY DELETE]', e);
    return { error: 'Deletion failed' };
  }
}
