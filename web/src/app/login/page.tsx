"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { normalizeRole, OSCA_ROLES, SECTOR_LOCKED_ROLES } from '@/lib/rbac';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Guard against a silently hanging token request: never leave the button
    // stuck on "Authenticating..." with no feedback.
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Login timed out. Please check your connection and try again.');
    }, 20000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[login] signInWithPassword failed:', error);
        setError(
          error.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : error.message
        );
        return;
      }

      const user = data.session?.user ?? null;
      let role = normalizeRole(user?.user_metadata?.role);

      // Fall back to the profiles table when user_metadata has no recognizable
      // role (common for accounts provisioned with legacy role names).
      if (!role && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        role = normalizeRole(profile?.role);
      }

      if (!role) {
        console.error('[login] No resolvable role for', user?.email);
        setError('Your account has not been assigned a portal role yet. Please contact the administrator.');
        return;
      }

      if ((OSCA_ROLES as readonly string[]).includes(role)) {
        router.replace('/dashboard');
      } else if ((SECTOR_LOCKED_ROLES as readonly string[]).includes(role)) {
        router.replace('/barangay/dashboard');
      } else {
        console.error('[login] Portal login blocked for role', role);
        setError('This account is not authorized to use the web portal. Please use the mobile app instead.');
      }
    } catch (err) {
      console.error('[login] Unhandled auth error:', err);
      setError('Something went wrong while signing in. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-lowest flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="w-28 h-28 mx-auto mb-6 rounded-2xl overflow-hidden">
          <Image
            src="https://res.cloudinary.com/de98nxawm/image/upload/v1784430191/Cotabato_City_Official_Seal_httyas.png"
            alt="Cotabato City Official Seal"
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-foreground italic">
          OSCALink <span className="text-primary not-italic">Portal</span>
        </h1>
        <p className="font-label text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-2">Bangsamoro Autonomous Region in Muslim Mindanao</p>
        <p className="font-label text-[8px] text-outline uppercase tracking-[0.2em] mt-1">Office for Senior Citizen Affairs &bull; Cotabato City</p>
      </div>

      {/* Login Card (Modern Surface) */}
      <div className="relative z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        <div className="bg-white border border-outline-variant/30 rounded-3xl p-8 shadow-[0_25px_50px_-12px_rgba(0,104,55,0.08)] ring-1 ring-black/5">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] text-outline font-bold uppercase tracking-widest pl-1 mb-2 block font-label">Email</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors group-focus-within:text-primary">person</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@gmail.com"
                  className="w-full bg-surface-low border border-outline-variant/50 rounded-xl py-3.5 pl-11 pr-4 text-sm text-foreground font-body placeholder:text-outline transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-outline font-bold uppercase tracking-widest pl-1 mb-2 block font-label">Password</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm transition-colors group-focus-within:text-primary">lock_open</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-low border border-outline-variant/50 rounded-xl py-3.5 pl-11 pr-11 text-sm text-foreground font-body placeholder:text-outline transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-all duration-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4 flex gap-3 animate-in shake duration-500">
                <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">warning</span>
                <p className="text-[11px] text-tertiary font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-[#005a2f] text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(0,104,55,0.2)] hover:shadow-[0_15px_30px_-5px_rgba(0,104,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Authenticating...' : 'Log In'}
                {!loading && <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            </button>
          </form>

          <footer className="mt-8 text-center border-t border-outline-variant/20 pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1 h-1 rounded-full bg-secondary" />
              <div className="w-1 h-1 rounded-full bg-primary" />
              <div className="w-1 h-1 rounded-full bg-tertiary" />
            </div>
            <p className="text-[9px] text-outline font-bold uppercase tracking-widest leading-relaxed">
              Institutional access strictly regulated.<br />
              Authorized BARMM municipal staff only.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
