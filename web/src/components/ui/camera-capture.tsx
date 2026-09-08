'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

// 2x2 ID photo dimensions (~300 dpi)
const ID_PHOTO_SIZE = 600;

interface CameraDevice {
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
    l.includes('webcam front') ||
    l === ''
  );
}

function toCameraDevices(devices: MediaDeviceInfo[]): CameraDevice[] {
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || 'Camera',
      kind: isBuiltInLabel(d.label, d.deviceId) ? 'builtin' : 'external',
    }));
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('auto');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // After a stream is live, enumerate devices to populate the dropdown
  // (labels are only visible once camera permission has been granted).
  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = toCameraDevices(all);
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
      const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };
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
          setError('Unable to access camera. Please check permissions and USB connections.');
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
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleSave = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Auto-crop to the 2x2 center square of the live frame.
    const w = video.videoWidth;
    const h = video.videoHeight;
    const size = Math.min(w, h);
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;

    canvas.width = ID_PHOTO_SIZE;
    canvas.height = ID_PHOTO_SIZE;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, ID_PHOTO_SIZE, ID_PHOTO_SIZE);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          onClose();
        }
      },
      'image/jpeg',
      0.9,
    );
  };

  const multipleDevices = devices.length > 1;

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
              <h2 className="font-headline text-xl font-bold text-foreground">Capture Photo</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">2x2 ID photo · auto-cropped</p>
            </div>
            <button type="button" onClick={onClose} className="text-outline hover:text-foreground transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

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
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  }}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
                {cameraReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <mask id="id-photo-mask">
                          <rect x="0" y="0" width="100" height="100" fill="black" />
                          <rect x="12.5" y="0" width="75" height="100" fill="white" />
                        </mask>
                      </defs>
                      <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.35)" mask="url(#id-photo-mask)" />
                    </svg>
                    <div className="absolute inset-y-0 left-[12.5%] w-[75%] border-2 border-dashed border-white/60 rounded-sm" />
                    <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest text-white/80 drop-shadow">
                      Align face inside the 2x2 frame
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
              onClick={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSave();
              }}
              disabled={!cameraReady || !!error}
              className="flex-1 py-3 bg-primary text-[#0e141b] font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-400 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation"
              style={{ cursor: cameraReady && !error ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}
            >
              Capture
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}