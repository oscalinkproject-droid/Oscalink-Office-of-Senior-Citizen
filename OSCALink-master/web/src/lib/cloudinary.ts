import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadRecordScan(fileUri: string, seniorId: string) {
  try {
    const result = await cloudinary.uploader.upload(fileUri, {
      folder: 'oscalink/records',
      public_id: `senior_${seniorId}_id_scan`,
      overwrite: true,
      resource_type: 'image',
    });
    return { success: true, url: result.secure_url };
  } catch (error) {
    console.error('[SYSTEM] Cloudinary Upload Failed:', error);
    return { success: false, error };
  }
}

export default cloudinary;
