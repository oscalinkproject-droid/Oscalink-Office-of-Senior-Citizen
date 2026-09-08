'use client';

import { useMemo } from 'react';
import { type User } from '@supabase/supabase-js';
import {
  type RoleLevel,
  type RolePermissions,
  getUserRole,
  getRolePermissions,
  hasPermission,
  isOscaRole,
  isCityWideRole,
  isSectorLocked,
} from './rbac';

interface UseAuthRoleReturn {
  role: RoleLevel;
  permissions: RolePermissions;
  isOsca: boolean;
  isCityWide: boolean;
  isSectorLocked: boolean;
  can: (permission: keyof RolePermissions) => boolean;
  canManageUsers: boolean;
  canManageSeniors: boolean;
  canEditSeniorProfiles: boolean;
  canViewAllSeniors: boolean;
  barangay: string | undefined;
  purok: string | undefined;
}

export function useAuthRole(user: User | null): UseAuthRoleReturn {
  const role = useMemo<RoleLevel>(() => {
    return getUserRole(user?.user_metadata as Record<string, unknown> | undefined);
  }, [user]);

  const permissions = useMemo<RolePermissions>(() => {
    return getRolePermissions(role);
  }, [role]);

  const barangay = useMemo<string | undefined>(() => {
    return user?.user_metadata?.barangay as string | undefined;
  }, [user]);

  const purok = useMemo<string | undefined>(() => {
    return user?.user_metadata?.purok as string | undefined;
  }, [user]);

  const isOsca = useMemo<boolean>(() => {
    return isOscaRole(role);
  }, [role]);

  const isCityWide = useMemo<boolean>(() => {
    return isCityWideRole(role);
  }, [role]);

  const isSectorLockedRole = useMemo<boolean>(() => {
    return isSectorLocked(role);
  }, [role]);

  const can = (permission: keyof RolePermissions): boolean => {
    return hasPermission(role, permission);
  };

  return {
    role,
    permissions,
    isOsca,
    isCityWide,
    isSectorLocked: isSectorLockedRole,
    can,
    canManageUsers: permissions.canManageUsers,
    canManageSeniors: permissions.canManageSeniors,
    canEditSeniorProfiles: permissions.canEditSeniorProfiles,
    canViewAllSeniors: permissions.canViewAllSeniors,
    barangay,
    purok,
  };
}

export { ROLE_PERMISSIONS, type RoleLevel, type RolePermissions } from './rbac';
