import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryUploadResult {
  secure_url: string;
}

interface CloudinaryError {
  message: string;
}

cloudinary.config({
  secure: true,
});

function corsResponse(body: Record<string, unknown> | { error: string }, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...init?.headers,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { publicId, resourceType } = await request.json() as { publicId?: string; resourceType?: string };

    if (!publicId) {
      return corsResponse({ error: 'No publicId provided' }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' });

    if (result.result === 'ok' || result.result === 'not found') {
      return corsResponse({ success: true });
    }

    return corsResponse({ error: result.result }, { status: 500 });
  } catch (error) {
    const err = error as CloudinaryError;
    console.error('Delete error:', err);
    return corsResponse({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'oscalink/records';
    const publicId = formData.get('publicId') as string | null;

    if (!file) {
      return corsResponse({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isImage = file.type.startsWith('image/');
    const resourceType: "image" | "raw" | "auto" | "video" = isImage ? 'image' : 'raw';

    const uploadOptions: {
      folder: string;
      resource_type: "image" | "raw" | "auto" | "video";
      public_id?: string;
      overwrite?: boolean;
      invalidate?: boolean;
    } = { 
      folder, 
      resource_type: resourceType 
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
      uploadOptions.invalidate = true;
    }

    const uploadResponse = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        }
      ).end(buffer);
    });

    return corsResponse({ url: uploadResponse.secure_url });
  } catch (error) {
    const err = error as CloudinaryError;
    console.error('Upload error:', err);
    return corsResponse({ error: err.message }, { status: 500 });
  }
}
