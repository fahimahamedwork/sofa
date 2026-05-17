import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import type { AppStatus, DeploymentStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatDateRelative(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(d, 'MMM d, yyyy');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const rm = mins % 60;
  return `${hours}h ${rm}m`;
}

export function getStatusColor(status: AppStatus | DeploymentStatus): string {
  const colors: Record<string, string> = {
    running: 'text-emerald-500',
    healthy: 'text-emerald-500',
    success: 'text-emerald-500',
    stopped: 'text-zinc-400',
    cancelled: 'text-zinc-400',
    building: 'text-amber-500',
    deploying: 'text-amber-500',
    queued: 'text-sky-500',
    error: 'text-red-500',
    failed: 'text-red-500',
  };
  return colors[status] || 'text-zinc-400';
}

export function getStatusBgColor(status: AppStatus | DeploymentStatus): string {
  const colors: Record<string, string> = {
    running: 'bg-emerald-500',
    healthy: 'bg-emerald-500',
    success: 'bg-emerald-500',
    stopped: 'bg-zinc-500',
    cancelled: 'bg-zinc-500',
    building: 'bg-amber-500',
    deploying: 'bg-amber-500',
    queued: 'bg-sky-500',
    error: 'bg-red-500',
    failed: 'bg-red-500',
  };
  return colors[status] || 'bg-zinc-500';
}

export function getStatusDotColor(status: AppStatus | DeploymentStatus): string {
  const colors: Record<string, string> = {
    running: 'bg-emerald-500',
    healthy: 'bg-emerald-500',
    success: 'bg-emerald-500',
    stopped: 'bg-zinc-500',
    cancelled: 'bg-zinc-500',
    building: 'bg-amber-500 animate-pulse-subtle',
    deploying: 'bg-amber-500 animate-pulse-subtle',
    queued: 'bg-sky-500 animate-pulse-subtle',
    error: 'bg-red-500',
    failed: 'bg-red-500',
  };
  return colors[status] || 'bg-zinc-500';
}

export function truncateCommit(commit: string): string {
  return commit ? commit.substring(0, 7) : '';
}

export function getFrameworkIcon(framework: string): string {
  const icons: Record<string, string> = {
    node: 'Node.js',
    next: 'Next.js',
    react: 'React',
    vue: 'Vue',
    nuxt: 'Nuxt',
    python: 'Python',
    go: 'Go',
    rust: 'Rust',
    docker: 'Docker',
  };
  return icons[framework] || framework;
}

export function getResourceColor(percentage: number): string {
  if (percentage < 70) return 'bg-emerald-500';
  if (percentage < 90) return 'bg-amber-500';
  return 'bg-red-500';
}

export function maskString(str: string, visible: number = 4): string {
  if (!str) return '';
  if (str.length <= visible) return str;
  return str.substring(0, visible) + '*'.repeat(Math.min(str.length - visible, 20));
}

/**
 * Recursively converts snake_case keys in an object to camelCase.
 * This is needed because the Go backend returns snake_case JSON keys,
 * but the TypeScript types use camelCase.
 */
export function snakeToCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((item) => snakeToCamel(item)) as T;
  if (typeof obj !== 'object') return obj as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result as T;
}
