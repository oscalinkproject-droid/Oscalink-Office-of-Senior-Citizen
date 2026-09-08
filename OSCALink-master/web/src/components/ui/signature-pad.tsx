'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';

interface SignaturePadProps {
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

interface PPoint {
  x: number;
  y: number;
}

function smoothStroke(ctx: CanvasRenderingContext2D, pts: PPoint[]) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length < 3) {
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    const last = pts[pts.length - 1];
    ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, last.x, last.y);
  }
  ctx.stroke();
}

const POINTER_LABELS: Record<string, string> = {
  mouse: 'Mouse',
  touch: 'Touch',
  pen: 'Stylus / USB Pad',
};

export function SignaturePad({ onSave, onClose }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<PPoint[][]>([]);
  const currentStrokeRef = useRef<PPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [pointerType, setPointerType] = useState<string>('');

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext('2d') || null;

  const setupCanvas = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Redraw every completed stroke plus the active stroke, smoothed with
  // quadratic midpoints so USB pad / stylus input comes out smooth.
  const redrawAll = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const canvas = getCanvas();
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      smoothStroke(ctx, stroke);
    }
    if (currentStrokeRef.current.length > 0) {
      smoothStroke(ctx, currentStrokeRef.current);
    }
  }, []);

  const startDrawing = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = getCanvas();
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      setPointerType(e.pointerType);
      setIsDrawing(true);
      currentStrokeRef.current = [getCanvasPos(e.clientX, e.clientY)];
      redrawAll();
    },
    [getCanvasPos, redrawAll],
  );

  const draw = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      // USB signature pads / styluses report high-rate pointer data; consume
      // the coalesced events so no points are lost between frames.
      const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
      for (const raw of coalesced) {
        currentStrokeRef.current.push(getCanvasPos(raw.clientX, raw.clientY));
      }
      redrawAll();
      setHasDrawn(true);
    },
    [isDrawing, getCanvasPos, redrawAll],
  );

  const stopDrawing = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push(currentStrokeRef.current);
        currentStrokeRef.current = [];
      }
      setIsDrawing(false);
      const canvas = getCanvas();
      if (!canvas) return;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    },
    [],
  );

  const handleClear = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasDrawn(false);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas();
  };

  const handleSave = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        onClose();
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
              <h2 className="font-headline text-xl font-bold text-foreground">Digital Signature</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sign below · mouse, touch &amp; USB signature pad</p>
            </div>
            <div className="flex items-center gap-3">
              {pointerType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-low border border-outline-variant/30 text-[9px] font-bold uppercase tracking-widest">
                  <span className="material-symbols-outlined text-outline text-xs">gesture</span>
                  {POINTER_LABELS[pointerType] || pointerType}
                </span>
              )}
              <button type="button" onClick={onClose} className="text-outline hover:text-foreground transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-outline-variant/30 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-56 cursor-crosshair touch-none"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-slate-300 text-sm font-medium">Draw your signature here</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-high text-outline font-bold rounded-xl text-xs uppercase tracking-widest hover:text-foreground transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasDrawn}
              className="flex-1 py-3 bg-tertiary/20 text-tertiary font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-tertiary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="flex-1 py-3 bg-primary text-[#0e141b] font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-blue-400 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}