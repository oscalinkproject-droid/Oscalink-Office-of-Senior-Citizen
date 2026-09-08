'use client';

import { ReactNode } from 'react';
import { useAuthRole, type RoleLevel, type RolePermissions } from '@/lib/use-auth-role';
import { type User } from '@supabase/supabase-js';

interface RoleGuardProps {
  children: ReactNode;
  user: User | null;
  requiredPermission?: keyof RolePermissions;
  requiredRole?: RoleLevel | RoleLevel[];
  fallback?: ReactNode;
}

export function RoleGuard({ 
  children, 
  user, 
  requiredPermission, 
  requiredRole,
  fallback = null 
}: RoleGuardProps) {
  const { can, role } = useAuthRole(user);

  // Check permission first
  if (requiredPermission && !can(requiredPermission)) {
    return <>{fallback}</>;
  }

  // Check specific role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

interface RoleBasedButtonProps {
  children: ReactNode;
  user: User | null;
  requiredPermission?: keyof RolePermissions;
  requiredRole?: RoleLevel | RoleLevel[];
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  as?: 'button' | 'div';
}

export function RoleBasedButton({
  children,
  user,
  requiredPermission,
  requiredRole,
  className = '',
  disabled = false,
  onClick,
  as: Component = 'button',
}: RoleBasedButtonProps) {
  const { can, role } = useAuthRole(user);
  
  let isVisible = true;
  
  if (requiredPermission && !can(requiredPermission)) {
    isVisible = false;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(role)) {
      isVisible = false;
    }
  }

  if (!isVisible) {
    return null;
  }

  return (
    <Component 
      className={className} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Component>
  );
}
