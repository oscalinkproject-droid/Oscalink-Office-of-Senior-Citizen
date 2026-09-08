const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const GH = process.env.GH_PATH || 'gh';

const apkPath = path.join(__dirname, '../../mobile/android/app/build/outputs/apk/release/app-release.apk');
const appJsonPath = path.join(__dirname, '../../mobile/app.json');
const webPublicDir = path.join(__dirname, '../public');

let version = '1.0.0';
try {
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  version = appConfig.expo?.version || version;
} catch {
  console.warn('Warning: Could not read app.json, using default version');
}

const tag = `mobile-v${version}`;

if (!fs.existsSync(apkPath)) {
  console.error(`Error: APK file not found at ${apkPath}`);
  process.exit(1);
}

console.log(`Publishing APK v${version} as GitHub release...`);

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', shell: true }).trim();
}

function runJSON(cmd) {
  const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', shell: true }).trim();
  return out.length > 0 ? JSON.parse(out) : null;
}

try {
  const list = runJSON(`${GH} release list --json tagName`);
} catch (e) {
  console.log('Not logged into GitHub CLI. Run "gh auth login" first.', e.message);
  process.exit(1);
}

const exists = run(`${GH} release view ${tag} --json tagName`).length > 0;
if (exists) {
  run(`${GH} release upload ${tag} "${apkPath}" --clobber`);
  console.log(`APK uploaded to existing release ${tag}`);
} else {
  console.log(`Creating new release ${tag}...`);
  run(`${GH} release create ${tag} "${apkPath}" --title "OSCALink Mobile v${version}" --notes "Release v${version}"`);
  console.log(`Release ${tag} created with APK`);
}

let downloadUrl = '';
try {
  const assets = runJSON(`${GH} release view ${tag} --json assets`);
  const apkAsset = assets?.assets?.find(a => a.name.endsWith('.apk'));
  downloadUrl = apkAsset?.url || `https://github.com/oscalink4-bit/OSCALink/releases/download/${tag}/app-release.apk`;
} catch {
  downloadUrl = `https://github.com/oscalink4-bit/OSCALink/releases/download/${tag}/app-release.apk`;
}

const versionData = {
  version,
  downloadUrl,
  updatedAt: new Date().toISOString(),
};

if (!fs.existsSync(webPublicDir)) {
  fs.mkdirSync(webPublicDir, { recursive: true });
}
fs.writeFileSync(
  path.join(webPublicDir, 'mobile-app.json'),
  JSON.stringify(versionData, null, 2)
);

console.log(`Version info written to web/public/mobile-app.json`);
console.log(`Download URL: ${downloadUrl}`);
