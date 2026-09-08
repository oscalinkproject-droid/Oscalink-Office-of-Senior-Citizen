'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';

interface DocumentScannerProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

// Scanned document output width in px (~150 DPI at A4 long edge).
const DOC_WIDTH = 1800;
const MAX_DOC_HEIGHT = 2500;

interface ScannerDevice {
  deviceId: string;
  label: string;
  kind: 'builtin' | 'external';
}

function isBuiltInLabel(label: string, deviceId: string): boolean {
  if (deviceId === 'default' || deviceId === 'communications') return true;
  const l = label.toLowerCase();
  return (
    l.includes('built-in') ||
    l.includes('internal') ||
    l.includes('integrated') ||
    l.includes('facetime') ||
    l.includes('face time') ||
    l.includes('rgb') ||
    l === ''
  );
}

function toScannerDevices(devices: MediaDeviceInfo[]): ScannerDevice[] {
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || 'Camera',
      kind: isBuiltInLabel(d.label, d.deviceId) ? 'builtin' : 'external',
    }));
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Detect the bright document region on a (preferably darker) desk/backdrop by
// flood-filling from the frame center. Falls back to the full frame when no
// reliable region is found.
function detectDocumentRegion(img: ImageData): Rect | null {
  const { data, width: w, height: h } = img;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const isBright = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] > 150;
  };
  if (!isBright(cx, cy)) return null;

  const visited = new Uint8Array(w * h);
  const stack: Array<[number, number]> = [[cx, cy]];
  visited[cy * w + cx] = 1;
  let minX = cx;
  let maxX = cx;
  let minY = cy;
  let maxY = cy;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x > 0 && !visited[y * w + x - 1] && isBright(x - 1, y)) { visited[y * w + x - 1] = 1; stack.push([x - 1, y]); }
    if (x < w - 1 && !visited[y * w + x + 1] && isBright(x + 1, y)) { visited[y * w + x + 1] = 1; stack.push([x + 1, y]); }
    if (y > 0 && !visited[(y - 1) * w + x] && isBright(x, y - 1)) { visited[(y - 1) * w + x] = 1; stack.push([x, y - 1]); }
    if (y < h - 1 && !visited[(y + 1) * w + x] && isBright(x, y + 1)) { visited[(y + 1) * w + x] = 1; stack.push([x, y + 1]); }
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const area = bw * bh;
  if (area < w * h * 0.1 || area > w * h * 0.98) return null;

  const pad = 2;
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    width: Math.min(w, bw + pad * 2),
    height: Math.min(h, bh + pad * 2),
  };
}

export function DocumentScanner({ onCapture, onClose }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'webcam' | 'file'>('webcam');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('auto');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = toScannerDevices(all);
      setDevices(cams);
      setSelectedDeviceId(prev => (prev === 'auto' && cams.length > 0 ? cams[0].deviceId : prev));
    } catch {
      setDevices([]);
    }
  }, []);

  const setupStream = useCallback(
    (deviceId?: string) => {
      stopStream();
      setError(null);
      setCameraReady(false);
      const video: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
      if (deviceId && deviceId !== 'auto') {
        video.deviceId = { exact: deviceId };
      } else {
        video.facingMode = facingMode;
      }
      navigator.mediaDevices
        .getUserMedia({ video })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.oncanplay = () => setCameraReady(true);
            videoRef.current.play();
          }
          refreshDevices();
        })
        .catch(() => {
          setError('Unable to access the camera. Check permissions and USB webcam connection.');
        });
    },
    [facingMode, refreshDevices, stopStream],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setupStream();
    return stopStream;
  }, [setupStream, stopStream]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setupStream(deviceId);
  };

  const switchFacing = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Downscale for detection, then map the detected region back to full res.
    const work = document.createElement('canvas');
    const scale = Math.min(1, 1600 / vw);
    work.width = Math.round(vw * scale);
    work.height = Math.round(vh * scale);
    const wctx = work.getContext('2d');
    if (!wctx) return;
    wctx.drawImage(video, 0, 0, work.width, work.height);
    const region = detectDocumentRegion(wctx.getImageData(0, 0, work.width, work.height)) ?? {
      x: 0,
      y: 0,
      width: work.width,
      height: work.height,
    };

    const sx = region.x / scale;
    const sy = region.y / scale;
    const sw = region.width / scale;
    const sh = region.height / scale;

    const aspect = sw / sh;
    let outW = DOC_WIDTH;
    let outH = Math.round(outW / aspect);
    if (outH > MAX_DOC_HEIGHT) {
      outH = MAX_DOC_HEIGHT;
      outW = Math.round(outH * aspect);
    }
    canvas.width = outW;
    canvas.height = outH;
    const octx = canvas.getContext('2d');
    if (!octx) return;
    octx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    octx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          onClose();
        }
      },
      'image/jpeg',
      0.92,
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target.value) e.target.value = '';
    onCapture(file);
    onClose();
  };

  const multipleDevices = devices.length > 1;
  const externalSelected = devices.find(d => d.deviceId === selectedDeviceId)?.kind === 'external';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">document_scanner</span>
                Scan Document
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">USB / webcam document scanner · auto-crop</p>
            </div>
            <button type="button" onClick={onClose} className="text-outline hover:text-foreground transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden text-[10px] font-bold uppercase tracking-widest mb-3">
            <button
              type="button"
              onClick={() => setMode('webcam')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${mode === 'webcam' ? 'bg-primary/15 text-primary' : 'bg-surface-low text-outline hover:bg-surface-low/80'}`}
            >
              <span className="material-symbols-outlined text-xs">photo_camera</span>
              Webcam Scan
            </button>
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${mode === 'file' ? 'bg-primary/15 text-primary' : 'bg-surface-low text-outline hover:bg-surface-low/80'}`}
            >
              <span className="material-symbols-outlined text-xs">usb</span>
              USB Scanner
            </button>
          </div>

          {mode === 'file' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-2xl border border-dashed border-outline-variant/30 bg-surface-low">
              <span className="material-symbols-outlined text-4xl text-outline">usb</span>
              <p className="text-[11px] text-outline text-center leading-relaxed">
                Choose the scanned file (image or PDF) saved by your USB document scanner.<br />
                Files scanned by the hardware can be imported directly here.
              </p>
              <label className="px-4 py-2.5 rounded-xl bg-primary text-[#0e141b] font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-blue-400 transition-all" >
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">folder_open</span>
                  Choose file
                </span>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
              </label>
            </div>
          ) : (
            <>
              {multipleDevices && (
                <div className="mb-3">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Camera / device</label>
                  <div className="relative mt-1">
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="w-full appearance-none bg-surface-low border border-outline-variant/30 rounded-xl py-2.5 px-3 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                    >
                      {devices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`} {d.kind === 'external' ? '(USB)' : '(Built-in)'}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              )}

              <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
                {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="material-symbols-outlined text-4xl">no_photography</span>
                    <p className="text-xs text-center px-4">{error}</p>
                    <button
                      type="button"
                      onClick={() => setupStream(selectedDeviceId !== 'auto' ? selectedDeviceId : undefined)}
                      className="mt-2 px-4 py-2 bg-primary/20 text-primary rounded-xl text-xs font-bold hover:bg-primary/30 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                    />
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    )}
                    {cameraReady && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-[6%] border-2 border-dashed border-white/60 rounded-sm">
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-l-2 border-t-2 border-secondary" />
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-r-2 border-t-2 border-secondary" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-l-2 border-b-2 border-secondary" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-r-2 border-b-2 border-secondary" />
                        </div>
                        <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest text-white/80 drop-shadow">
                          Place document flat on a dark background inside the frame
                        </span>
                      </div>
                    )}
                    {!multipleDevices && (
                      <button
                        type="button"
                        onClick={switchFacing}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <span className="material-symbols-outlined text-white text-xl">flip_camera_android</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Brightness</label>
                    <span className="text-[10px] text-outline">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-high rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contrast</label>
                    <span className="text-[10px] text-outline">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-high rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-surface-high text-outline font-bold rounded-xl text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSnapshot}
                  disabled={!cameraReady || !!error}
                  className="flex-1 py-3 bg-primary text-[#0e141b] font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-400 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {externalSelected ? 'Scan with USB Webcam' : 'Capture Document'}
                </button>
              </div>
            </>
          )}
        </div>
      </m.div>
    </div>
  );
}