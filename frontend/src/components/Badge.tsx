import React from 'react';
import type { UserRole } from '../types';

export type BadgeVariant = 'student' | 'faculty' | 'admin' | 'info' | 'success' | 'warning' | 'danger' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  role?: UserRole;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const styles: Record<BadgeVariant, string> = {
  student: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  faculty: 'bg-accent-50 text-accent-700 ring-accent-600/15',
  admin: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  default: 'bg-zinc-100 text-zinc-700 ring-zinc-500/10',
};

const dots: Record<BadgeVariant, string> = {
  student: 'bg-emerald-500',
  faculty: 'bg-accent-500',
  admin: 'bg-violet-500',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  default: 'bg-zinc-400',
};

const roleVariant: Record<UserRole, BadgeVariant> = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant, role, size = 'md', dot = false }) => {
  const v: BadgeVariant = role ? roleVariant[role] : variant || 'default';
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium ring-1 ring-inset ${styles[v]} ${sizeClass}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[v]}`} />}
      {children}
    </span>
  );
};

/** Maps a learning/intervention status string to a badge variant. */
export const statusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'MASTERED':
    case 'RESOLVED':
      return 'success';
    case 'IMPROVING':
    case 'IN_PROGRESS':
    case 'STUDENT_CONTACTED':
    case 'MATERIAL_PROVIDED':
      return 'info';
    case 'STRUGGLING':
    case 'PENDING':
    case 'FOLLOW_UP_REQUIRED':
      return 'warning';
    case 'AT_RISK':
      return 'danger';
    default:
      return 'default';
  }
};

/** "FOLLOW_UP_REQUIRED" -> "Follow up required" */
export const humanize = (value: string): string => {
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
