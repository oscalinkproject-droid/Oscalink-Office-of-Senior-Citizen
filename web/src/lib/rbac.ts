import { USER_ROLES } from './constants';

export type RoleLevel = 'super_admin' | 'osca_head' | 'osca_staff' | 'barangay_president' | 'barangay_official' | 'senior_citizen';

export const ROLE_HIERARCHY: Record<RoleLevel, number> = {
  super_admin: 4,
  osca_head: 3,
  osca_staff: 2,
  barangay_president: 1,
  barangay_official: 1,
  senior_citizen: 0,
};

export const ROLE_LABELS: Record<RoleLevel, string> = {
  super_admin: 'Super Admin',
  osca_head: 'OSCA Head',
  osca_staff: 'Admin Staff',
  barangay_president: 'Barangay Staff',
  barangay_official: 'Barangay Official',
  senior_citizen: 'Senior Citizen',
};

export const ROLE_OPTIONS: { value: RoleLevel; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'osca_head', label: 'OSCA Head' },
  { value: 'osca_staff', label: 'Admin Staff' },
];

export interface RolePermissions {
  canManageAllSectors: boolean;
  canManageUsers: boolean;
  canManageSeniors: boolean;
  canEditSeniorProfiles: boolean;
  canManageInventory: boolean;
  canViewAllSeniors: boolean;
  sectorLocked: boolean;
  canViewOwnData: boolean;
}

export const ROLE_PERMISSIONS: Record<RoleLevel, RolePermissions> = {
  super_admin: {
    canManageAllSectors: true,
    canManageUsers: true,
    canManageSeniors: true,
    canEditSeniorProfiles: true,
    canManageInventory: true,
    canViewAllSeniors: true,
    sectorLocked: false,
    canViewOwnData: false,
  },
  osca_head: {
    canManageAllSectors: true,
    canManageUsers: true,
    canManageSeniors: true,
    canEditSeniorProfiles: false,
    canManageInventory: true,
    canViewAllSeniors: true,
    sectorLocked: false,
    canViewOwnData: false,
  },
  osca_staff: {
    canManageAllSectors: true,
    canManageUsers: false,
    canManageSeniors: true,
    canEditSeniorProfiles: true,
    canManageInventory: true,
    canViewAllSeniors: true,
    sectorLocked: false,
    canViewOwnData: false,
  },
  barangay_president: {
    canManageAllSectors: false,
    canManageUsers: false,
    canManageSeniors: false,
    canEditSeniorProfiles: false,
    canManageInventory: false,
    canViewAllSeniors: false,
    sectorLocked: true,
    canViewOwnData: false,
  },
  barangay_official: {
    canManageAllSectors: false,
    canManageUsers: false,
    canManageSeniors: false,
    canEditSeniorProfiles: false,
    canManageInventory: false,
    canViewAllSeniors: false,
    sectorLocked: true,
    canViewOwnData: false,
  },
  senior_citizen: {
    canManageAllSectors: false,
    canManageUsers: false,
    canManageSeniors: false,
    canEditSeniorProfiles: false,
    canManageInventory: false,
    canViewAllSeniors: false,
    sectorLocked: false,
    canViewOwnData: true,
  },
};

// Legacy role names that still appear in production data (auth.users metadata,
// profiles rows, and RLS functions) but differ from the canonical app roles.
// Without normalization these accounts get silently rejected by proxy.ts and
// bounced back to /login in an infinite loop after a successful sign-in.
export const ROLE_ALIASES: Record<string, RoleLevel> = {
  head: 'osca_head',
  admin: 'osca_staff',
  mswd_officer: 'osca_staff',
  official: 'barangay_official',
  para_social_worker: 'barangay_official',
  resident: 'senior_citizen',
};

export function normalizeRole(raw: unknown): RoleLevel | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if ((USER_ROLES as readonly string[]).includes(value)) {
    return value as RoleLevel;
  }
  return ROLE_ALIASES[value] ?? null;
}

export const ADMIN_ROLES: RoleLevel[] = ['super_admin', 'osca_head', 'osca_staff'];
export const OSCA_ROLES: RoleLevel[] = ['super_admin', 'osca_head', 'osca_staff'];
export const CITY_WIDE_ROLES: RoleLevel[] = ['super_admin', 'osca_head', 'osca_staff'];
export const SECTOR_LOCKED_ROLES: RoleLevel[] = ['barangay_president', 'barangay_official'];
export const SELF_LOCKED_ROLES: RoleLevel[] = ['senior_citizen'];
export const APPROVAL_ROLES: RoleLevel[] = ['osca_head'];

export function hasPermission(role: RoleLevel, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function isOscaRole(role: RoleLevel): boolean {
  return OSCA_ROLES.includes(role);
}

export function isCityWideRole(role: RoleLevel): boolean {
  return CITY_WIDE_ROLES.includes(role);
}

export function isSectorLocked(role: RoleLevel): boolean {
  return SECTOR_LOCKED_ROLES.includes(role);
}

export function isSelfLocked(role: RoleLevel): boolean {
  return SELF_LOCKED_ROLES.includes(role);
}

export function canApprove(role: RoleLevel): boolean {
  return APPROVAL_ROLES.includes(role);
}

export function getUserRole(userMetadata: Record<string, unknown> | undefined): RoleLevel {
  return normalizeRole(userMetadata?.role) ?? 'senior_citizen';
}

export function getRolePermissions(role: RoleLevel): RolePermissions {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.senior_citizen;
}
