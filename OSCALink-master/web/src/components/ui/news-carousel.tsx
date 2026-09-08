'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  publish_date: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  Alert: 'bg-amber-500/10 text-amber-300',
  Activity: 'bg-blue-500/10 text-blue-300',
  News: 'bg-emerald-500/10 text-emerald-300',
  Announcement: 'bg-purple-500/10 text-purple-300',
};

export function NewsCarousel({ items }: { items: NewsItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => el.removeEventListener('scroll', updateArrows);
  }, [updateArrows]);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      {/* Nav arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-10 h-10 rounded-full bg-surface-low border border-outline-variant/40 flex items-center justify-center hover:bg-surface-high transition-all shadow-lg"
        >
          <span className="material-symbols-outlined text-lg text-foreground">chevron_left</span>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-10 h-10 rounded-full bg-surface-low border border-outline-variant/40 flex items-center justify-center hover:bg-surface-high transition-all shadow-lg"
        >
          <span className="material-symbols-outlined text-lg text-foreground">chevron_right</span>
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => {
          const date = item.publish_date
            ? new Date(item.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : '';
          const colorClass = CATEGORY_COLORS[item.category] || 'bg-slate-500/10 text-slate-300';
          return (
            <div
              key={item.id}
              className="snap-start shrink-0 w-[300px] group p-6 rounded-2xl bg-surface-high border border-white/5 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${colorClass}`}>
                  {item.category}
                </span>
                {date && <span className="text-xs text-slate-400">{date}</span>}
              </div>
              <h3 className="font-headline font-bold text-base text-foreground mb-3 line-clamp-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{item.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
