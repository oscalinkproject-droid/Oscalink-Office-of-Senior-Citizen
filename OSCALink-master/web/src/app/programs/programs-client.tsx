'use client';

import { useState, useMemo } from 'react';

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  publish_date: string | null;
  source_level: string | null;
};

const CATEGORIES = ['All', 'Alert', 'Activity', 'News', 'Announcement'];

const CATEGORY_COLORS: Record<string, string> = {
  Alert: 'bg-amber-500/10 text-amber-300',
  Activity: 'bg-blue-500/10 text-blue-300',
  News: 'bg-emerald-500/10 text-emerald-300',
  Announcement: 'bg-purple-500/10 text-purple-300',
};

export function ProgramsClient({ programs }: { programs: NewsItem[] }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const matchCategory = filter === 'All' || p.category === filter;
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [programs, filter, search]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                filter === cat
                  ? 'bg-primary text-white'
                  : 'bg-surface-high border border-outline-variant/30 text-outline hover:border-primary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-high border border-outline-variant/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-slate-400 mb-4 block">event_busy</span>
          <p className="text-slate-400 text-lg">No programs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const date = item.publish_date
              ? new Date(item.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : '';
            const colorClass = CATEGORY_COLORS[item.category] || 'bg-slate-500/10 text-slate-300';
            return (
              <div
                key={item.id}
                className="group p-6 rounded-2xl bg-surface-high border border-white/5 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${colorClass}`}>
                    {item.category}
                  </span>
                  {item.source_level && (
                    <span className="px-2 py-0.5 rounded bg-surface-lowest border border-outline-variant/20 text-[10px] text-slate-400 uppercase">
                      {item.source_level}
                    </span>
                  )}
                  {date && <span className="text-xs text-slate-400 ml-auto">{date}</span>}
                </div>
                <h3 className="font-headline font-bold text-lg text-foreground mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
