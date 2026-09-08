"use client";

import { ReactNode } from "react";
import { m } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  trendColor?: "primary" | "tertiary" | "slate";
  icon?: string;
  highlight?: boolean;
  children?: ReactNode;
}

export function MetricCard({ 
  label, 
  value, 
  trend, 
  trendColor = "primary", 
  icon,
  highlight = false,
  children 
}: MetricCardProps) {
  const trendColors = {
    primary: "text-primary",
    tertiary: "text-tertiary",
    slate: "text-outline",
  };

  return (
    <m.div 
      className={`p-6 rounded-xl flex flex-col gap-2 ring-1 relative overflow-hidden group transition-all duration-300 ${
        highlight ? 'bg-primary/10 shadow-[0_0_20px_rgba(0,104,55,0.1)] ring-primary/20' : 'bg-surface-lowest ring-outline-variant/30 shadow-sm'
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start">
        <span className="text-outline text-[10px] uppercase tracking-widest font-label font-medium">{label}</span>
        {icon && (
          <span className="material-symbols-outlined text-outline text-[18px] group-hover:text-primary transition-colors">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-headline font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
        {trend && (
          <span className={`${trendColors[trendColor]} text-[10px] font-bold uppercase tracking-tighter`}>{trend}</span>
        )}
      </div>
      {children}
    </m.div>
  );
}

export function StatusBadge({ 
  status 
}: { 
  status: string
}) {
  const styles: Record<string, string> = {
    Active: "bg-primary/10 text-primary ring-primary/20",
    Pending: "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    "Pending Barangay": "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    "Pending OSCA": "bg-indigo-600/10 text-indigo-600 ring-indigo-600/20",
    "FOR_HEAD_APPROVAL": "bg-violet-600/10 text-violet-600 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
    APPROVED: "bg-primary/10 text-primary ring-primary/20",
    REJECTED: "bg-tertiary/10 text-tertiary ring-tertiary/20",
    Inactive: "bg-tertiary/10 text-tertiary ring-tertiary/20",
    Transferred: "bg-outline/10 text-outline ring-outline/20",
    Deceased: "bg-tertiary/10 text-tertiary ring-tertiary/20",
    Draft: "bg-outline/10 text-outline ring-outline/20",
    Submitted: "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    Approved: "bg-primary/10 text-primary ring-primary/20",
    Rejected: "bg-tertiary/10 text-tertiary ring-tertiary/20",
    Cancelled: "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    Disqualified: "bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    Disapproved: "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  };

  const icons: Record<string, string> = {
    Active: "check_circle",
    Pending: "schedule",
    "Pending Barangay": "schedule",
    "Pending OSCA": "pending",
    "FOR_HEAD_APPROVAL": "forward_to_inbox",
    APPROVED: "verified",
    REJECTED: "cancel",
    Inactive: "block",
    Transferred: "swap_horiz",
    Cancelled: "close",
    Draft: "draft",
    Submitted: "send",
    Approved: "verified",
    Rejected: "cancel",
    Disqualified: "block",
    Disapproved: "thumb_down",
  };

  const badgeStyle = styles[status] || "bg-outline/10 text-outline ring-outline/20";
  const icon = icons[status] || null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 uppercase ${badgeStyle}`}>
      {icon && <span className="material-symbols-outlined text-[12px] leading-none">{icon}</span>}
      {status}
    </span>
  );
}
