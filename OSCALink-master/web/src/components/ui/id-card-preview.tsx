"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { normalizeOscaId } from "@/lib/os-id";

interface SeniorForCard {
  full_name: string;
  registration_id: string;
  id_number?: string | null;
  birthdate?: string | null;
  barangay?: string | null;
  purok?: string | null;
  is_pensioner?: boolean;
  profile_photo_url?: string | null;
  digital_signature_url?: string | null;
  thumbmark_url?: string | null;
  created_at?: string;
  status?: string;
  headSignature?: string | null;
  headName?: string | null;
}

interface IDCardPreviewProps {
  senior: SeniorForCard;
}

export function IDCardPreview({ senior }: IDCardPreviewProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [demo, setDemo] = useState(false);

  const isDemo = demo;
  const isGreen = !isDemo && senior.is_pensioner;
  const bgColor = isDemo ? '#9CA3AF' : isGreen ? '#006837' : '#FFFFFF';
  const textColor = isDemo ? '#FFFFFF' : isGreen ? '#FFFFFF' : '#111111';
  const muteColor = isDemo ? 'rgba(255,255,255,0.78)' : isGreen ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const stripeColor = isDemo ? '#6B7280' : isGreen ? '#004d28' : '#e5e7eb';
  const photoBg = isDemo ? 'rgba(255,255,255,0.28)' : isGreen ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  const displayName = isDemo ? 'JUAN DELA CRUZ' : senior.full_name;
  const displayId = isDemo ? 'DEMO-2026-0000' : normalizeOscaId(senior.status, senior.id_number || senior.registration_id);

  const formatDate = (d?: string | null) => {
    if (!d) return '';
    return new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleDownloadBoth = async () => {
    setDownloading(true);
    try {
      const frontEl = frontRef.current;
      const backEl = backRef.current;

      if (!frontEl || !backEl) {
        setDownloading(false);
        return;
      }

      const prevFrontDisplay = frontEl.style.display;
      const prevBackDisplay = backEl.style.display;

      frontEl.style.display = 'block';
      backEl.style.display = 'none';
      await new Promise(r => setTimeout(r, 100));
      const frontCanvas = await html2canvas(frontEl, { scale: 4, backgroundColor: null, useCORS: true, allowTaint: true });

      frontEl.style.display = 'none';
      backEl.style.display = 'block';
      await new Promise(r => setTimeout(r, 100));
      const backCanvas = await html2canvas(backEl, { scale: 4, backgroundColor: null, useCORS: true, allowTaint: true });

      frontEl.style.display = prevFrontDisplay;
      backEl.style.display = prevBackDisplay;

      const downloadLink = (canvas: HTMLCanvasElement, filename: string) => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      downloadLink(frontCanvas, `OSCA-ID-${senior.registration_id}-front.jpg`);
      downloadLink(backCanvas, `OSCA-ID-${senior.registration_id}-back.jpg`);
    } catch (e) {
      console.error('Download failed:', e);
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setView('front')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === 'front' ? 'bg-primary text-white' : 'bg-surface-high text-outline hover:text-foreground'
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setView('back')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === 'back' ? 'bg-primary text-white' : 'bg-surface-high text-outline hover:text-foreground'
          }`}
        >
          Back
        </button>
        <button
          onClick={() => setDemo(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            demo ? 'bg-amber-500 text-white' : 'bg-surface-high text-outline hover:text-foreground'
          }`}
        >
          {demo ? 'Demo: ON (Grey)' : 'Demo Template'}
        </button>
      </div>

      {/* Card Preview */}
      <div className="flex justify-center">
        <div
          ref={frontRef}
          className="flex-shrink-0 overflow-hidden"
          style={{
            display: view === 'front' ? 'block' : 'none',
            width: '340px',
            height: '214px',
            backgroundColor: bgColor,
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: isGreen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: textColor,
            }}>PH</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: textColor, letterSpacing: '0.5px' }}>
                OFFICE FOR SENIOR CITIZEN AFFAIRS
              </div>
              <div style={{ fontSize: '5.5px', fontWeight: 600, color: muteColor }}>
                COTABATO CITY &bull; BARMM
              </div>
            </div>
            <div style={{
              fontSize: '7px', fontWeight: 800, color: textColor,
              background: isGreen ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
              padding: '2px 6px', borderRadius: '3px',
            }}>
              SENIOR CITIZEN
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', padding: '6px 14px 8px', gap: '12px', flex: 1 }}>
            {/* Photo */}
            <div style={{
              width: '72px', height: '90px', borderRadius: '6px',
              background: photoBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden', border: isGreen ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.1)',
            }}>
              {!isDemo && senior.profile_photo_url ? (
                <img src={senior.profile_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <span style={{ fontSize: '22px', color: muteColor, fontWeight: 700 }}>
                  {isDemo ? 'SC' : (senior.full_name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: '7px', color: muteColor, fontFamily: 'monospace' }}>
                ID: {displayId}
              </div>
              <div style={{ fontSize: '7px', color: textColor, fontWeight: 500 }}>
                {senior.birthdate ? `Born: ${formatDate(senior.birthdate)}` : ''}
              </div>
              <div style={{ fontSize: '7px', color: textColor, fontWeight: 500 }}>
                {senior.barangay ? `Brgy. ${senior.barangay}` : ''}{senior.purok ? `, ${senior.purok}` : ''}
              </div>
            </div>
          </div>

          {/* Signature + Thumbmark */}
          <div style={{ padding: '0 14px 6px', display: 'flex', gap: '8px', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 600, color: muteColor, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Cardholder Signature
              </div>
              {senior.digital_signature_url ? (
                <img src={senior.digital_signature_url} alt="Signature" crossOrigin="anonymous" style={{ height: '22px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '6px', color: muteColor, fontStyle: 'italic', lineHeight: '22px' }}>No signature</div>
              )}
            </div>
            {senior.thumbmark_url && (
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: '5.5px', fontWeight: 600, color: muteColor, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Thumbmark
                </div>
                <img src={senior.thumbmark_url} alt="Thumbmark" crossOrigin="anonymous" style={{ height: '26px', width: '26px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)', margin: '0 auto' }} />
              </div>
            )}
          </div>

          {/* Bottom stripe */}
          <div style={{
            height: '4px', backgroundColor: stripeColor,
            position: 'absolute', bottom: 0, left: 0, right: 0,
          }} />
          {/* Color indicator dot */}
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: isGreen ? '#00ff88' : '#d1d5db',
            position: 'absolute', bottom: '8px', right: '12px',
            border: '1px solid rgba(0,0,0,0.1)',
          }} />
          {isDemo && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ transform: 'rotate(-20deg)', fontSize: '28px', fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', border: '3px solid rgba(255,255,255,0.35)', padding: '4px 16px', borderRadius: '8px' }}>
                SAMPLE
              </div>
            </div>
          )}
        </div>
        <div
          ref={backRef}
          className="flex-shrink-0 overflow-hidden"
          style={{
            display: view === 'back' ? 'block' : 'none',
            width: '340px',
            height: '214px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Back content */}
          <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* OSCA Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#006837', letterSpacing: '0.5px' }}>
                OFFICE FOR SENIOR CITIZEN AFFAIRS
              </div>
              <div style={{ fontSize: '6px', color: '#666', marginTop: '1px' }}>
                COTABATO CITY &bull; BARMM
              </div>
            </div>

            {/* Signature Area */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                {isDemo ? 'JUAN A. DELA CRUZ' : (senior.headName || 'OSCA HEAD')}
              </div>
              {!isDemo && senior.headSignature ? (
                <img src={senior.headSignature} alt="OSCA Head Signature" crossOrigin="anonymous" style={{ height: '36px', maxWidth: '140px', margin: '0 auto 2px', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '9px', color: '#333', fontWeight: 700, fontStyle: 'italic', padding: '4px 0' }}>
                  (Signature)
                </div>
              )}
              <div style={{ fontSize: '6px', color: '#666', marginTop: '4px' }}>
                Authorized Signatory
              </div>
            </div>

            {/* QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(`https://oscalink.vercel.app/verify?code=${displayId}`)}&margin=2`}
                alt="QR"
                width={56}
                height={56}
                style={{ borderRadius: '3px' }}
                crossOrigin="anonymous"
              />
            </div>

            {/* Issued / Valid */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '6px', color: '#666' }}>
                Valid only within Cotabato City
              </div>
              <div style={{ fontSize: '6px', color: '#999', marginTop: '2px' }}>
                Issued: {senior.created_at ? formatDate(senior.created_at) : '—'}
              </div>
              <div style={{ fontSize: '5px', color: '#aaa', marginTop: '2px' }}>
                This card is property of OSCA Cotabato City. If found, please return to the nearest OSCA office.
              </div>
            </div>
          </div>

          {/* Color stripe at bottom */}
          <div style={{
            height: '4px', backgroundColor: isGreen ? '#006837' : '#e5e7eb',
            position: 'absolute', bottom: 0, left: 0, right: 0,
          }} />
          {isDemo && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ transform: 'rotate(-20deg)', fontSize: '28px', fontWeight: 800, color: 'rgba(0,0,0,0.12)', letterSpacing: '2px', border: '3px solid rgba(0,0,0,0.12)', padding: '4px 16px', borderRadius: '8px' }}>
                SAMPLE
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {senior.status !== 'Active' ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="material-symbols-outlined text-amber-400">pending</span>
            <p className="text-xs text-amber-400 font-bold">Pending Approval</p>
          </div>
          <p className="text-[10px] text-amber-400/80">
             This ID requires approval from the OSCA Head before it can be downloaded.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={handleDownloadBoth}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            {downloading ? 'Generating...' : 'Download (JPG)'}
          </button>
        </div>
      )}

      {/* Second download prompt removed — now uses browser confirm() dialog */}

      <p className="text-[9px] text-outline/60 text-center">
         Credit card size (85.60 × 53.98 mm) &bull; 300 DPI
      </p>
    </div>
  );
}
