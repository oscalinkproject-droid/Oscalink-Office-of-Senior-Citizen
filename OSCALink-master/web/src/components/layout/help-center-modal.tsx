"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const emptySubscribe = () => () => {};

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HELP_CARDS = [
  {
    icon: "menu_book",
    title: "OSCA Knowledge Base",
    description: "Browse OSCA help articles, eligibility guides, and frequently asked questions.",
  },
  {
    icon: "campaign",
    title: "Announcements & Pension",
    description: "Stay updated on OSCA announcements, advisories, and pension-related news.",
  },
  {
    icon: "play_circle",
    title: "Video Guides & Tutorials",
    description: "Step-by-step video tutorials for using OSCALink and its features.",
  },
  {
    icon: "download",
    title: "Forms & Downloads",
    description: "Download and print OSCA forms and registration documents for offline use.",
  },
];

export function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) return null;

  // Portal to <body> so the overlay centers on the real viewport. The modal is
  // triggered from inside the sidebar, whose transform/overflow would otherwise
  // trap a normal `position: fixed` overlay into the narrow sidebar box.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label="Support & Help Center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center px-6 py-4 border-b border-outline-variant/30">
              <h3 className="text-base font-headline font-bold text-foreground text-center">
                Support &amp; Help Center
              </h3>
              <button
                onClick={onClose}
                aria-label="Close help center"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-outline hover:text-foreground hover:bg-surface-high transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {HELP_CARDS.map((card) => (
                <button
                  key={card.title}
                  className="group flex flex-col items-start gap-3 p-5 rounded-xl bg-white border border-outline-variant/30 hover:border-primary/40 hover:shadow-lg transition-all text-left cursor-pointer min-w-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary">{card.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground leading-snug">{card.title}</p>
                    <p className="text-xs text-outline mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}