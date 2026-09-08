'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SignaturePad } from '@/components/ui/signature-pad';
import { uploadHeadSignature, updateHeadName, updateOfficeInfo } from '@/app/actions/signature';
import { changePassword, updateProfilePhone } from '@/app/actions/settings';
import { AuditTrailClient } from '@/components/ui/audit-trail-client';

function initialsOf(name: string): string {
  const named = name.trim();
  if (!named) return 'ST';
  const parts = named.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

interface SettingsClientProps {
  role: string | null;
  userBarangay: string | null;
  userFullName: string | null;
  userEmail: string;
  userPhone: string;
  isFirstLogin: boolean;
  initialSignatureUrl: string | null;
  headName: string;
  initialOfficeAddress: string;
  initialOfficeMapUrl: string;
  initialOfficeContact: string;
  auditLogs?: unknown[] | null;
  auditSummary?: {
    totalActions: number;
    activeSessions: number;
    todayLogins: number;
    uniqueUsers: number;
  } | null;
}

function ProfileDetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-base">{icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-outline uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-foreground mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export function SettingsClient({
  role, userBarangay, userFullName, userEmail, userPhone, isFirstLogin,
  initialSignatureUrl, headName,
  initialOfficeAddress, initialOfficeMapUrl, initialOfficeContact,
  auditLogs = [], auditSummary,
}: SettingsClientProps) {
  const router = useRouter();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignatureUrl);
  const [name, setName] = useState(headName);
  const [originalName] = useState(headName);
  const [officeAddress, setOfficeAddress] = useState(initialOfficeAddress);
  const [officeMapUrl, setOfficeMapUrl] = useState(initialOfficeMapUrl);
  const [officeContact, setOfficeContact] = useState(initialOfficeContact);
  const [showPad, setShowPad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingOffice, setSavingOffice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [pwResult, setPwResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [phone, setPhone] = useState(userPhone);
  const [phoneDraft, setPhoneDraft] = useState(userPhone);
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  const isOSCAHead = role === 'osca_head';
  const canViewAudit = role === 'super_admin' || role === 'osca_head';
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'osca_head' ? 'OSCA Head' : role === 'osca_staff' ? 'Admin Staff' : role === 'barangay_president' ? 'Barangay Staff' : role === 'barangay_official' ? 'Barangay Official' : role || 'User';
  const isOscaRole = role === 'super_admin' || role === 'osca_head' || role === 'osca_staff';
  const scopeLabel = isOscaRole
    ? 'Cotabato City OSCA'
    : userBarangay
    ? `${userBarangay} Barangay`
    : '—';

  const handleChangePassword = useCallback(async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      setPwResult({ error: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwResult({ error: 'New password must be at least 8 characters.' });
      return;
    }
    setChangingPw(true);
    setPwResult(null);
    try {
      const result = await changePassword(isFirstLogin ? '' : currentPassword, newPassword);
      setPwResult(result);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (isFirstLogin) {
          router.push('/barangay/dashboard');
        }
      }
    } catch (e: unknown) {
      setPwResult({ error: e instanceof Error ? e.message : 'Failed to change password' });
    } finally {
      setChangingPw(false);
    }
  }, [currentPassword, newPassword, confirmPassword, isFirstLogin, router]);

  const handleSaveSignature = useCallback(async (blob: Blob) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('signature', blob, 'signature.png');
      const result = await uploadHeadSignature(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        setSignatureUrl(result.url);
        setShowPad(false);
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  }, [router]);

  const handleSaveName = useCallback(async () => {
    if (name.trim() === originalName.trim()) return;
    setSavingName(true);
    setError(null);
    try {
      const result = await updateHeadName(name.trim());
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }, [name, originalName, router]);

  const handleSaveOffice = useCallback(async () => {
    setSavingOffice(true);
    setError(null);
    try {
      const result = await updateOfficeInfo({
        office_address: officeAddress,
        office_map_url: officeMapUrl,
        office_contact: officeContact,
      });
      if (result.error) setError(result.error);
      else router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save office info');
    } finally {
      setSavingOffice(false);
    }
  }, [officeAddress, officeMapUrl, officeContact, router]);

  const startEditingPhone = useCallback(() => {
    setPhoneDraft(phone);
    setEditingPhone(true);
  }, [phone]);

  const handleSavePhone = useCallback(async () => {
    setSavingPhone(true);
    setError(null);
    try {
      const result = await updateProfilePhone(phoneDraft);
      if (result.error) {
        setError(result.error);
      } else {
        setPhone(phoneDraft);
        setEditingPhone(false);
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update phone number');
    } finally {
      setSavingPhone(false);
    }
  }, [phoneDraft, router]);

  const nameChanged = name.trim() !== originalName.trim();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-headline font-bold text-foreground">Settings</h1>
        <p className="text-sm text-outline mt-1">
          {roleLabel}{userBarangay ? ` — ${userBarangay}` : ''}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      {/* My Profile — Account Details */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary tracking-wide">
              {initialsOf(userFullName || '')}
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Account Details</h2>
            <p className="text-xs text-outline mt-0.5">Your logged-in profile information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProfileDetailRow icon="badge" label="Full Name" value={userFullName || ''} />
          <ProfileDetailRow icon="manage_accounts" label="Role" value={roleLabel} />
          <ProfileDetailRow icon="mail" label="Staff Email" value={userEmail} />
          <ProfileDetailRow icon="location_city" label="Assigned Scope" value={scopeLabel} />
          <div className="sm:col-span-2 flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-base">phone</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider">Phone Number</p>
              {editingPhone ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleSavePhone}
                      disabled={savingPhone}
                      className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >
                      {savingPhone ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingPhone(false)}
                      disabled={savingPhone}
                      className="px-3 py-2 rounded-lg bg-surface-high border border-outline-variant/20 text-outline text-xs font-bold hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  {phone.trim() ? (
                    <p className="text-xs font-semibold text-foreground break-words">{phone.trim()}</p>
                  ) : (
                    <p className="text-xs italic text-outline">Not provided</p>
                  )}
                  <button
                    onClick={startEditingPhone}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-high border border-outline-variant/20 text-outline text-[10px] font-semibold hover:text-foreground hover:border-primary/30 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Security — internal, restricted access */}
      {canViewAudit && (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Privacy &amp; Security</h2>
              <p className="text-xs text-outline mt-1">
                Internal security tools, restricted to Super Admin and OSCA Head.
              </p>
            </div>
            <button
              onClick={() => setShowAudit(v => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-high border border-outline-variant/20 text-foreground text-xs font-bold hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{showAudit ? 'expand_less' : 'expand_more'}</span>
              <span className="material-symbols-outlined text-sm">history</span>
              {showAudit ? 'Hide Audit Trail' : 'Audit Trail (Activity Log)'}
            </button>
          </div>

          {showAudit && (
            <div className="mt-4">
              <AuditTrailClient
                auditLogs={(auditLogs || []) as never[]}
                summary={auditSummary || { totalActions: 0, activeSessions: 0, todayLogins: 0, uniqueUsers: 0 }}
              />
            </div>
          )}
        </div>
      )}

      {/* Change Password — hidden for Admin Staff / OSCA Staff; those passwords are managed by the OSCA Head via Staff Management */}
      {role !== 'osca_staff' && (
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h2>
          <p className="text-xs text-outline mt-1">
            {isFirstLogin
              ? 'Welcome! Please set a secure password for your account. This is required before continuing.'
              : 'Update your account password. Use a strong password that you haven\'t used before.'}
          </p>
        </div>

        {isFirstLogin && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            You are using a temporary password. Set a permanent one below.
          </div>
        )}

        <div className="space-y-3">
          {!isFirstLogin && (
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Current Password</label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute inset-y-0 right-2 flex items-center text-outline hover:text-foreground transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">New Password</label>
            <div className="relative mt-1">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute inset-y-0 right-2 flex items-center text-outline hover:text-foreground transition-colors">
                <span className="material-symbols-outlined text-[18px]">{showNew ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Confirm New Password</label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute inset-y-0 right-2 flex items-center text-outline hover:text-foreground transition-colors">
                <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
        </div>
        {pwResult && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            pwResult.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <span className="material-symbols-outlined text-sm">{pwResult.success ? 'check_circle' : 'error'}</span>
            {pwResult.success ? 'Password changed successfully!' : pwResult.error}
          </div>
        )}
        <button
          onClick={handleChangePassword}
          disabled={(!isFirstLogin && !currentPassword) || !newPassword || !confirmPassword || changingPw}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {changingPw ? 'Changing...' : isFirstLogin ? 'Set Password & Continue' : 'Change Password'}
        </button>
      </div>
      )}

      {!isOSCAHead && (
        <div className="flex items-start gap-2.5 bg-amber-50/50 border border-amber-200 text-amber-800 rounded-lg p-3">
          <span className="material-symbols-outlined text-base shrink-0 mt-px">info</span>
          <p className="text-xs leading-relaxed">
            Signature and office settings are managed by the OSCA Head. Please coordinate with your OSCA Head for changes to these details.
          </p>
        </div>
      )}

      {isOSCAHead && (
      <>
      {/* Full Name */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Full Name</h2>
          <p className="text-xs text-outline mt-1">
            This name appears on the back of every Senior Citizen ID card as the authorized signatory.
          </p>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. HON. JUAN DELA CRUZ"
            />
          </div>
          <button
            onClick={handleSaveName}
            disabled={!nameChanged || savingName}
            className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            {savingName ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Office Location */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Office Location &amp; Contact</h2>
          <p className="text-xs text-outline mt-1">
            This information appears in the mobile app&apos;s help section for seniors.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Office Address</label>
            <input
              type="text"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="e.g. OSCA Building, City Hall Compound, Cotabato City"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Google Maps Link</label>
            <input
              type="text"
              value={officeMapUrl}
              onChange={(e) => setOfficeMapUrl(e.target.value)}
              placeholder="Paste a Google Maps share link..."
              className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-outline mt-1">Open Google Maps, find the office, tap Share → Copy link</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Contact Number</label>
            <input
              type="text"
              value={officeContact}
              onChange={(e) => setOfficeContact(e.target.value)}
              placeholder="e.g. (064) 123-4567"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-outline-variant/20 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          onClick={handleSaveOffice}
          disabled={savingOffice}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {savingOffice ? 'Saving...' : 'Save Office Info'}
        </button>
      </div>

      {/* Digital Signature */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Digital Signature</h2>
          <p className="text-xs text-outline mt-1">
            Your signature appears on the back of every Senior Citizen ID card as the authorized signatory.
          </p>
        </div>

        {signatureUrl ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/20 bg-white p-6 flex items-center justify-center">
              <Image
                src={signatureUrl}
                alt="OSCA Head Signature"
                width={280}
                height={80}
                className="object-contain max-h-20"
                unoptimized
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPad(true)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">draw</span>
                Redraw Signature
              </button>
              {showPad && (
                <button
                  onClick={() => setShowPad(false)}
                  className="px-4 py-2 rounded-lg bg-surface-high border border-outline-variant/20 text-outline text-xs font-bold"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 flex items-center justify-center">
              <div className="text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-amber-400">draw</span>
                <p className="text-xs text-amber-400">No signature uploaded yet</p>
                <p className="text-[10px] text-amber-400/60">ID cards will use typed name as fallback</p>
              </div>
            </div>
            <button
              onClick={() => setShowPad(true)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
              disabled={saving}
            >
              <span className="material-symbols-outlined text-sm">draw</span>
              {saving ? 'Saving...' : 'Draw Signature'}
            </button>
          </div>
        )}

        {showPad && (
          <SignaturePad onSave={handleSaveSignature} onClose={() => setShowPad(false)} />
        )}
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-low p-6 space-y-4">
        <h2 className="text-base font-bold text-foreground">Card Back Preview</h2>
        <div className="rounded-xl border border-outline-variant/20 bg-white p-6 flex flex-col items-center gap-3">
          {signatureUrl ? (
            <Image
              src={signatureUrl}
              alt="Signature Preview"
              width={200}
              height={48}
              className="object-contain max-h-12"
              unoptimized
            />
          ) : (
            <p className="text-sm text-outline italic">{name || 'OSCA Head'}</p>
          )}
          <p className="text-[10px] text-outline">Authorized Signatory</p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
