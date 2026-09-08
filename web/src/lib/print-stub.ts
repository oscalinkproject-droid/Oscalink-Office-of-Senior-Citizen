import html2canvas from 'html2canvas';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Captures the in-DOM OSCA Stub / Claim Stub card (identified by elementId)
 * and downloads it as a PNG image. Unlike the print path (which uses a popup
 * window that Windows browsers may block), this renders the on-screen element
 * to a canvas and triggers a real file download via a same-document anchor,
 * so it is not affected by popup blockers or CORS on the fetch.
 */
export async function downloadAccessSlip(
  elementId: string,
  filename: string,
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    const err = new Error(`Stub element "#${elementId}" not found in the DOM.`);
    console.error('[OSCA Stub] Aborting download:', err.message);
    throw err;
  }

  const rect = el.getBoundingClientRect();
  console.log('[OSCA Stub] Capturing element:', {
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  });

  const canvas = await html2canvas(el, {
    scale: 3,
    backgroundColor: null,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  console.log(`[OSCA Stub] Rendered canvas ${canvas.width}x${canvas.height}.`);

  // Blob object URL is more reliable than a data: URL, which Edge/Chrome can
  // truncate for larger PNGs.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) {
    throw new Error('HTML snapshot produced an empty image blob.');
  }
  console.log(`[OSCA Stub] Image blob ready (${(blob.size / 1024).toFixed(1)} KB).`);

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`[OSCA Stub] Download triggered: "${filename}"`);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function formatBirthday(birthdate?: string | null): string {
  if (!birthdate) return '';
  return new Date(birthdate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Opens a print-ready "Mobile App Access Slip" showing the senior's name,
 * large reference number, and birthday password. Used at registration and for
 * reprinting later from the Senior Citizen Profile view.
 */
export function printAccessSlip(senior: { full_name: string; registration_id: string; birthdate?: string | null }) {
  const w = window.open('', '_blank', 'width=560,height=760');
  if (!w) return;
  const name = escapeHtml(senior.full_name);
  const ref = escapeHtml(senior.registration_id);
  const birth = escapeHtml(formatBirthday(senior.birthdate));
  w.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OSCALINK - Mobile App Access Slip</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; background: #fff; color: #111; }
    .slip { max-width: 440px; margin: 0 auto; border: 3px dashed #006837; border-radius: 16px; padding: 28px; }
    .header { text-align: center; border-bottom: 2px solid #006837; padding-bottom: 14px; margin-bottom: 20px; }
    .header h1 { font-size: 26px; margin: 0 0 4px; color: #006837; letter-spacing: 1px; }
    .header p { margin: 0; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 2px; }
    .row { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 6px; }
    .name { font-size: 22px; font-weight: 700; }
    .large { font-size: 46px; font-weight: 900; line-height: 1.05; word-break: break-all; }
    .ref { color: #006837; }
    .birth { color: #111; }
    .note { border-top: 1px dashed #bbb; padding-top: 14px; font-size: 15px; font-weight: 700; text-align: center; color: #333; }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <h1>OSCALINK</h1>
      <p>Mobile App Access Slip</p>
    </div>
    <div class="row">
      <div class="label">Pangalan ng Senior</div>
      <div class="name">${name}</div>
    </div>
    <div class="row">
      <div class="label">Mobile App Reference Number</div>
      <div class="large ref">${ref}</div>
    </div>
    <div class="row">
      <div class="label">Password (Birthday)</div>
      <div class="large birth">${birth}</div>
    </div>
    <div class="note">Gamitin ang Reference Number at Birthday para mag-log in sa Mobile App. Magiging OSCA Number na ito kapag na-approve na.</div>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
