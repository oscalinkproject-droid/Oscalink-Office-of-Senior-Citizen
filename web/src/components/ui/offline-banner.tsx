'use client';

import { useSyncExternalStore } from "react";
import { m, AnimatePresence } from "framer-motion";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <AnimatePresence>
      {!isOnline && (
        <m.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-16 left-0 right-0 z-[45] bg-[#1a2027]/95 backdrop-blur-xl border-b border-white/5"
        >
          <div className="flex items-center justify-center gap-3 px-4 py-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffb786] animate-pulse"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#ffb786]/40 animate-ping"></div>
            </div>
            <span className="font-headline font-bold text-[#dde3ed] text-sm">
              You&apos;re currently offline
            </span>
            <span className="text-[#8c909f] text-sm">
              Some features may be unavailable until connection is restored.
            </span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
