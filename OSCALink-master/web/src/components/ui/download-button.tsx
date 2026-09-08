'use client';

import { useState } from 'react';

export function DownloadButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '/downloads/OSCALink-Mobile.apk';
      document.body.appendChild(iframe);

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 60000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed';
      console.error('[Download] Failed:', message);
      setError(message);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined group-hover:animate-bounce">download</span>
            Download for Android
          </>
        )}
      </button>
      {error ? (
        <p className="text-[10px] text-red-400 mt-2 ml-2 uppercase tracking-widest">
          {error}
        </p>
      ) : (
        <p className="text-[10px] text-outline mt-3 ml-2 uppercase tracking-widest">
          Latest APK Release
        </p>
      )}
    </div>
  );
}
