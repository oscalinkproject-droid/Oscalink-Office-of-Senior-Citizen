"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CameraCapture } from "@/components/ui/camera-capture";
import { DocumentScanner } from "@/components/ui/document-scanner";
import { SignaturePad } from "@/components/ui/signature-pad";

/* -------------------------------------------------------------------------- */
/*  PhotoCaptureField                                                         */
/* -------------------------------------------------------------------------- */

interface PhotoFieldProps {
  fieldName: string;
  label: string;
  required?: boolean;
  existingUrl?: string | null;
  onFileReady: (fieldName: string, blob: Blob, previewUrl: string) => void;
}

export function PhotoCaptureField({ fieldName, label, required, existingUrl, onFileReady }: PhotoFieldProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const handleCapture = (blob: Blob) => {
    setShowCamera(false);
    const previewUrl = URL.createObjectURL(blob);
    setPreview(previewUrl);
    // Mark the hidden input as pending so the step-4 required-document check
    // passes for a newly captured photo that has not been uploaded yet.
    if (hiddenRef.current) hiddenRef.current.value = '__pending__';
    onFileReady(fieldName, blob, previewUrl);
  };

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (hiddenRef.current) hiddenRef.current.value = existingUrl || '';
  };

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={fieldName} id={`upload-${fieldName}`} value={existingUrl || ''} ref={hiddenRef} />
      <label className="text-[10px] font-bold uppercase tracking-widest text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">photo_camera</span>
        {label}{required ? ' *' : ''}
      </label>
      {preview ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <img src={preview} alt="" className="w-10 h-10 rounded object-cover" />
          <span className="text-[10px] text-emerald-400 flex-1">Photo captured</span>
          <button type="button" onClick={() => window.open(preview, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
          <button type="button" onClick={() => setShowCamera(true)} className="text-[10px] text-primary font-bold hover:underline">Retake</button>
          <button type="button" onClick={remove} className="text-[10px] text-red-500/70 font-bold hover:text-red-500 transition-colors">Remove</button>
        </div>
      ) : existingUrl ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <img src={existingUrl} alt="" className="w-10 h-10 rounded object-cover" />
          <span className="text-[10px] text-emerald-400 flex-1">Existing photo on file</span>
          <button type="button" onClick={() => window.open(existingUrl, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
          <button type="button" onClick={() => setShowCamera(true)} className="text-[10px] text-primary font-bold hover:underline">Replace</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowCamera(true)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full text-left">
          <span className="material-symbols-outlined text-outline text-sm">photo_camera</span>
          <span className="text-[10px] text-outline">Open Camera</span>
          <span className="ml-auto material-symbols-outlined text-primary/70 text-sm">arrow_forward</span>
        </button>
      )}
      {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SignatureCaptureField                                                     */
/* -------------------------------------------------------------------------- */

export function SignatureCaptureField({ fieldName, label, existingUrl, onFileReady }: { fieldName: string; label: string; existingUrl?: string | null; onFileReady: (fieldName: string, blob: Blob, previewUrl: string) => void }) {
  const [showPad, setShowPad] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const handleSave = (blob: Blob) => {
    setShowPad(false);
    const previewUrl = URL.createObjectURL(blob);
    setPreview(previewUrl);
    if (hiddenRef.current) hiddenRef.current.value = '__pending__';
    onFileReady(fieldName, blob, previewUrl);
  };

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  const remove = () => { if (preview) URL.revokeObjectURL(preview); setPreview(null); if (hiddenRef.current) hiddenRef.current.value = existingUrl || ''; };

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={fieldName} id={`upload-${fieldName}`} value={existingUrl || ''} ref={hiddenRef} />
      <label className="text-[10px] font-bold uppercase tracking-widest text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">ink_pen</span>
        {label} *
      </label>
      {preview ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <img src={preview} alt="" className="w-10 h-10 rounded object-contain bg-white" />
          <span className="text-[10px] text-emerald-400 flex-1">Signature captured</span>
          <button type="button" onClick={() => window.open(preview, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
          <button type="button" onClick={() => setShowPad(true)} className="text-[10px] text-primary font-bold hover:underline">Recapture</button>
          <button type="button" onClick={remove} className="text-[10px] text-red-500/70 font-bold hover:text-red-500 transition-colors">Remove</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowPad(true)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full text-left">
          <span className="material-symbols-outlined text-outline text-sm">ink_pen</span>
          <span className="text-[10px] text-outline">Capture from Signature Pad</span>
          <span className="ml-auto material-symbols-outlined text-primary/70 text-sm">arrow_forward</span>
        </button>
      )}
      {showPad && <SignaturePad onSave={handleSave} onClose={() => setShowPad(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FileCaptureField — PDF preview chip + Replace/Remove                      */
/* -------------------------------------------------------------------------- */

export function FileCaptureField({ fieldName, label, accept, icon, buttonLabel, buttonIcon, required, existingUrl, hasError, capture, scan, onFileReady }: {
  fieldName: string; label: string; accept?: string; icon?: string; buttonLabel?: string; buttonIcon?: string;
  required?: boolean; existingUrl?: string | null; hasError?: boolean; capture?: boolean; scan?: boolean;
  onFileReady?: (fieldName: string, blob: Blob) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [filePending, setFilePending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [existingLabel] = useState(existingUrl ? (existingUrl.split('/').pop()?.split('?')[0] || 'Existing file') : '');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(previewUrl);
    setFileName(file.name);
    setFileMime(file.type);
    setFilePending(true);
    if (hiddenRef.current) hiddenRef.current.value = '__pending__';
    if (e.target.value) e.target.value = '';
    onFileReady?.(fieldName, file);
  };

  // Result of the in-app scanner modal (webcam snapshot or USB-scanner file).
  const handleScanned = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
    setFileName(blob instanceof File && blob.name ? blob.name : `Scanned ${label}`);
    setFileMime(blob.type);
    setFilePending(true);
    setShowScanner(false);
    if (hiddenRef.current) hiddenRef.current.value = '__pending__';
    onFileReady?.(fieldName, blob);
  };

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  const acceptStr = accept || (fieldName.includes('signature') || fieldName.includes('thumb') ? 'image/*' : 'image/*,application/pdf');
  const isPdf = fileMime === 'application/pdf' || existingUrl?.toLowerCase()?.endsWith('.pdf');
  const actionText = buttonLabel || (scan ? `Scan ${label}` : `Upload ${label}`);
  const actionIcon = buttonIcon || (scan ? 'document_scanner' : 'add_photo_alternate');

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    setFileMime(null);
    setFilePending(false);
    if (hiddenRef.current) hiddenRef.current.value = existingUrl || '';
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">{icon || (scan ? 'document_scanner' : 'upload_file')}</span>
        {label}{required ? ' *' : ''}
      </label>
      <input type="hidden" name={fieldName} id={`upload-${fieldName}`} value={existingUrl || ''} ref={hiddenRef} />
      <input type="hidden" name={`__blob_${fieldName}`} value={filePending ? 'pending' : ''} />
      {preview ? (
        isPdf ? (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
            <span className="material-symbols-outlined text-sm text-red-500">picture_as_pdf</span>
            <span className="text-[10px] text-emerald-400 flex-1 truncate">{fileName || 'Selected'}</span>
            {scan ? (
              <button type="button" onClick={() => setShowScanner(true)} className="text-[10px] text-primary font-bold hover:underline">Rescan</button>
            ) : (
              <label className="text-[10px] text-primary font-bold cursor-pointer hover:underline">Change</label>
            )}
            <input type="file" accept={acceptStr} capture={capture} onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => window.open(preview, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
            <button type="button" onClick={remove} className="text-[10px] text-red-500/70 font-bold hover:text-red-500 transition-colors">Remove</button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
            <img src={preview} alt="" className="w-10 h-10 rounded object-cover" />
            <span className="text-[10px] text-emerald-400 flex-1 truncate">{fileName || 'Selected'}</span>
            {scan ? (
              <button type="button" onClick={() => setShowScanner(true)} className="text-[10px] text-primary font-bold hover:underline">Rescan</button>
            ) : (
              <label className="text-[10px] text-primary font-bold cursor-pointer hover:underline">Change</label>
            )}
            <input type="file" accept={acceptStr} capture={capture} onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => window.open(preview, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
            <button type="button" onClick={remove} className="text-[10px] text-red-500/70 font-bold hover:text-red-500 transition-colors">Remove</button>
          </div>
        )
      ) : existingUrl ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <span className="material-symbols-outlined text-sm text-emerald-400">task_alt</span>
          <span className="text-[10px] text-emerald-400 flex-1 truncate">{existingLabel} — on file</span>
          {scan ? (
            <button type="button" onClick={() => setShowScanner(true)} className="text-[10px] text-primary font-bold hover:underline">Rescan</button>
          ) : (
            <label className="text-[10px] text-primary font-bold cursor-pointer hover:underline">Change</label>
          )}
          <input type="file" accept={acceptStr} capture={capture} onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => window.open(existingUrl, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
        </div>
      ) : scan ? (
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full text-left"
        >
          <span className="material-symbols-outlined text-outline text-sm">{actionIcon}</span>
          <span className="text-[10px] text-outline">{actionText}</span>
          <span className="ml-auto material-symbols-outlined text-primary/70 text-sm">arrow_forward</span>
        </button>
      ) : (
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full cursor-pointer">
          <span className="material-symbols-outlined text-outline text-sm">{actionIcon}</span>
          <span className="text-[10px] text-outline">{actionText}</span>
          <input type="file" accept={acceptStr} capture={capture} onChange={handleFile} className="hidden" />
        </label>
      )}
      {hasError && (
        <p className="text-[10px] text-red-500 font-medium">This document is required</p>
      )}
      {showScanner && scan && <DocumentScanner onCapture={handleScanned} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ThumbmarkCaptureField — WebUSB fingerprint + image file upload            */
/* -------------------------------------------------------------------------- */

// Common USB fingerprint reader vendor IDs: DigitalPersona (0x05BA),
// Synaptics/Validity (0x138A). These are used with navigator.usb.requestDevice
// to present the user with a chooser for available scanners.
const FINGERPRINT_VENDORS = [
  { vendorId: 0x05ba }, // DigitalPersona U.are.U
  { vendorId: 0x138a }, // Validity/Synaptics
  { vendorId: 0x09c8 }, // DigitalPersona (older)
];

// Minimal WebUSB typings (the project's TS lib does not ship usb.d.ts).
interface WebUsbEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
}
interface WebUsbInterface {
  interfaceNumber: number;
  alternate?: { endpoints?: WebUsbEndpoint[] };
}
interface WebUsbDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  configuration: { interfaces: WebUsbInterface[] } | null;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<{ data?: DataView }>;
}
interface WebUsb {
  requestDevice(options: { filters: { vendorId: number }[] }): Promise<WebUsbDevice | undefined>;
}

function isFingerprintImage(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // PNG magic
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // JPEG magic
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // BMP magic
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;
  return false;
}

function detectType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return 'image/png';
}

export function ThumbmarkCaptureField({ fieldName, label, existingUrl, hasError, onFileReady }: {
  fieldName: string; label: string; existingUrl?: string | null; hasError?: boolean;
  onFileReady?: (fieldName: string, blob: Blob, previewUrl?: string) => void;
}) {
  const [mode, setMode] = useState<'upload' | 'usb'>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [filePending, setFilePending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const existingLabel = existingUrl ? (existingUrl.split('/').pop()?.split('?')[0] || 'Existing file') : '';

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]);

  // ---- File upload mode ----
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
    setFileName(file.name);
    setFilePending(true);
    setScanStatus(null);
    if (hiddenRef.current) hiddenRef.current.value = '__pending__';
    if (e.target.value) e.target.value = '';
    onFileReady?.(fieldName, file, url);
  };

  // ---- USB fingerprint scanner ----
  const handleUsbScan = useCallback(async () => {
    setIsScanning(true);
    setScanStatus(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (!nav.usb) {
        setScanStatus('WebUSB is not supported in this browser. Use "Upload Image" instead.');
        return;
      }
      const device = await (nav.usb as WebUsb).requestDevice({ filters: FINGERPRINT_VENDORS });
      if (!device) {
        setScanStatus('No fingerprint reader selected.');
        return;
      }
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      const iface = device.configuration?.interfaces?.find(
        (item: WebUsbInterface) => (item.alternate?.endpoints?.length ?? 0) >= 3,
      ) ?? device.configuration?.interfaces?.[0];
      if (iface) {
        try { await device.claimInterface(iface.interfaceNumber); } catch { /* some drivers manage claiming internally */ }
      }
      const endpoints = device.configuration?.interfaces?.flatMap(
        (f: WebUsbInterface) => f.alternate?.endpoints ?? [],
      ) ?? [];
      const inEnd = endpoints.find((ep: WebUsbEndpoint) => ep.direction === 'in');
      if (!inEnd) throw new Error('Reader has no data endpoint — use a DigitalPersona U.are.U device');
      const result = await device.transferIn(inEnd.endpointNumber, 0);
      const buffer = result.data?.buffer as ArrayBuffer | undefined;
      const data = new Uint8Array(buffer ?? new ArrayBuffer(0));
      await device.close();
      if (data.length > 1024 && isFingerprintImage(data)) {
        const mime = detectType(data);
        const blob = new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(url);
        setFileName('usb-fingerprint');
        setFilePending(true);
        if (hiddenRef.current) hiddenRef.current.value = '__pending__';
        onFileReady?.(fieldName, blob, url);
        setScanStatus('Fingerprint captured from USB reader.');
      } else {
        throw new Error('Reader did not return a usable fingerprint image');
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Unknown error';
      if (msg.includes('No device selected') || msg.includes('cancelled')) {
        setScanStatus('Selection cancelled.');
      } else {
        setScanStatus(`USB capture failed (${msg}). DigitalPersona readers require the vendor SDK — use "Upload Image" instead.`);
      }
    } finally {
      setIsScanning(false);
    }
  }, [fieldName, onFileReady, preview]);

  const remove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFilePending(false);
    setFileName(null);
    setScanStatus(null);
    setReplacing(true);
    if (hiddenRef.current) hiddenRef.current.value = existingUrl || '';
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs">fingerprint</span>
        {label}
      </label>
      <input type="hidden" name={fieldName} id={`upload-${fieldName}`} value={existingUrl || ''} ref={hiddenRef} />
      <input type="hidden" name={`__blob_${fieldName}`} value={filePending ? 'pending' : ''} />

      {preview ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <img src={preview} alt="" className="w-10 h-10 rounded object-cover border border-outline-variant/20" />
          <span className="text-[10px] text-emerald-400 flex-1 truncate">{fileName || 'Captured'}</span>
          <button type="button" onClick={() => window.open(preview, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
          <button type="button" onClick={remove} className="text-[10px] text-red-500/70 font-bold hover:text-red-500 transition-colors">Remove</button>
        </div>
      ) : existingUrl && !replacing ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-low border border-outline-variant/30">
          <span className="material-symbols-outlined text-sm text-emerald-400">task_alt</span>
          <span className="text-[10px] text-emerald-400 flex-1 truncate">{existingLabel} — on file</span>
          <button type="button" onClick={() => window.open(existingUrl, '_blank')} className="text-[10px] text-outline font-bold hover:text-foreground transition-colors">View</button>
          <button type="button" onClick={() => setReplacing(true)} className="text-[10px] text-primary font-bold hover:underline">Replace</button>
        </div>
      ) : (
        <>
          <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden text-[10px] font-bold uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 transition-colors ${mode === 'upload' ? 'bg-primary/15 text-primary' : 'bg-surface-low text-outline hover:bg-surface-low/80'}`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setMode('usb')}
              className={`flex-1 py-2 transition-colors ${mode === 'usb' ? 'bg-primary/15 text-primary' : 'bg-surface-low text-outline hover:bg-surface-low/80'}`}
            >
              USB Scanner
            </button>
          </div>

          {mode === 'upload' ? (
            <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full cursor-pointer">
              <span className="material-symbols-outlined text-outline text-sm">add_photo_alternate</span>
              <span className="text-[10px] text-outline">Upload pre-scanned fingerprint image</span>
              <input type="file" accept="image/png,image/jpeg,image/bmp,image/*" onChange={handleFile} className="hidden" />
            </label>
          ) : (
            <button
              type="button"
              onClick={handleUsbScan}
              disabled={isScanning}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-outline-variant/30 hover:border-primary/40 hover:bg-surface-low transition-all w-full text-left disabled:opacity-50"
            >
              {isScanning ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-outline text-sm">fingerprint</span>
              )}
              <span className="text-[10px] text-outline">{isScanning ? 'Scanning from USB reader…' : 'Scan with USB fingerprint reader'}</span>
            </button>
          )}
        </>
      )}

      {scanStatus && (
        <p className={`text-[10px] font-medium leading-relaxed ${scanStatus.includes('failed') || scanStatus.includes('cancelled') || scanStatus.includes('not supported') ? 'text-red-500' : 'text-emerald-500'}`}>
          {scanStatus}
        </p>
      )}

      {hasError && (
        <p className="text-[10px] text-red-500 font-medium">This document is required</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  getPendingFiles — legacy helper (unchanged)                               */
/* -------------------------------------------------------------------------- */

export function getPendingFiles(form: HTMLFormElement): { name: string; file: File | Blob }[] {
  const files: { name: string; file: File | Blob }[] = [];
  const inputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]');
  inputs.forEach(input => {
    if (input.files?.[0]) {
      const fieldName = input.closest('[data-field]')?.getAttribute('data-field') || input.name;
      files.push({ name: fieldName, file: input.files[0] });
    }
  });
  return files;
}