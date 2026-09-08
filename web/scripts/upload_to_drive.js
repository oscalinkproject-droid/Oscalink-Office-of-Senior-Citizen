const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { google } = require('googleapis');
const readline = require('readline');
const { exec } = require('child_process');

const TOKEN_PATH = path.join(__dirname, '.google-token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google-oauth.json');
const APK_PATH = path.join(__dirname, '../../mobile/android/app/build/outputs/apk/release/app-release.apk');
const APP_JSON_PATH = path.join(__dirname, '../../mobile/app.json');
const WEB_PUBLIC = path.join(__dirname, '../public');

const FOLDER_ID = '1cYSdvZnP_tzONuzV5T2LbKTJRUz_pQev';
const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

function getVersion() {
  let version = '1.0.0';
  try {
    const cfg = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    version = cfg.expo?.version || version;
  } catch { /* use default */ }
  return version;
}

function log(msg) { console.log(`[DRIVE] ${msg}`); }
function fail(msg) { console.error(`[ERROR] ${msg}`); process.exit(1); }

async function getOAuth2Client() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    fail(`Missing ${CREDENTIALS_PATH}. Create an OAuth 2.0 Client ID (Desktop) in Google Cloud Console and download the JSON.`);
  }
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret } = creds.web || creds.installed;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);

    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        token.refresh_token = tokens.refresh_token;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
        log('Refresh token updated.');
      }
    });
    return oauth2Client;
  }

  log('No stored token found. Opening browser for OAuth consent...');
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent',
  });

  exec(`start "" "${authUrl}"`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise((resolve) => {
    rl.question('\nPaste the authorization code from your browser: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    log('Token saved.');
    return oauth2Client;
  } catch (e) {
    fail(`Failed to get token: ${e.message}`);
  }
}

async function findLatestVersion() {
  if (!API_KEY) {
    fail('GOOGLE_DRIVE_API_KEY is not set in environment variables.');
  }

  const query = encodeURIComponent(`'${FOLDER_ID}' in parents and name contains 'OSCALINK-v' and mimeType='application/vnd.android.package-archive'`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&trashed=false&orderBy=name desc&pageSize=10&key=${API_KEY}&fields=files(id,name)`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.files || data.files.length === 0) {
    log('No existing versions found. Starting at v1.');
    return 1;
  }

  let highest = 0;
  for (const f of data.files) {
    const match = f.name.match(/OSCALINK-v(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }

  return highest > 0 ? highest + 1 : 1;
}

async function uploadAPK(auth, versionNum, appVersion) {
  if (!fs.existsSync(APK_PATH)) {
    fail(`APK not found at ${APK_PATH}. Build the mobile app first.`);
  }

  const drive = google.drive({ version: 'v3', auth });
  const fileName = `OSCALINK-v${versionNum}.apk`;
  const fileSize = fs.statSync(APK_PATH).size;

  log(`Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(1)} MB)...`);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [FOLDER_ID],
      mimeType: 'application/vnd.android.package-archive',
    },
    media: {
      mimeType: 'application/vnd.android.package-archive',
      body: fs.createReadStream(APK_PATH),
    },
    fields: 'id,name,webViewLink,webContentLink,size',
  });

  const file = res.data;
  log(`Uploaded: ${file.name} (ID: ${file.id})`);

  // Make publicly accessible
  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });
  log('File set to public.');

  return file;
}

async function main() {
  log('=== OSCALink Google Drive APK Upload ===');
  log(`App version: ${getVersion()}`);

  const latest = await findLatestVersion();
  log(`Next version: OSCALINK-v${latest}`);

  const auth = await getOAuth2Client();

  if (!fs.existsSync(TOKEN_PATH)) {
    log('Please authorize and run again.');
    return;
  }

  const file = await uploadAPK(auth, latest, getVersion());

  // Build the download URL
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;

  // Update web/public/mobile-app.json
  const versionData = {
    version: getVersion(),
    versionName: `OSCALINK-v${latest}`,
    downloadUrl,
    driveFileId: file.id,
    updatedAt: new Date().toISOString(),
  };

  if (!fs.existsSync(WEB_PUBLIC)) {
    fs.mkdirSync(WEB_PUBLIC, { recursive: true });
  }
  fs.writeFileSync(
    path.join(WEB_PUBLIC, 'mobile-app.json'),
    JSON.stringify(versionData, null, 2)
  );
  log(`mobile-app.json updated with download URL: ${downloadUrl}`);

  log('=== Upload complete ===');
}

main().catch((err) => fail(err.message));
