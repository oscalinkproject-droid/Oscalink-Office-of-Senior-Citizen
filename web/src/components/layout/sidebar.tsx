"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  MapPin,
  Ban,
  Megaphone,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Archive,
  CircleHelp,
  ClipboardList,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuthRole } from "@/lib/use-auth-role";
import { PENDING_STATUSES } from "@/lib/senior-status";
import { ROLE_LABELS } from "@/lib/rbac";
import { type User } from "@supabase/supabase-js";
import { HelpCenterModal } from "./help-center-modal";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  matchDescendants?: boolean;
  oscaOnly?: boolean;
  oscaHeadOnly?: boolean;
  headOnly?: boolean;
  staffOnly?: boolean;
  // OSCA Staff + Super Admin only (excludes the OSCA Head). Used for the
  // Pre-Registrations module, which the OSCA Head must not see or process.
  oscaStaffOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main Navigation",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Pending Verifications", href: "/approvals", icon: ClipboardCheck, oscaHeadOnly: true },
    ],
  },
  {
    title: "Registry Management",
    items: [
      { name: "Senior Directory", href: "/directory", icon: Users, oscaOnly: true },
      { name: "Pre-Registrations", href: "/directory/preregistration", icon: ClipboardList, oscaStaffOnly: true },
      { name: "Seniors by Barangay", href: "/seniors/by-barangay", icon: MapPin, oscaOnly: true, matchDescendants: true },
      { name: "Declined Records", href: "/declined", icon: Ban, staffOnly: true },
      { name: "Corrections & Appeals", href: "/corrections", icon: ShieldAlert, staffOnly: true },
    ],
  },
  {
    title: "Communications & Issuance",
    items: [
      { name: "Broadcast Center", href: "/notifications", icon: Megaphone, oscaOnly: true },
      { name: "Staff", href: "/staff", icon: ShieldCheck, headOnly: true },
    ],
  },
  {
    title: "System Records",
    items: [
      { name: "Reports & Analytics", href: "/reports", icon: BarChart3, staffOnly: true },
      { name: "Document Archives", href: "/archive", icon: Archive, staffOnly: true },
    ],
  },
];

export function Sidebar({ user, open, onClose }: { user: User | null; open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { role, barangay, purok } = useAuthRole(user);
  const [isDesktop, setIsDesktop] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest Admin";
  const roleLabel = ROLE_LABELS[role] || "Staff";

  const isOsca = role === 'super_admin' || role === 'osca_head' || role === 'osca_staff';
  const isHead = role === 'osca_head';
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isHead) return;
    const supabaseClient = createClient();

    const pendingStatuses = PENDING_STATUSES;

    const fetchCount = () => {
      supabaseClient
        .from('seniors')
        .select('id', { count: 'exact', head: true })
        .in('status', pendingStatuses)
        .then(({ count }) => {
          setPendingCount(count ?? 0);
        });
    };

    fetchCount();

    const channel = supabaseClient
      .channel('sidebar-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seniors' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [role, isHead]);

  const isVisible = (item: NavItem) => {
    if (item.oscaHeadOnly && role !== 'osca_head') return false;
    if (item.headOnly && role !== 'osca_head') return false;
    if (item.staffOnly && role !== 'osca_staff') return false;
    if (item.oscaStaffOnly && role !== 'osca_staff' && role !== 'super_admin') return false;
    if (item.oscaOnly && !isOsca) return false;
    return true;
  };

  const renderItem = (item: NavItem) => {
    const isActive = item.matchDescendants
      ? pathname === item.href || pathname.startsWith(item.href + '/')
      : pathname === item.href;
    const showBadge = item.href === '/approvals' && pendingCount !== null && pendingCount > 0;
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={`group flex items-center gap-3 py-2.5 px-3.5 rounded-lg transition-colors duration-150 cursor-pointer ${
          isActive
            ? "bg-white text-[#0B3C26] shadow-sm"
            : "text-emerald-100/70 hover:text-white hover:bg-white/10"
        }`}
      >
        <Icon
          size={20}
          strokeWidth={2}
          className={`shrink-0 w-5 h-5 ${
            isActive ? "text-[#0B3C26]" : "text-emerald-100/70 group-hover:text-white"
          }`}
        />
        <span className={`min-w-0 font-label text-sm leading-none ${isActive ? 'font-semibold text-[#0B3C26]' : 'font-medium'} truncate`}>
          {item.name}
        </span>
        {showBadge && (
          <AnimatePresence>
            <m.span
              key={pendingCount}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
              className="ml-auto inline-flex items-center justify-center min-w-[20px] px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-sm shrink-0 leading-none"
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </m.span>
          </AnimatePresence>
        )}
      </Link>
    );
  };

  const visibleItems = navSections.flatMap(section => section.items.filter(isVisible));

  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-64px)] w-64 z-40 bg-[#0F432B] flex flex-col py-4 px-3 border-r border-emerald-900/60 overflow-y-auto hide-scrollbar transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {open && !isDesktop && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
          aria-label="Close menu"
        >
          <X size={20} className="w-5 h-5" />
        </button>
      )}
      <div className="flex items-center gap-3 p-3 mb-4 bg-white/5 rounded-xl border border-white/10">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/20 shrink-0">
          <ShieldCheck size={20} className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-headline font-semibold text-white text-base leading-tight truncate">{displayName}</h3>
          <p className="font-label text-xs font-medium text-emerald-100/70 uppercase tracking-widest truncate">{roleLabel}</p>
          {barangay && (
            <p className="font-label text-[11px] text-emerald-200/80 uppercase tracking-widest truncate">{barangay}{purok ? ` - ${purok}` : ''}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 mt-6 flex flex-col gap-2">
        {visibleItems.map(renderItem)}
      </nav>

      <div className="mt-auto pt-4 space-y-1.5">
        <button
          onClick={() => setHelpOpen(true)}
          className="group flex items-center gap-3 py-2.5 px-3.5 rounded-lg transition-colors duration-150 cursor-pointer text-emerald-100/70 hover:text-white hover:bg-white/10 w-full"
        >
          <CircleHelp size={20} className="shrink-0 w-5 h-5 text-emerald-100/70 group-hover:text-white" />
          <span className="min-w-0 font-label text-sm font-medium leading-none truncate">Support &amp; Help Center</span>
        </button>
      </div>

      <HelpCenterModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </aside>
  );
}