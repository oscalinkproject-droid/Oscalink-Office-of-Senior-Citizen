'use client';

import { useState } from "react";
import { Button } from "./button";
import { createStaff } from "@/app/actions/users";
import { ROLE_OPTIONS } from "@/lib/rbac";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  return /^09\d{3,}$/.test(phone);
}

const SINGLETON_ROLES = ['osca_head'];

interface StaffFormProps {
  existingRoles?: string[];
}

export function StaffForm({
  existingRoles = []
}: StaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const filteredOptions = ROLE_OPTIONS.filter(option => {
    if (option.value === 'senior_citizen') return false;
    if (option.value === 'barangay_president') return false;
    if (SINGLETON_ROLES.includes(option.value) && existingRoles.includes(option.value)) return false;
    return true;
  });

  function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value;
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address (e.g., staff@oscalink.gov)");
    } else {
      setEmailError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    
    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Invalid email format. Please use format: user@domain.com' });
      setLoading(false);
      return;
    }

    const phone = formData.get('contact_number') as string;
    if (phone && !validatePhone(phone)) {
      setMessage({ type: 'error', text: 'Phone Number must start with 09 and contain only digits (e.g., 09171234567).' });
      setLoading(false);
      return;
    }

    const result = await createStaff(formData);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result?.success) {
      setMessage({ 
        type: 'success', 
        text: `Account Created: ${result.temp_credentials?.email} | Temporary Password: ${result.temp_credentials?.password} | Email Sent: Credentials dispatched to ${email}` 
      });
      (e.target as HTMLFormElement).reset();
      setSelectedRole('');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-end min-h-[32px] pb-1 text-[10px] text-slate-700 font-bold uppercase tracking-widest pl-1">Full Name</label>
          <input 
            name="fullName" 
            required 
            placeholder="Juan Dela Cruz" 
            className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:border-primary/50 transition-colors" 
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-end min-h-[32px] pb-1 text-[10px] text-slate-700 font-bold uppercase tracking-widest pl-1">Staff Email</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="staff@oscalink.gov" 
            onBlur={handleEmailBlur}
            className={`w-full bg-surface-low border rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:border-primary/50 transition-colors ${
              emailError ? 'border-red-500/50 focus:border-red-500' : 'border-outline-variant/30'
            }`}
          />
          {emailError && (
            <p className="text-[10px] text-red-400 pl-1">{emailError}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="flex items-end min-h-[32px] pb-1 text-[10px] text-slate-700 font-bold uppercase tracking-widest pl-1">Role</label>
          <select 
            name="role" 
            required 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 px-4 text-xs text-foreground focus:border-primary/50 transition-colors"
          >
            <option value="" className="bg-surface-lowest">Select a role...</option>
            {filteredOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-surface-lowest">{option.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-end min-h-[32px] pb-1 text-[10px] text-slate-700 font-bold uppercase tracking-widest pl-1">Phone Number</label>
          <input
            name="contact_number"
            type="tel"
            placeholder="09171234567"
            pattern="[0-9]*"
            onChange={(e) => {
              const val = e.target.value;
              if (val && !validatePhone(val)) {
                setPhoneError('Must start with 09 and contain only digits');
              } else {
                setPhoneError(null);
              }
            }}
            className={`w-full bg-surface-low border rounded-xl py-3 px-4 text-xs text-foreground placeholder:text-outline focus:border-primary/50 transition-colors ${
              phoneError ? 'border-red-500/50 focus:border-red-500' : 'border-outline-variant/30'
            }`}
          />
          {phoneError && (
            <p className="text-[10px] text-red-400 pl-1">{phoneError}</p>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full py-4" disabled={loading}>
        {loading ? 'COMMISSIONING...' : 'COMMISSION STAFF'}
      </Button>
    </form>
  );
}
