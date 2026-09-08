"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function TopNavBar({ user }: { user?: User | null }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const userInitial = user?.email?.[0].toUpperCase() || "A";
  const userRole = user?.user_metadata?.role as string | undefined;
  const isBarangayRole = userRole === 'barangay_president' || userRole === 'barangay_official';

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    
    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    }

    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
          setUnreadCount((prev) => prev + 1);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  async function markAsRead(notificationId: string) {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user!.id)
      .eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setShowNotifications(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <>
    <nav className="fixed top-0 w-full z-50 bg-surface-lowest/80 backdrop-blur-xl shadow-[0px_20px_40px_rgba(0,104,55,0.05)] border-b border-outline-variant/30">
      <div className="flex justify-between items-center w-full px-6 h-16 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8">
          {user ? (
            <span className="text-xl font-bold tracking-tighter text-foreground font-headline flex items-center gap-3 cursor-default">
              <div className="w-10 h-10 rounded-lg overflow-hidden relative">
                <Image 
                  src="https://res.cloudinary.com/de98nxawm/image/upload/v1784430191/Cotabato_City_Official_Seal_httyas.png" 
                  alt="OSCALINK Logo" 
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              OSCALINK
            </span>
          ) : (
            <Link href="/" className="text-xl font-bold tracking-tighter text-foreground font-headline group flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden relative">
                <Image 
                  src="https://res.cloudinary.com/de98nxawm/image/upload/v1784430191/Cotabato_City_Official_Seal_httyas.png" 
                  alt="OSCALINK Logo" 
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              OSCALINK
            </Link>
          )}
          
          <div className="hidden lg:flex gap-6 items-center">
            <span className="text-outline font-label text-[12px] uppercase tracking-widest">
              {isBarangayRole && user?.user_metadata?.barangay 
                ? `${userRole === 'barangay_official' ? 'Barangay Official' : 'Barangay Staff'} — ${user.user_metadata.barangay}`
                : userRole === 'osca_head' 
                ? 'OSCA Head — Cotabato City'
                : userRole === 'osca_staff'
                ? 'OSCA Staff — Cotabato City'
                : 'System Hub'}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {!user ? (
            <Link 
              href="/login"
              className="px-4 py-2 bg-primary hover:bg-[#005a2f] text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              Administrator Login
              <span className="material-symbols-outlined text-[14px]">login</span>
            </Link>
          ) : (
            <>
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-outline hover:text-primary transition-all duration-200 hover:bg-surface-low rounded active:scale-95 relative"
                >
                  <span className="material-symbols-outlined text-sm">
                    {unreadCount > 0 ? 'notifications_active' : 'notifications'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-tertiary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-surface-lowest rounded-xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50">
                    <div className="p-3 border-b border-outline-variant/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] text-outline">{unreadCount} new</span>
                      )}
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <span className="material-symbols-outlined text-3xl text-outline/30 mb-2 block">notifications_off</span>
                          <p className="text-xs text-outline">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full text-left px-4 py-3 hover:bg-surface-low transition-colors border-b border-outline-variant/5 flex gap-3 items-start ${!notification.read ? 'bg-primary/[0.03]' : ''}`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <span
                                className={`material-symbols-outlined text-sm ${
                                  notification.type === 'success'
                                    ? 'text-primary'
                                    : notification.type === 'warning'
                                    ? 'text-secondary'
                                    : 'text-outline'
                                }`}
                              >
                                {notification.type === 'success' ? 'check_circle' : notification.type === 'warning' ? 'warning' : 'info'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-foreground truncate">{notification.title}</p>
                                {!notification.read && (
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0 mt-1"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-outline mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-outline/60 mt-1">{timeAgo(notification.created_at)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="flex border-t border-outline-variant/10">
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={markAllAsRead}
                          className="flex-1 text-center py-2.5 text-[10px] font-bold text-outline hover:text-foreground hover:bg-surface-low uppercase tracking-widest border-r border-outline-variant/10"
                        >
                          Mark All Read
                        </button>
                      )}
                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="flex-1 text-center py-2.5 text-[10px] font-bold text-primary hover:bg-surface-low uppercase tracking-widest"
                      >
                        View All
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-outline-variant/30" aria-hidden="true" />
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} aria-label="User menu" className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden active:scale-95 transition-transform cursor-pointer group hover:bg-primary/20">
                    <span className="text-[10px] font-bold text-primary group-hover:scale-110 transition-transform">{userInitial}</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface-lowest rounded-xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50 py-1.5">
                      <div className="px-4 py-2 border-b border-outline-variant/10 mb-1">
                        <p className="text-xs font-bold text-foreground truncate">{user?.user_metadata?.full_name || user?.email}</p>
                        <p className="text-[10px] text-outline truncate capitalize">{userRole?.replace(/_/g, ' ') || 'User'}</p>
                      </div>
                      <button
                        onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-foreground hover:bg-surface-low transition-colors flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-sm">settings</span>
                        Settings
                      </button>
                      <div className="my-1 border-t border-outline-variant/10"></div>
                      <button
                        onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/5 transition-colors flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
            </>
          )}
        </div>
      </div>
    </nav>

    {showLogoutConfirm && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 shadow-xl max-w-sm w-full mx-4 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-red-400">logout</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Confirm Logout</p>
              <p className="text-[11px] text-outline mt-0.5">You will be signed out of your account.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setLoggingOut(true);
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push('/');
              }}
              disabled={loggingOut}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loggingOut ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
