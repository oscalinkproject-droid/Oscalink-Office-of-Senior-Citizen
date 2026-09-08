import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FOLDER_ID = '1cYSdvZnP_tzONuzV5T2LbKTJRUz_pQev';
// Default GitHub release download URL when no mobile-app.json is present.
// Published by web/scripts/upload_apk.js as `tag = mobile-v{version}`.
const DEFAULT_GITHUB_URL = 'https://github.com/oscalink4-bit/OSCALink/releases/latest/download/app-release.apk';

// Read downloadUrl from web/public/mobile-app.json (written by upload_apk.js).
async function resolveGithubUrl(): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'mobile-app.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (data && data.downloadUrl) return data.downloadUrl;
  } catch {
    // File missing or invalid — use the default.
  }
  return DEFAULT_GITHUB_URL;
}

async function streamFromUrl(downloadUrl: string, fallbackName: string): Promise<{ body: ReadableStream | null; headers: Headers } | null> {
  try {
    const fileRes = await fetch(downloadUrl, { redirect: 'follow' });
    if (!fileRes.ok) return null;

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.android.package-archive');
    headers.set('Content-Disposition', `attachment; filename="${fallbackName || 'OSCALink.apk'}"`);
    const len = fileRes.headers.get('Content-Length');
    if (len) headers.set('Content-Length', len);

    return { body: fileRes.body, headers };
  } catch {
    return null;
  }
}

function assetNameFromUrl(url: string): string {
  try {
    const name = decodeURIComponent(url.split('/').pop() || 'app-release.apk');
    return name || 'OSCALink.apk';
  } catch {
    return 'OSCALink.apk';
  }
}

export async function GET(_request: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  // --- Attempt 1: Google Drive folder (only if an API key is configured) ---
  if (apiKey) {
    try {
      // Find the latest file in the folder
      const query = encodeURIComponent(`'${FOLDER_ID}' in parents`);
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&trashed=false&orderBy=modifiedTime desc&pageSize=1&key=${apiKey}&fields=files(id,name)`;

      const listRes = await fetch(listUrl);
      const listData = await listRes.json();

      const file = listData?.files?.[0];
      if (file?.id) {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
        const stream = await streamFromUrl(downloadUrl, file.name || 'OSCALink.apk');
        if (stream) {
          return new NextResponse(stream.body, { status: 200, headers: stream.headers });
        }
      }
      console.warn('[API] Drive lookup failed; falling back to GitHub release.');
    } catch (err) {
      console.warn('[API] Drive download failed:', err);
      console.warn('[API] Falling back to GitHub release.');
    }
  }

  // --- Attempt 2: GitHub release APK (from mobile-app.json or default URL) ---
  const githubUrl = await resolveGithubUrl();

  const stream = await streamFromUrl(githubUrl, assetNameFromUrl(githubUrl));
  if (stream) {
    return new NextResponse(stream.body, { status: 200, headers: stream.headers });
  }

  console.error('[API] Download failed for both Drive and GitHub.');
  return NextResponse.json({ error: 'Download failed' }, { status: 500 });
}
